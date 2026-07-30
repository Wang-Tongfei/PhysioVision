"""Exercise library and prescription models."""
from sqlalchemy import (
    Column, Integer, String, Text, Float, Boolean, ForeignKey, DateTime,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base


class Exercise(Base):
    __tablename__ = "exercises"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(64), unique=True, index=True)  # e.g. SHOULDER_FLEX_90
    name = Column(String(128), nullable=False)
    category = Column(String(64))  # mobility / strength / balance / gait
    target_body_part = Column(String(64))
    default_reps = Column(Integer, default=10)
    default_sets = Column(Integer, default=3)
    target_rom_deg = Column(Float)  # expected range of motion
    instructions = Column(Text)
    reference_video_url = Column(String(256))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class ExercisePrescription(Base):
    __tablename__ = "exercise_prescriptions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    exercise_id = Column(Integer, ForeignKey("exercises.id"))
    prescribed_by_id = Column(Integer, ForeignKey("therapists.id"))
    reps = Column(Integer, default=10)
    sets = Column(Integer, default=3)
    frequency_per_week = Column(Integer, default=3)
    notes = Column(Text)
    active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="prescriptions")
    exercise = relationship("Exercise")
