from typing import Optional
from pydantic import BaseModel, ConfigDict


class SessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    exercise_id: Optional[int] = None
    edge_node_id: Optional[str] = None
    status: str
    movement_quality_score: Optional[float] = None
    risk_score: Optional[float] = None
    fatigue_index: Optional[float] = None
    compensation_detected: bool = False
    total_reps: int = 0
    rom_achieved_deg: Optional[float] = None
    rom_target_deg: Optional[float] = None
    evidence_clip_url: Optional[str] = None


class PoseFrameIn(BaseModel):
    """Streamed from edge node (Raspberry Pi) during a live session."""
    session_id: int
    ts: float
    landmarks: dict
    joint_angles: dict


class LiveTelemetry(BaseModel):
    session_id: int
    ts: float
    rep_count: int
    current_rom_deg: float
    movement_quality_score: float
    risk_score: float
    fatigue_index: float
    compensation_detected: bool
    skeleton: Optional[list] = None  # 2D skeleton for the dashboard overlay


class SessionSummary(BaseModel):
    session_id: int
    movement_quality_score: float
    risk_score: float
    fatigue_index: float
    total_reps: int
    rom_achieved_deg: float
    rom_target_deg: float
    compensation_detected: bool
