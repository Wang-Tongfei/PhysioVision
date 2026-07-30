"""Clinic management, scheduling, therapist assignment, subscription."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime

from app.core.database import get_db
from app.models.clinic import Clinic, Therapist, Subscription
from app.models.schedule import Appointment
from app.models.patient import Patient
from app.models.user import User
from app.schemas.clinic import (
    ClinicOut, ClinicUpdate, SubscriptionOut, AppointmentOut,
)
from app.api.v1.endpoints.auth import current_user

router = APIRouter()


@router.get("/profile", response_model=ClinicOut)
def clinic_profile(
    db: Session = Depends(get_db), user: User = Depends(current_user)
):
    clinic = db.get(Clinic, user.clinic_id)
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    return clinic


@router.patch("/profile", response_model=ClinicOut)
def update_clinic_profile(
    payload: ClinicUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    clinic = db.get(Clinic, user.clinic_id)
    if not clinic:
        raise HTTPException(404, "Clinic not found")
    clinic.name = payload.name.strip()
    clinic.timezone = payload.timezone.strip()
    clinic.fhir_endpoint = payload.fhir_endpoint.strip() if payload.fhir_endpoint else None
    clinic.hl7_endpoint = payload.hl7_endpoint.strip() if payload.hl7_endpoint else None
    db.commit()
    db.refresh(clinic)
    return clinic


@router.get("/subscription", response_model=SubscriptionOut)
def subscription(
    db: Session = Depends(get_db), user: User = Depends(current_user)
):
    return (
        db.query(Subscription)
        .filter(Subscription.clinic_id == user.clinic_id)
        .first()
    )


@router.get("/therapists", response_model=list[dict])
def therapists(
    db: Session = Depends(get_db), user: User = Depends(current_user)
):
    return [
        {"id": t.id, "full_name": t.full_name, "license_no": t.license_no}
        for t in db.query(Therapist).filter(Therapist.clinic_id == user.clinic_id).all()
    ]


@router.get("/schedule", response_model=list[AppointmentOut])
def schedule(
    date: str = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    q = db.query(Appointment).filter(Appointment.clinic_id == user.clinic_id)
    if date:
        d = datetime.fromisoformat(date).date()
        q = q.filter(Appointment.scheduled_start >= d)
    return q.order_by(Appointment.scheduled_start).limit(50).all()


@router.post("/schedule", response_model=AppointmentOut, status_code=201)
def book_appointment(
    patient_id: int, therapist_id: int,
    scheduled_start: datetime = None, station: str = "A1",
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.clinic_id == user.clinic_id)
        .first()
    )
    if not patient:
        raise HTTPException(404, "Patient not found")
    obj = Appointment(
        patient_id=patient_id, therapist_id=therapist_id, clinic_id=user.clinic_id,
        scheduled_start=scheduled_start, station=station,
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj
