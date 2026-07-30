"""Clinic management, scheduling, therapist assignment, subscription."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.clinic import Clinic, Therapist, Subscription
from app.models.schedule import Appointment
from app.schemas.clinic import (
    ClinicOut, SubscriptionOut, AppointmentOut,
)

router = APIRouter()


@router.get("/profile", response_model=ClinicOut)
def clinic_profile(clinic_id: int = 1, db: Session = Depends(get_db)):
    return db.get(Clinic, clinic_id)


@router.get("/subscription", response_model=SubscriptionOut)
def subscription(clinic_id: int = 1, db: Session = Depends(get_db)):
    return db.query(Subscription).filter(Subscription.clinic_id == clinic_id).first()


@router.get("/therapists", response_model=list[dict])
def therapists(clinic_id: int = 1, db: Session = Depends(get_db)):
    return [
        {"id": t.id, "full_name": t.full_name, "license_no": t.license_no}
        for t in db.query(Therapist).filter(Therapist.clinic_id == clinic_id).all()
    ]


@router.get("/schedule", response_model=list[AppointmentOut])
def schedule(date: str = None, db: Session = Depends(get_db)):
    q = db.query(Appointment)
    if date:
        d = datetime.fromisoformat(date).date()
        q = q.filter(Appointment.scheduled_start >= d)
    return q.order_by(Appointment.scheduled_start).limit(50).all()


@router.post("/schedule", response_model=AppointmentOut, status_code=201)
def book_appointment(
    patient_id: int, therapist_id: int, clinic_id: int = 1,
    scheduled_start: datetime = None, station: str = "A1",
    db: Session = Depends(get_db),
):
    obj = Appointment(
        patient_id=patient_id, therapist_id=therapist_id, clinic_id=clinic_id,
        scheduled_start=scheduled_start, station=station,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
