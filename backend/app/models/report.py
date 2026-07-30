"""SOAP notes and AI-generated clinical reports."""
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime, JSON
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    therapist_id = Column(Integer, ForeignKey("therapists.id"))
    session_id = Column(Integer, ForeignKey("rehab_sessions.id"), nullable=True)
    title = Column(String(256))
    soap = Column(JSON)  # {subjective, objective, assessment, plan}
    progress_summary = Column(Text)
    ai_recommendations = Column(JSON)  # list of recommendation strings
    generated_by = Column(String(32), default="soap-agent")  # agent name
    fhir_bundle = Column(JSON)  # FHIR DocumentReference payload
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="reports")
