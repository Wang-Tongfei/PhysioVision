"""Live monitoring endpoints: session control, frame ingest, telemetry, websocket."""
import json
from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.core.database import get_db
from app.core.config import settings
import redis
from app.models.session import RehabSession, PoseFrame
from app.schemas.session import (
    SessionOut, PoseFrameIn, LiveTelemetry, SessionSummary,
)
from app.services.pose_service import (
    compute_joint_angles, movement_quality_score, detect_compensation,
)
from app.services.agent_service import run_agent_graph

router = APIRouter()
_r = redis.from_url(settings.redis_url, decode_responses=True)


@router.post("/start", response_model=SessionOut, status_code=201)
def start_session(patient_id: int, exercise_id: int = None, edge_node_id: str = "pi-01",
                  db: Session = Depends(get_db)):
    obj = RehabSession(
        patient_id=patient_id, exercise_id=exercise_id, edge_node_id=edge_node_id,
        status="active", started_at=datetime.now(timezone.utc),
    )
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.post("/{session_id}/frame", status_code=202)
def ingest_frame(frame: PoseFrameIn, db: Session = Depends(get_db)):
    angles = compute_joint_angles(frame.landmarks)
    row = PoseFrame(
        session_id=frame.session_id, ts=frame.ts,
        landmarks=frame.landmarks, joint_angles=angles,
    )
    db.add(row)
    db.commit()
    # publish to live telemetry channel
    _r.publish(f"session:{frame.session_id}:telemetry", json.dumps({
        "session_id": frame.session_id, "ts": frame.ts, "joint_angles": angles,
    }))
    return {"accepted": True}


@router.get("/{session_id}/summary", response_model=SessionSummary)
def session_summary(session_id: int, db: Session = Depends(get_db)):
    s = db.get(RehabSession, session_id)
    if not s:
        from fastapi import HTTPException
        raise HTTPException(404, "Session not found")
    return SessionSummary(
        session_id=session_id,
        movement_quality_score=s.movement_quality_score or 0,
        risk_score=s.risk_score or 0,
        fatigue_index=s.fatigue_index or 0,
        total_reps=s.total_reps or 0,
        rom_achieved_deg=s.rom_achieved_deg or 0,
        rom_target_deg=s.rom_target_deg or 0,
        compensation_detected=s.compensation_detected or False,
    )


@router.websocket("/{session_id}/ws")
async def session_ws(websocket: WebSocket, session_id: int):
    await websocket.accept()
    pubsub = _r.pubsub()
    pubsub.subscribe(f"session:{session_id}:telemetry")
    try:
        for message in pubsub.listen():
            if message["type"] != "message":
                continue
            await websocket.send_text(message["data"])
    except WebSocketDisconnect:
        pubsub.close()
