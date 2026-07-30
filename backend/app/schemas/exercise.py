from typing import Optional
from pydantic import BaseModel, ConfigDict


class ExerciseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    code: str
    name: str
    category: Optional[str] = None
    target_body_part: Optional[str] = None
    default_reps: int = 10
    default_sets: int = 3
    target_rom_deg: Optional[float] = None
    instructions: Optional[str] = None


class ExerciseCreate(BaseModel):
    code: str
    name: str
    category: Optional[str] = None
    target_body_part: Optional[str] = None
    default_reps: int = 10
    default_sets: int = 3
    target_rom_deg: Optional[float] = None
    instructions: Optional[str] = None


class PrescriptionCreate(BaseModel):
    patient_id: int
    exercise_id: int
    reps: int = 10
    sets: int = 3
    frequency_per_week: int = 3
    notes: Optional[str] = None


class PrescriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    exercise_id: int
    reps: int
    sets: int
    frequency_per_week: int
    notes: Optional[str] = None
    active: bool = True
    exercise: Optional[ExerciseOut] = None
