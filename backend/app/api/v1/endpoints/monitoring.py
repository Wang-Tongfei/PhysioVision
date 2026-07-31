"""Camera and uploaded-video monitoring endpoints."""
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import current_user
from app.core.database import SessionLocal, get_db
from app.core.security import decode_token
from app.models.patient import Patient
from app.models.report import Report
from app.models.session import RehabSession, SessionStatus
from app.models.user import User
from app.services.monitor_engine import (
    SUPPORTED_EXERCISES,
    UPLOAD_ROOT,
    monitor_engine,
)


router = APIRouter()
ALLOWED_VIDEO_SUFFIXES = {".mp4", ".mov", ".avi", ".mkv", ".webm", ".m4v"}
MAX_UPLOAD_BYTES = 500 * 1024 * 1024


def _start_error(exc: Exception) -> HTTPException:
    status = 409 if "already running" in str(exc) else 400
    return HTTPException(status_code=status, detail=str(exc))


def _validate_patient(db: Session, user: User, patient_id: int | None) -> None:
    if patient_id is None:
        return
    patient = db.get(Patient, patient_id)
    if not patient or patient.clinic_id != user.clinic_id:
        raise HTTPException(404, "Patient not found")


@router.get("/completed")
def completed_sessions(
    limit: int = 50,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    rows = (
        db.query(RehabSession)
        .join(Patient, Patient.id == RehabSession.patient_id)
        .filter(
            Patient.clinic_id == user.clinic_id,
            RehabSession.status == SessionStatus.COMPLETED,
        )
        .order_by(RehabSession.ended_at.desc(), RehabSession.created_at.desc())
        .limit(max(1, min(limit, 100)))
        .all()
    )
    return [
        {
            "id": row.id,
            "patient_id": row.patient_id,
            "patient_name": row.patient.full_name,
            "exercise": (
                row.evidence_clip_url.removeprefix("exercise:")
                if row.evidence_clip_url and row.evidence_clip_url.startswith("exercise:")
                else "Rehabilitation exercise"
            ),
            "ended_at": row.ended_at or row.created_at,
            "movement_quality_score": float(row.movement_quality_score or 0),
            "risk_score": float(row.risk_score or 0),
            "has_report": (
                db.query(Report).filter(Report.session_id == row.id).first()
                is not None
            ),
        }
        for row in rows
    ]


@router.get("/monitor/status")
def monitor_status(user: User = Depends(current_user)):
    return monitor_engine.status_for(user.id, user.clinic_id)


@router.post("/monitor/live", status_code=202)
def start_live_monitor(
    exercise: str = "bicep_curl",
    camera_index: int = 0,
    track_arm: str = "right",
    patient_id: int | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    _validate_patient(db, user, patient_id)
    try:
        return monitor_engine.start_camera(
            exercise, camera_index, track_arm, patient_id, user.id, user.clinic_id
        )
    except (RuntimeError, ValueError) as exc:
        raise _start_error(exc) from exc


@router.websocket("/monitor/browser")
async def browser_camera_monitor(
    websocket: WebSocket,
    exercise: str = "bicep_curl",
    track_arm: str = "right",
    patient_id: int | None = None,
    token: str = "",
):
    started = False
    user = None
    db = SessionLocal()
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise ValueError("Invalid access token")
        user = db.get(User, int(payload["sub"]))
        if not user or not user.is_active:
            raise ValueError("Invalid access token")
        _validate_patient(db, user, patient_id)
        await websocket.accept()
        monitor_engine.start_browser(
            exercise, track_arm, patient_id, user.id, user.clinic_id
        )
        started = True
        while True:
            frame = await websocket.receive_bytes()
            if len(frame) <= 2 * 1024 * 1024:
                monitor_engine.push_browser_frame(frame)
    except WebSocketDisconnect:
        pass
    except HTTPException:
        await websocket.close(code=4404)
    except Exception as exc:
        if websocket.client_state.name == "CONNECTED":
            await websocket.send_json({"error": str(exc)})
            await websocket.close(code=4409)
        else:
            await websocket.close(code=4401)
    finally:
        if started:
            monitor_engine.stop_for(user.id, user.clinic_id)
        db.close()


@router.post("/monitor/upload", status_code=202)
async def upload_video(
    video: UploadFile = File(...),
    exercise: str = Form("bicep_curl"),
    track_arm: str = Form("right"),
    patient_id: int | None = Form(None),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    _validate_patient(db, user, patient_id)
    if exercise not in SUPPORTED_EXERCISES:
        raise HTTPException(400, f"Unsupported exercise: {exercise}")
    suffix = Path(video.filename or "").suffix.lower()
    if suffix not in ALLOWED_VIDEO_SUFFIXES:
        raise HTTPException(415, "Upload MP4, MOV, AVI, MKV, WEBM, or M4V video")

    UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    destination = UPLOAD_ROOT / f"{uuid4().hex}{suffix}"
    total = 0
    try:
        with destination.open("wb") as output:
            while chunk := await video.read(1024 * 1024):
                total += len(chunk)
                if total > MAX_UPLOAD_BYTES:
                    raise HTTPException(413, "Video exceeds the 500 MB limit")
                output.write(chunk)
        return monitor_engine.start_video(
            destination, exercise, track_arm, patient_id, user.id, user.clinic_id
        )
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except (RuntimeError, ValueError) as exc:
        destination.unlink(missing_ok=True)
        raise _start_error(exc) from exc
    finally:
        await video.close()


@router.post("/monitor/stop")
def stop_monitor(user: User = Depends(current_user)):
    try:
        return monitor_engine.stop_for(user.id, user.clinic_id)
    except PermissionError as exc:
        raise HTTPException(404, str(exc)) from exc


@router.get("/monitor/stream")
def monitor_stream(token: str = ""):
    try:
        monitor_engine.assert_media_token(token)
    except PermissionError as exc:
        raise HTTPException(404, str(exc)) from exc
    return StreamingResponse(
        monitor_engine.iter_mjpeg(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/monitor/result")
def monitor_result(token: str = ""):
    try:
        monitor_engine.assert_media_token(token)
    except PermissionError as exc:
        raise HTTPException(404, str(exc)) from exc
    path = monitor_engine.result_path()
    if path is None:
        raise HTTPException(404, "No processed video is available")
    return FileResponse(path, media_type="video/webm", filename=path.name)
