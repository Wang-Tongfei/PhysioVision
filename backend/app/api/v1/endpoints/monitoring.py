"""Camera and uploaded-video monitoring endpoints."""
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

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


@router.get("/monitor/status")
def monitor_status():
    return monitor_engine.status()


@router.post("/monitor/live", status_code=202)
def start_live_monitor(
    exercise: str = "bicep_curl",
    camera_index: int = 0,
    track_arm: str = "right",
):
    try:
        return monitor_engine.start_camera(exercise, camera_index, track_arm)
    except (RuntimeError, ValueError) as exc:
        raise _start_error(exc) from exc


@router.post("/monitor/upload", status_code=202)
async def upload_video(
    video: UploadFile = File(...),
    exercise: str = Form("bicep_curl"),
    track_arm: str = Form("right"),
):
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
        return monitor_engine.start_video(destination, exercise, track_arm)
    except HTTPException:
        destination.unlink(missing_ok=True)
        raise
    except (RuntimeError, ValueError) as exc:
        destination.unlink(missing_ok=True)
        raise _start_error(exc) from exc
    finally:
        await video.close()


@router.post("/monitor/stop")
def stop_monitor():
    return monitor_engine.stop()


@router.get("/monitor/stream")
def monitor_stream():
    return StreamingResponse(
        monitor_engine.iter_mjpeg(),
        media_type="multipart/x-mixed-replace; boundary=frame",
        headers={"Cache-Control": "no-store"},
    )


@router.get("/monitor/result")
def monitor_result():
    path = monitor_engine.result_path()
    if path is None:
        raise HTTPException(404, "No processed video is available")
    return FileResponse(path, media_type="video/webm", filename=path.name)
