"""Patient domain model and related entities."""
from sqlalchemy import (
    Column, Integer, String, Text, Date, DateTime, Boolean, Float, ForeignKey,
    Enum as SAEnum,
)
from sqlalchemy.orm import relationship
import enum
from datetime import datetime, timezone

from app.core.database import Base


class RiskTier(str, enum.Enum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    mrn = Column(String(64), unique=True, index=True)  # hospital MRN (FHIR)
    full_name = Column(String(128), nullable=False)
    date_of_birth = Column(Date)
    gender = Column(String(16))
    phone = Column(String(32))
    email = Column(String(128))
    clinic_id = Column(Integer, ForeignKey("clinics.id"))
    assigned_therapist_id = Column(Integer, ForeignKey("therapists.id"))

    diagnosis = Column(String(256))
    surgery_date = Column(Date)
    risk_tier = Column(SAEnum(RiskTier), default=RiskTier.MODERATE)
    fhir_id = Column(String(128), index=True)  # HL7/FHIR resource id
    avatar_url = Column(String(256))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    prescriptions = relationship("ExercisePrescription", back_populates="patient")
    sessions = relationship("RehabSession", back_populates="patient")
    reports = relationship("Report", back_populates="patient")
    appointments = relationship("Appointment", back_populates="patient")
