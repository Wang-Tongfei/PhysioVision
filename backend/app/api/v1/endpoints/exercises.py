"""Exercise library + prescription endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.exercise import Exercise, ExercisePrescription
from app.schemas.exercise import ExerciseOut, PrescriptionCreate, PrescriptionOut

router = APIRouter()


@router.get("", response_model=list[ExerciseOut])
def list_exercises(category: str = None, db: Session = Depends(get_db)):
    q = db.query(Exercise)
    if category:
        q = q.filter(Exercise.category == category)
    return q.all()


@router.post("", response_model=ExerciseOut, status_code=201)
def create_exercise(payload: ExerciseOut, db: Session = Depends(get_db)):
    # minimal create stub
    obj = Exercise(name=payload.name, code=payload.code)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/prescriptions", response_model=PrescriptionOut, status_code=201)
def prescribe(payload: PrescriptionCreate, db: Session = Depends(get_db)):
    obj = ExercisePrescription(**payload.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/prescriptions/{patient_id}", response_model=list[PrescriptionOut])
def patient_prescriptions(patient_id: int, db: Session = Depends(get_db)):
    rows = (
        db.query(ExercisePrescription)
        .filter(ExercisePrescription.patient_id == patient_id, ExercisePrescription.active.is_(True))
        .all()
    )
    return rows
