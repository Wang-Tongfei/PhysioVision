"""Scheduling / appointment model for multi-patient clinic management."""
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    therapist_id = Column(Integer, ForeignKey("therapists.id"))
    clinic_id = Column(Integer, ForeignKey("clinics.id"))
    scheduled_start = Column(DateTime, nullable=False)
    scheduled_end = Column(DateTime)
    station = Column(String(32))  # rehab station / camera id
    status = Column(String(32), default="booked")  # booked/done/cancelled
    notes = Column(Text)

    patient = relationship("Patient", back_populates="appointments")
