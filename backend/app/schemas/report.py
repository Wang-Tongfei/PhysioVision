from typing import Optional
from datetime import datetime
from pydantic import BaseModel, ConfigDict


class SoapNoteIn(BaseModel):
    patient_id: int
    session_id: Optional[int] = None
    therapist_id: Optional[int] = None
    subjective: str
    objective: str
    assessment: str
    plan: str
    visit_datetime: Optional[datetime] = None
    author: Optional[str] = None
    signature: Optional[str] = None
    authenticated_at: Optional[datetime] = None


class SoapNoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    title: Optional[str] = None
    soap: dict
    progress_summary: Optional[str] = None
    ai_recommendations: Optional[list] = None
    generated_by: Optional[str] = None
    created_at: Optional[datetime] = None


class ReportOut(SoapNoteOut):
    pass
