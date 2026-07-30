from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class ClinicOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    fhir_endpoint: Optional[str] = None
    hl7_endpoint: Optional[str] = None
    timezone: str = "Asia/Singapore"


class SubscriptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    clinic_id: int
    plan: str
    max_patients: int
    max_edge_nodes: int
    active: bool = True
    renews_at: Optional[datetime] = None


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    therapist_id: int
    clinic_id: int
    scheduled_start: datetime
    scheduled_end: Optional[datetime] = None
    station: Optional[str] = None
    status: str = "booked"
    notes: Optional[str] = None
