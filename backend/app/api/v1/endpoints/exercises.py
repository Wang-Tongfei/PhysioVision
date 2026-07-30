"""Exercise library + prescription endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.exercise import Exercise, ExercisePrescription
from app.schemas.exercise import ExerciseCreate, ExerciseOut, PrescriptionCreate, PrescriptionOut
from app.models.patient import Patient
from app.models.user import User
from app.api.v1.endpoints.auth import current_user

router = APIRouter()


@router.get("", response_model=list[ExerciseOut])
def list_exercises(
    category: str = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    q = db.query(Exercise)
    if category:
        q = q.filter(Exercise.category == category)
    return q.all()


@router.post("", response_model=ExerciseOut, status_code=201)
def create_exercise(
    payload: ExerciseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if db.query(Exercise).filter(Exercise.code == payload.code).first():
        raise HTTPException(409, "An exercise with this code already exists")
    obj = Exercise(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/prescriptions", response_model=PrescriptionOut, status_code=201)
def prescribe(
    payload: PrescriptionCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    patient = (
        db.query(Patient)
        .filter(Patient.id == payload.patient_id, Patient.clinic_id == user.clinic_id)
        .first()
    )
    if not patient:
        raise HTTPException(404, "Patient not found")
    obj = ExercisePrescription(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/prescriptions/{patient_id}", response_model=list[PrescriptionOut])
def patient_prescriptions(
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
        db.query(ExercisePrescription)
        .filter(ExercisePrescription.patient_id == patient_id, ExercisePrescription.active.is_(True))
        .all()
    )
    return rows
