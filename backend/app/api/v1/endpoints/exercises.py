"""Exercise library + prescription endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.exercise import Exercise, ExercisePrescription
from app.schemas.exercise import ExerciseCreate, ExerciseOut, PrescriptionCreate, PrescriptionOut
from app.models.patient import Patient
from app.models.user import User
from app.models.session import RehabSession
from app.api.v1.endpoints.auth import current_user

router = APIRouter()


@router.get("", response_model=list[ExerciseOut])
def list_exercises(
    category: str = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    q = db.query(Exercise).filter(Exercise.clinic_id == user.clinic_id)
    if category:
        q = q.filter(Exercise.category == category)
    return q.all()


@router.post("", response_model=ExerciseOut, status_code=201)
def create_exercise(
    payload: ExerciseCreate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    if (
        db.query(Exercise)
        .filter(
            Exercise.clinic_id == user.clinic_id,
            Exercise.code == payload.code,
        )
        .first()
    ):
        raise HTTPException(409, "An exercise with this code already exists")
    obj = Exercise(**payload.model_dump(), clinic_id=user.clinic_id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete("/{exercise_id}", status_code=204)
def delete_exercise(
    exercise_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    exercise = (
        db.query(Exercise)
        .filter(
            Exercise.id == exercise_id,
            Exercise.clinic_id == user.clinic_id,
        )
        .first()
    )
    if not exercise:
        raise HTTPException(404, "Exercise not found")
    prescriptions = db.query(ExercisePrescription).filter(
        ExercisePrescription.exercise_id == exercise_id
    ).count()
    sessions = db.query(RehabSession).filter(
        RehabSession.exercise_id == exercise_id
    ).count()
    if prescriptions or sessions:
        raise HTTPException(
            409,
            "Exercise cannot be deleted because prescriptions or sessions reference it",
        )
    db.delete(exercise)
    db.commit()
    return None


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
    exercise = (
        db.query(Exercise)
        .filter(
            Exercise.id == payload.exercise_id,
            Exercise.clinic_id == user.clinic_id,
        )
        .first()
    )
    if not exercise:
        raise HTTPException(404, "Exercise not found")
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
