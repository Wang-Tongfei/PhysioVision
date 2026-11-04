"""Local camera/video analysis engine used by the dashboard monitor.

Analysis is delegated to the ``physiosight`` engine package (pose model,
spec-driven exercise state machines, renderer, clip recorder, Telegram). This
module owns what is platform-specific: one job at a time, the browser frame
source, MJPEG streaming, ownership checks and persisting results.
"""
from __future__ import annotations

import logging
import queue
import secrets
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from types import SimpleNamespace
from typing import Iterator

from app.core.config import settings
from app.agents.coach_agent import coach
from app.services.session_records import (  # noqa: F401  (re-exported for callers/tests)
    ROM_TARGETS,
    assess_session,
    fatigue_from_session,
    has_valid_data,
    persist_session,
    rom_from_session,
    telemetry_from_session,
)


logger = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_ROOT = PROJECT_ROOT / "backend" / "data"
UPLOAD_ROOT = DATA_ROOT / "uploads"
OUTPUT_ROOT = DATA_ROOT / "processed"
CLIPS_ROOT = DATA_ROOT / "clips"
CLIP_COOLDOWN_S = 15.0

SUPPORTED_EXERCISES = {"bicep_curl", "squat", "plank", "pushup"}


class BrowserFrameSource:
    """Low-latency frame source fed by JPEG WebSocket messages.

    Implements the physiosight FrameSource protocol: ``frames()`` yields
    ``(t_seconds, frame)``. The timestamp is the server receive time relative
    to the first frame; the engine is time-based, so the ~10 fps browser
    stream gives the same decisions as a 30 fps camera.
    """

    kind = "browser"

    def __init__(self, cv2, stop_event: threading.Event):
        self.cv2 = cv2
        self.stop_event = stop_event
        self.queue: queue.Queue[tuple[float, bytes]] = queue.Queue(maxsize=2)
        self.nominal_fps: float | None = 10.0
        self.width = 640
        self.height = 480
        self.label = "Browser camera"

    def push(self, jpeg: bytes, received_at: float | None = None) -> None:
        if self.stop_event.is_set():
            return
        item = (time.monotonic() if received_at is None else received_at, jpeg)
        if self.queue.full():
            try:
                self.queue.get_nowait()
            except queue.Empty:
                pass
        try:
            self.queue.put_nowait(item)
        except queue.Full:
            pass

    def frames(self) -> Iterator[tuple[float, object]]:
        import numpy as np

        t0: float | None = None
        last_t = -1.0
        while not self.stop_event.is_set():
            try:
                received_at, jpeg = self.queue.get(timeout=0.25)
            except queue.Empty:
                continue
            frame = self.cv2.imdecode(np.frombuffer(jpeg, dtype=np.uint8), self.cv2.IMREAD_COLOR)
            if frame is None:
                continue
            self.height, self.width = frame.shape[:2]
            t0 = received_at if t0 is None else t0
            t = max(received_at - t0, last_t + 1e-3)  # strictly increasing for the pose model
            last_t = t
            yield t, frame

    def close(self) -> None:
        self.stop_event.set()


def _load_vision() -> SimpleNamespace:
    """Import the engine lazily so the API can still boot without vision extras."""
    try:
        import cv2

        from physiosight import i18n
        from physiosight.capture.sources import CameraSource, VideoFileSource
        from physiosight.events import FaultDetected
        from physiosight.exercises.spec import load_spec
        from physiosight.live import mirror_pose
        from physiosight.perception.hands import MediaPipeHandBackend
        from physiosight.perception.mediapipe_backend import MediaPipePoseBackend
        from physiosight.perception.models import HAND_MODEL, POSE_MODEL, model_path
        from physiosight.pipeline import Analysis
        from physiosight.plugins.clips import ClipRecorder
        from physiosight.plugins.telegram import TelegramNotifier
        from physiosight.render.overlay import draw_hud, draw_pose
        from physiosight.session.models import SourceInfo
    except ImportError as exc:
        logger.exception("Vision module import failed")
        raise RuntimeError(
            "Vision dependencies are unavailable. Install backend/requirements.txt "
            "(it includes physiosight[mediapipe,notify]). "
            f"Cause: {type(exc).__name__}: {exc}"
        ) from exc
    return SimpleNamespace(
        cv2=cv2, i18n=i18n, CameraSource=CameraSource, VideoFileSource=VideoFileSource,
        FaultDetected=FaultDetected, load_spec=load_spec, mirror_pose=mirror_pose,
        MediaPipeHandBackend=MediaPipeHandBackend, MediaPipePoseBackend=MediaPipePoseBackend,
        HAND_MODEL=HAND_MODEL, POSE_MODEL=POSE_MODEL, model_path=model_path, Analysis=Analysis,
        ClipRecorder=ClipRecorder, TelegramNotifier=TelegramNotifier, draw_hud=draw_hud,
        draw_pose=draw_pose, SourceInfo=SourceInfo,
    )


class MonitorEngine:
    """Own one camera or uploaded-video analysis job at a time."""

    def __init__(self):
        self._lock = threading.RLock()
        self._frame_ready = threading.Condition(self._lock)
        self._stop_event = threading.Event()
        self._thread: threading.Thread | None = None
        self._latest_jpeg: bytes | None = None
        self._result_path: Path | None = None
        self._browser_source: BrowserFrameSource | None = None
        self._status = self._idle_status()

    @staticmethod
    def _idle_status() -> dict:
        return {
            "job_id": None,
            "phase": "idle",
            "source": None,
            "source_label": None,
            "exercise": None,
            "progress": 0.0,
            "target": 0.0,
            "unit": "reps",
            "form_status": "Ready",
            "form_ok": True,
            "metric_label": "",
            "metric_value": None,
            "complete": False,
            "error": None,
            "has_frame": False,
            "has_result_video": False,
            "telegram_enabled": False,
            "patient_id": None,
            "session_id": None,
            "movement_quality_score": None,
            "risk_score": None,
            "risk_tier": None,
            "fatigue_index": None,
            "compensation_detected": False,
            "coach_message": None,
            "coach_severity": "info",
            "therapist_summary": None,
            "data_status": None,
            "media_token": None,
            "_owner_user_id": None,
            "_owner_clinic_id": None,
        }

    @staticmethod
    def _public(status: dict) -> dict:
        return {key: value for key, value in status.items() if not key.startswith("_")}

    def status(self) -> dict:
        with self._lock:
            return self._public(self._status)

    def status_for(self, user_id: int, clinic_id: int) -> dict:
        with self._lock:
            if not self._is_owner(user_id, clinic_id):
                return self._public(self._idle_status())
            return self._public(self._status)

    def _is_owner(self, user_id: int, clinic_id: int) -> bool:
        return (
            self._status.get("_owner_user_id") == user_id
            and self._status.get("_owner_clinic_id") == clinic_id
        )

    def assert_owner(self, user_id: int, clinic_id: int) -> None:
        with self._lock:
            if not self._is_owner(user_id, clinic_id):
                raise PermissionError("Monitoring job not found")

    def assert_media_token(self, token: str) -> None:
        with self._lock:
            if not token or token != self._status.get("media_token"):
                raise PermissionError("Monitoring media not found")

    def result_path(self) -> Path | None:
        with self._lock:
            path = self._result_path
        return path if path and path.is_file() else None

    def start_camera(
        self,
        exercise: str,
        camera_index: int = 0,
        track_arm: str = "right",
        patient_id: int | None = None,
        owner_user_id: int | None = None,
        owner_clinic_id: int | None = None,
    ) -> dict:
        return self._start(
            source=camera_index,
            source_kind="camera",
            exercise=exercise,
            track_arm=track_arm,
            patient_id=patient_id,
            owner_user_id=owner_user_id,
            owner_clinic_id=owner_clinic_id,
        )

    def start_video(
        self,
        path: Path,
        exercise: str,
        track_arm: str = "right",
        patient_id: int | None = None,
        owner_user_id: int | None = None,
        owner_clinic_id: int | None = None,
    ) -> dict:
        return self._start(str(path), "upload", exercise, track_arm, patient_id, owner_user_id, owner_clinic_id)

    def start_browser(
        self,
        exercise: str,
        track_arm: str = "right",
        patient_id: int | None = None,
        owner_user_id: int | None = None,
        owner_clinic_id: int | None = None,
    ) -> dict:
        return self._start(None, "browser", exercise, track_arm, patient_id, owner_user_id, owner_clinic_id)

    def push_browser_frame(self, jpeg: bytes) -> None:
        with self._lock:
            source = self._browser_source
        if source is not None:
            source.push(jpeg)

    def _start(
        self,
        source: int | str | None,
        source_kind: str,
        exercise: str,
        track_arm: str,
        patient_id: int | None = None,
        owner_user_id: int | None = None,
        owner_clinic_id: int | None = None,
    ) -> dict:
        if exercise not in SUPPORTED_EXERCISES:
            raise ValueError(f"Unsupported exercise: {exercise}")
        if track_arm not in {"left", "right"}:
            raise ValueError("track_arm must be left or right")

        with self._lock:
            if self._thread and self._thread.is_alive():
                raise RuntimeError("Another monitoring job is already running")
            if self._result_path and self._result_path.is_file():
                self._result_path.unlink(missing_ok=True)
            self._stop_event = threading.Event()
            self._latest_jpeg = None
            self._result_path = None
            self._status = self._idle_status()
            self._status.update(
                {
                    "job_id": uuid.uuid4().hex,
                    "phase": "starting",
                    "source": source_kind,
                    "exercise": exercise,
                    "patient_id": patient_id,
                    "media_token": secrets.token_urlsafe(24),
                    "_owner_user_id": owner_user_id,
                    "_owner_clinic_id": owner_clinic_id,
                }
            )
            self._thread = threading.Thread(
                target=self._run,
                args=(source, source_kind, exercise, track_arm, patient_id),
                daemon=True,
                name="physiovision-monitor",
            )
            self._thread.start()
            return self._public(self._status)

    def stop(self) -> dict:
        self._stop_event.set()
        with self._lock:
            if self._status["phase"] in {"starting", "running"}:
                self._status["phase"] = "stopping"
            return self._public(self._status)

    def stop_for(self, user_id: int, clinic_id: int) -> dict:
        self.assert_owner(user_id, clinic_id)
        return self.stop()

    def iter_mjpeg(self) -> Iterator[bytes]:
        """Yield the latest rendered frame as a browser-compatible MJPEG stream."""
        last_frame = None
        while True:
            with self._frame_ready:
                self._frame_ready.wait_for(
                    lambda: self._latest_jpeg is not None
                    and self._latest_jpeg is not last_frame,
                    timeout=1.0,
                )
                frame = self._latest_jpeg
                phase = self._status["phase"]
            if frame is not None and frame is not last_frame:
                last_frame = frame
                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n"
                    b"Cache-Control: no-cache\r\n\r\n"
                    + frame
                    + b"\r\n"
                )
            if phase in {"idle", "error"} and frame is None:
                break

    def _run(
        self,
        source_value: int | str | None,
        source_kind: str,
        exercise: str,
        track_arm: str,
        patient_id: int | None,
    ) -> None:
        source = pose = hand_pose = writer = notifier = None
        try:
            v = _load_vision()
            cv2 = v.cv2
            spec, spec_sha = v.load_spec(exercise, track_arm if exercise == "bicep_curl" else None)

            if source_kind == "browser":
                source = BrowserFrameSource(cv2, self._stop_event)
                with self._lock:
                    self._browser_source = source
            elif source_kind == "camera":
                source = v.CameraSource(int(source_value or 0))
            else:
                source = v.VideoFileSource(str(source_value))
            pose = v.MediaPipePoseBackend(str(v.model_path(v.POSE_MODEL)))
            try:
                hand_pose = v.MediaPipeHandBackend(str(v.model_path(v.HAND_MODEL)))
            except (FileNotFoundError, AttributeError):
                hand_pose = None

            analysis = v.Analysis(
                spec,
                spec.default_target,
                source=v.SourceInfo(
                    kind="video" if source_kind == "upload" else "camera",
                    width=source.width or None,
                    height=source.height or None,
                    nominal_fps=source.nominal_fps,
                ),
                pose_backend=pose.name,
                pose_backend_version=pose.version,
                spec_sha256=spec_sha,
            )
            analyzer = analysis.analyzer
            exercise_name = v.i18n.text(spec.name_key, "en")
            unit = "sec" if spec.kind == "hold" else "reps"
            notifier = v.TelegramNotifier(
                settings.PHYSIO_TG_TOKEN or None, settings.PHYSIO_TG_CHAT or None
            )
            fps = source.nominal_fps or 10.0
            recorder = v.ClipRecorder(
                CLIPS_ROOT,
                fps,
                cooldown_s=CLIP_COOLDOWN_S,
                on_saved=lambda path, ev: notifier.send_video(
                    path,
                    caption=(
                        f"PhysioVision alert: {exercise_name} - "
                        f"{v.i18n.text('fault.' + ev.code, 'en')}. Please review."
                    ),
                ),
            )
            recorder.attach(analysis.bus)
            faults: set[str] = set()
            last_fault_time = 0.0

            def on_fault(ev) -> None:
                nonlocal last_fault_time
                faults.add(ev.code)
                last_fault_time = time.time()

            analysis.bus.subscribe(v.FaultDetected, on_fault)

            if source_kind == "upload":
                OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
                result_path = OUTPUT_ROOT / f"{self._status['job_id']}.webm"
                writer = cv2.VideoWriter(
                    str(result_path),
                    cv2.VideoWriter.fourcc(*"VP80"),
                    fps,
                    (source.width, source.height),
                )
                if not writer.isOpened():
                    raise RuntimeError("Could not create the processed video")
                with self._lock:
                    self._result_path = result_path

            with self._lock:
                self._status.update(
                    {
                        "phase": "running",
                        "source_label": source.label,
                        "target": float(analyzer.target),
                        "unit": unit,
                        "telegram_enabled": notifier.enabled,
                    }
                )
            notifier.send_message(
                f"PhysioVision: {exercise_name} session started ({source.label})."
            )

            notified_complete = False
            frame_interval = 1.0 / max(1.0, fps)
            started_at = datetime.now(timezone.utc)
            analyzed_frames = 0
            metric_values: list[float] = []

            for t, frame in source.frames():
                if self._stop_event.is_set():
                    break
                loop_started = time.monotonic()
                landmarks = pose.process(frame, t)
                hands = hand_pose.process(frame, t) if hand_pose else []
                result = analysis.step(t, landmarks)
                if result is None:
                    break
                if landmarks is not None:
                    analyzed_frames += 1
                    if result.metric_value is not None:
                        metric_values.append(float(result.metric_value))
                    form_status = v.i18n.text(
                        result.hint_key, "en",
                        progress=int(result.progress) if unit == "reps" else result.progress,
                        target=analyzer.target,
                    )
                    form_ok = result.form_ok
                else:
                    form_status, form_ok = "Step into view of the camera", True
                metric_label = (
                    v.i18n.text(result.metric_label_key, "en") if result.metric_label_key else ""
                )

                # The camera view is mirrored for display only; analysis used the
                # original frame so left/right stay anatomical.
                mirror = source_kind == "camera"
                view = cv2.flip(frame, 1) if mirror else frame.copy()
                width = view.shape[1]
                shown_pose = v.mirror_pose(landmarks, width) if mirror else landmarks
                shown_hands = (
                    [h.copy() for h in hands] if not mirror
                    else [_mirror_points(h, width) for h in hands]
                )
                v.draw_pose(view, shown_pose, shown_hands)
                recorder.add(view)
                v.draw_hud(
                    view, result, exercise_name, analyzer.target, unit,
                    fault_active=time.time() - last_fault_time < 1.0,
                    complete=analyzer.is_complete,
                )

                if analyzer.is_complete and not notified_complete:
                    notifier.send_message(
                        f"PhysioVision workout complete: {exercise_name} "
                        f"{analyzer.progress:g}/{analyzer.target:g} {unit}."
                    )
                    notified_complete = True

                if writer:
                    writer.write(view)
                encoded, jpeg = cv2.imencode(".jpg", view, [cv2.IMWRITE_JPEG_QUALITY, 85])
                if encoded:
                    with self._frame_ready:
                        self._latest_jpeg = jpeg.tobytes()
                        self._status.update(
                            {
                                "progress": float(analyzer.progress),
                                "form_status": form_status,
                                "form_ok": form_ok,
                                "metric_label": metric_label,
                                "metric_value": (
                                    round(float(result.metric_value), 1)
                                    if result.metric_value is not None
                                    else None
                                ),
                                "complete": bool(analyzer.is_complete),
                                "has_frame": True,
                                "coach_message": form_status,
                                "coach_severity": "info" if form_ok else "warning",
                            }
                        )
                        self._frame_ready.notify_all()

                if analysis.done:
                    break
                if source_kind == "upload":
                    # pace uploads like a live stream for the dashboard; analysis itself
                    # uses the video's own timestamps, not this wall-clock pacing
                    elapsed = time.monotonic() - loop_started
                    self._stop_event.wait(max(0.0, frame_interval - elapsed))

            if writer is not None:
                writer.release()
                writer = None
            session = analysis.finish()
            workout_completed = bool(session.summary.completed)
            valid_data = analyzed_frames > 0 and float(analyzer.progress) > 0
            session_completed = workout_completed or (
                source_kind == "upload" and not self._stop_event.is_set()
            )
            telemetry = telemetry_from_session(session, metric_values)
            quality = telemetry["movement_quality_score"]
            fatigue = telemetry["fatigue_index"]
            compensation = telemetry["compensation_detected"]
            session_id = None
            from app.core.database import SessionLocal
            from app.models.patient import Patient

            with SessionLocal() as db:
                patient = db.get(Patient, patient_id) if patient_id is not None else None
                owner_clinic = self._status.get("_owner_clinic_id")
                if patient is not None and owner_clinic is not None and patient.clinic_id != owner_clinic:
                    patient = None
                risk, therapist = assess_session(
                    db, patient.id if patient else None, telemetry, valid_data
                )
                if patient is not None:
                    row = persist_session(
                        db, patient_id=patient.id, session=session, telemetry=telemetry,
                        risk=risk, therapist=therapist, valid_data=valid_data,
                        completed=session_completed, source="local-monitor", started_at=started_at,
                    )
                    db.commit()
                    session_id = row.id
            if valid_data and risk:
                coaching = coach(telemetry, risk_tier=risk["tier"])
            else:
                coaching = {
                    "message": "Insufficient movement data. Complete at least one valid repetition and try again.",
                    "severity": "warning",
                }
            with self._frame_ready:
                self._status["phase"] = (
                    "completed" if valid_data and session_completed else "stopped"
                )
                self._status["complete"] = workout_completed
                self._status["has_result_video"] = self._result_path is not None
                self._status.update(
                    {
                        "session_id": session_id,
                        "movement_quality_score": quality if valid_data else None,
                        "risk_score": risk["risk_score"] if risk else None,
                        "risk_tier": risk["tier"] if risk else None,
                        "fatigue_index": fatigue if valid_data else None,
                        "compensation_detected": compensation if valid_data else False,
                        "coach_message": coaching["message"],
                        "coach_severity": coaching["severity"],
                        "therapist_summary": therapist,
                        "data_status": "valid" if valid_data else "insufficient_data",
                    }
                )
                self._frame_ready.notify_all()
        except Exception as exc:
            logger.exception("Monitoring job failed")
            with self._frame_ready:
                self._status.update({"phase": "error", "error": str(exc)})
                self._frame_ready.notify_all()
        finally:
            if notifier is not None:
                notifier.flush(timeout=15)
            if writer is not None:
                writer.release()
            if source is not None:
                source.close()
            if pose is not None:
                pose.close()
            if hand_pose is not None:
                hand_pose.close()
            if source_kind == "upload":
                Path(str(source_value)).unlink(missing_ok=True)
            with self._lock:
                self._browser_source = None


def _mirror_points(points, width: int):
    out = points.copy()
    out[:, 0] = width - out[:, 0]
    return out


monitor_engine = MonitorEngine()
