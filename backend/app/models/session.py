"""Rehabilitation session, pose frames and rep events (the live monitoring core)."""
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, ForeignKey, DateTime, JSON,
)
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from app.core.database import Base


class SessionStatus(str):
    SCHEDULED = "scheduled"
    ACTIVE = "active"
    COMPLETED = "completed"
    ABORTED = "aborted"


class RehabSession(Base):
    __tablename__ = "rehab_sessions"

    id = Column(Integer, primary_key=True, index=True)
    patient_id = Column(Integer, ForeignKey("patients.id"))
    exercise_id = Column(Integer, ForeignKey("exercises.id"))
    edge_node_id = Column(String(64))  # Raspberry Pi device id
    camera_id = Column(String(64))
    status = Column(String(32), default=SessionStatus.SCHEDULED)
    started_at = Column(DateTime)
    ended_at = Column(DateTime)

    # AI-derived summary metrics
    movement_quality_score = Column(Float)        # 0-100
    risk_score = Column(Float)                    # 0-100
    fatigue_index = Column(Float)                 # 0-100
    compensation_detected = Column(Boolean, default=False)
    total_reps = Column(Integer, default=0)
    rom_achieved_deg = Column(Float)
    rom_target_deg = Column(Float)
    evidence_clip_url = Column(String(256))       # MinIO object key

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    patient = relationship("Patient", back_populates="sessions")
    frames = relationship("PoseFrame", back_populates="session")
    reps = relationship("RepEvent", back_populates="session")


class PoseFrame(Base):
    __tablename__ = "pose_frames"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("rehab_sessions.id"))
    ts = Column(Float)  # seconds since session start
    landmarks = Column(JSON)  # MediaPipe pose landmarks (33 points)
    joint_angles = Column(JSON)  # computed joint angles

    session = relationship("RehabSession", back_populates="frames")


class RepEvent(Base):
    __tablename__ = "rep_events"

    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("rehab_sessions.id"))
    rep_index = Column(Integer)
    ts = Column(Float)
    rom_deg = Column(Float)
    quality_score = Column(Float)
    compensated = Column(Boolean, default=False)
    is_wrong_form = Column(Boolean, default=False)

    session = relationship("RehabSession", back_populates="reps")
