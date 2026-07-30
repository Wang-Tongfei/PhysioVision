from typing import Optional
from pydantic import BaseModel, ConfigDict


class SoapNoteIn(BaseModel):
    patient_id: int
    session_id: Optional[int] = None
    therapist_id: Optional[int] = None
    subjective: str
    objective: str
    assessment: str
    plan: str


class SoapNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    title: Optional[str] = None
    soap: dict
    progress_summary: Optional[str] = None
    ai_recommendations: Optional[list] = None
    generated_by: Optional[str] = None
    created_at: Optional[str] = None


class ReportOut(SoapNoteOut):
    pass
