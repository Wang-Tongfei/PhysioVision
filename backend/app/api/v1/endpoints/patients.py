"""Patient CRUD + profile, history and prescription endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.patient import Patient
from app.models.report import Report
from app.models.session import RehabSession
from app.schemas.patient import PatientCreate, PatientOut
from app.schemas.report import ReportOut
from app.models.user import User
from app.api.v1.endpoints.auth import current_user

router = APIRouter()


@router.get("", response_model=list[PatientOut])
def list_patients(
    db: Session = Depends(get_db), user: User = Depends(current_user)
):
    return db.query(Patient).filter(Patient.clinic_id == user.clinic_id).all()


@router.post("", response_model=PatientOut, status_code=201)
def create_patient(
    payload: PatientCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    duplicate = (
        db.query(Patient)
        .filter(Patient.clinic_id == user.clinic_id, Patient.mrn == payload.mrn)
        .first()
    )
    if duplicate:
        raise HTTPException(409, "This MRN already exists")
    obj = Patient(**payload.model_dump(), clinic_id=user.clinic_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{patient_id}", response_model=PatientOut)
def get_patient(
    patient_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    obj = (
        db.query(Patient)
        .filter(Patient.id == patient_id, Patient.clinic_id == user.clinic_id)
        .first()
    )
    if not obj:
        raise HTTPException(404, "Patient not found")
    return obj


@router.get("/{patient_id}/history", response_model=list[ReportOut])
def patient_history(
    patient_id: int,
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
    return db.query(Report).filter(Report.patient_id == patient_id).all()


@router.get("/{patient_id}/sessions", response_model=list[dict])
def patient_sessions(
    patient_id: int,
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
    rows = (
        db.query(RehabSession)
        .filter(RehabSession.patient_id == patient_id)
        .order_by(RehabSession.started_at.desc())
        .limit(20)
        .all()
    )
    return [
        {
            "id": r.id,
            "exercise_id": r.exercise_id,
            "started_at": r.started_at,
            "movement_quality_score": r.movement_quality_score,
            "risk_score": r.risk_score,
            "total_reps": r.total_reps,
            "rom_achieved_deg": r.rom_achieved_deg,
            "compensation_detected": r.compensation_detected,
        }
        for r in rows
    ]
