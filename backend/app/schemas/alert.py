from typing import Optional
from pydantic import BaseModel, ConfigDict


class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: Optional[int] = None
    patient_id: Optional[int] = None
    severity: str
    type: Optional[str] = None
    message: str
    score: Optional[float] = None
    evidence_clip_url: Optional[str] = None
    acknowledged: bool = False
    created_at: Optional[str] = None
