from datetime import date
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PatientCreate(BaseModel):
    mrn: str
    full_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    diagnosis: Optional[str] = None
    risk_tier: str = "moderate"


class PatientOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    mrn: str
    full_name: str
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    diagnosis: Optional[str] = None
    risk_tier: str
    fhir_id: Optional[str] = None
    avatar_url: Optional[str] = None
