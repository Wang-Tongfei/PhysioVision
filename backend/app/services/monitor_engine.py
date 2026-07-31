"""Local camera/video analysis engine used by the dashboard monitor.

The engine deliberately reuses Physio_AI_Bot's estimators, exercise state
machines and HUD. The exact OpenCV frame painted by ``hud.draw`` is JPEG
encoded for the browser, so the desktop and web views share one visual source.
"""
from __future__ import annotations

import importlib
import logging
import queue
import secrets
import sys
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterator

from app.core.config import settings
from app.agents.coach_agent import coach
from app.agents.risk_agent import assess
from app.agents.therapist_agent import summarize


logger = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parents[3]
BOT_ROOT = PROJECT_ROOT / "Physio_AI_Bot"
DATA_ROOT = PROJECT_ROOT / "backend" / "data"
UPLOAD_ROOT = DATA_ROOT / "uploads"
OUTPUT_ROOT = DATA_ROOT / "processed"

SUPPORTED_EXERCISES = {"bicep_curl", "squat", "plank", "pushup"}
ROM_TARGETS = {
    "bicep_curl": 70.0,
    "squat": 80.0,
    "pushup": 70.0,
    "plank": 160.0,
}


class BrowserFrameSource:
    """Low-latency video source fed by JPEG WebSocket messages."""

    def __init__(self, cv2, stop_event: threading.Event):
        self.cv2 = cv2
        self.stop_event = stop_event
        self.frames: queue.Queue[bytes] = queue.Queue(maxsize=2)
        self.fps = 10.0
        self.width = 640
        self.height = 480
        self.label = "Browser camera"

    def push(self, jpeg: bytes) -> None:
        if self.stop_event.is_set():
            return
        if self.frames.full():
            try:
                self.frames.get_nowait()
            except queue.Empty:
                pass
        try:
            self.frames.put_nowait(jpeg)
        except queue.Full:
            pass

    def read(self):
        np = importlib.import_module("numpy")
        while not self.stop_event.is_set():
            try:
                jpeg = self.frames.get(timeout=0.25)
            except queue.Empty:
                continue
            frame = self.cv2.imdecode(
                np.frombuffer(jpeg, dtype=np.uint8), self.cv2.IMREAD_COLOR
            )
            if frame is not None:
                self.height, self.width = frame.shape[:2]
                return True, frame
        return False, None

    def release(self) -> None:
        self.stop_event.set()


def _load_bot_modules():
    """Import the Bot lazily so the API can still boot without vision extras."""
    bot_path = str(BOT_ROOT)
    if bot_path not in sys.path:
        sys.path.insert(0, bot_path)
    try:
        return {
            "cv2": importlib.import_module("cv2"),
            "Config": importlib.import_module("config").Config,
            "VideoSource": importlib.import_module("camera").VideoSource,
            "PoseEstimator": importlib.import_module("pose_estimator").PoseEstimator,
            "HandEstimator": importlib.import_module("hand_estimator").HandEstimator,
            "create_analyzer": importlib.import_module(
                "exercise_analysis"
            ).create_analyzer,
            "ClipRecorder": importlib.import_module("clip_recorder").ClipRecorder,
            "TelegramNotifier": importlib.import_module(
                "notifier"
            ).TelegramNotifier,
            "hud": importlib.import_module("hud"),
        }
    except (ImportError, AttributeError) as exc:
        logger.exception("Vision module import failed")
        raise RuntimeError(
            "Vision dependencies are unavailable. Install backend/requirements.txt "
            "and initialise the Physio_AI_Bot submodule. "
            f"Cause: {type(exc).__name__}: {exc}"
        ) from exc


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
        source = pose = hand_pose = writer = None
        try:
            modules = _load_bot_modules()
            cv2 = modules["cv2"]
            cfg = modules["Config"]()
            cfg.exercise = exercise
            cfg.track_arm = track_arm

            if not Path(cfg.model_path).is_file():
                raise RuntimeError(f"Pose model was not found: {cfg.model_path}")

            if source_kind == "browser":
                source = BrowserFrameSource(cv2, self._stop_event)
                with self._lock:
                    self._browser_source = source
            else:
                source = modules["VideoSource"].open(source_value, cfg.camera_index)
            pose = modules["PoseEstimator"](cfg.model_path)
            if cfg.enable_hand_tracking and Path(cfg.hand_model_path).is_file():
                hand_pose = modules["HandEstimator"](cfg.hand_model_path)
            analyzer = modules["create_analyzer"](exercise, cfg, track_arm)
            recorder = modules["ClipRecorder"](
                cfg.clips_dir, source.fps, cfg.clip_buffer_seconds
            )
            notifier = modules["TelegramNotifier"](
                settings.PHYSIO_TG_TOKEN or cfg.telegram_token,
                settings.PHYSIO_TG_CHAT or cfg.telegram_chat_id,
            )

            if source_kind == "upload":
                OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
                result_path = OUTPUT_ROOT / f"{self._status['job_id']}.webm"
                writer = cv2.VideoWriter(
                    str(result_path),
                    cv2.VideoWriter_fourcc(*"VP80"),
                    source.fps,
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
                        "unit": analyzer.unit,
                        "telegram_enabled": notifier.enabled,
                    }
                )
            notifier.send_message(
                f"PhysioVision: {analyzer.name} session started "
                f"({source.label})."
            )

            form_status = "Step into view of the camera"
            form_ok = True
            metric_label = ""
            metric_value = None
            last_fault_time = 0.0
            last_alert_by_fault: dict[str, float] = {}
            notified_complete = False
            frame_interval = 1.0 / max(1.0, source.fps)
            started_at = datetime.now(timezone.utc)
            analyzed_frames = 0
            good_frames = 0
            fault_frames = 0
            metric_values: list[float] = []
            faults: set[str] = set()

            while not self._stop_event.is_set():
                loop_started = time.monotonic()
                ok, frame = source.read()
                if not ok:
                    break
                if source_kind == "camera":
                    frame = cv2.flip(frame, 1)

                landmarks = pose.estimate(frame)
                hand_landmarks = hand_pose.estimate(frame) if hand_pose else []
                if landmarks is not None and not analyzer.is_complete:
                    result = analyzer.update(landmarks)
                    analyzed_frames += 1
                    metric_label = result.metric_label
                    metric_value = result.metric_value
                    form_ok = result.form_ok
                    form_status = result.status
                    good_frames += int(result.form_ok)
                    fault_frames += int(not result.form_ok)
                    if result.metric_value is not None:
                        metric_values.append(float(result.metric_value))
                    if result.fault:
                        faults.add(result.fault)
                        fault_time = time.time()
                        last_fault_time = fault_time
                        previous_alert = last_alert_by_fault.get(
                            result.fault, 0.0
                        )
                        if fault_time - previous_alert >= 15.0:
                            clip_path = recorder.save(result.fault)
                            if clip_path:
                                notifier.send_video(
                                    clip_path,
                                    caption=(
                                        f"PhysioVision alert: {analyzer.name} - "
                                        f"{result.status}. Please review."
                                    ),
                                )
                                last_alert_by_fault[result.fault] = fault_time
                elif landmarks is None and not analyzer.is_complete:
                    form_status = "Step into view of the camera"
                    form_ok = True

                recorder.add(frame)
                if analyzer.is_complete and not notified_complete:
                    notifier.send_message(
                        f"PhysioVision workout complete: {analyzer.name} "
                        f"{analyzer.progress:.1f}/{analyzer.target:g} "
                        f"{analyzer.unit}."
                    )
                    notified_complete = True
                state = modules["hud"].HudState(
                    exercise=analyzer.name,
                    progress=analyzer.progress,
                    target=analyzer.target,
                    unit=analyzer.unit,
                    arm=track_arm,
                    metric_label=metric_label,
                    metric_value=metric_value,
                    form_status=form_status,
                    form_ok=form_ok,
                    complete=analyzer.is_complete,
                    fault_active=(time.time() - last_fault_time < 1.0),
                    landmarks=landmarks,
                    hand_landmarks=hand_landmarks,
                )
                modules["hud"].draw(frame, state)

                if writer:
                    writer.write(frame)
                encoded, jpeg = cv2.imencode(
                    ".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 85]
                )
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
                                    round(float(metric_value), 1)
                                    if metric_value is not None
                                    else None
                                ),
                                "complete": bool(analyzer.is_complete),
                                "has_frame": True,
                                "coach_message": form_status,
                                "coach_severity": "info" if form_ok else "warning",
                            }
                        )
                        self._frame_ready.notify_all()

                if analyzer.is_complete:
                    break

                if source_kind == "upload":
                    elapsed = time.monotonic() - loop_started
                    self._stop_event.wait(max(0.0, frame_interval - elapsed))

            if writer is not None:
                writer.release()
                writer = None
            workout_completed = bool(analyzer.is_complete)
            valid_data = analyzed_frames > 0 and float(analyzer.progress) > 0
            session_completed = workout_completed or (
                source_kind == "upload" and not self._stop_event.is_set()
            )
            completion = min(
                1.0,
                float(analyzer.progress) / max(1.0, float(analyzer.target)),
            )
            form_ratio = good_frames / max(1, analyzed_frames)
            quality = round(100 * (0.7 * form_ratio + 0.3 * completion), 1)
            compensation = bool(faults)
            fatigue = round(
                min(100.0, 100.0 * fault_frames / max(1, analyzed_frames)),
                1,
            )
            if exercise == "plank" and metric_values:
                rom_achieved = round(sum(metric_values) / len(metric_values), 1)
            else:
                rom_achieved = (
                    round(max(metric_values) - min(metric_values), 1)
                    if len(metric_values) > 1
                    else round(metric_values[0], 1) if metric_values else 0.0
                )
            telemetry = {
                "movement_quality_score": quality,
                "rom_achieved_deg": rom_achieved,
                "rom_target_deg": ROM_TARGETS[exercise],
                "total_reps": int(analyzer.progress),
                "fatigue_index": fatigue,
                "compensation_detected": compensation,
            }
            risk = None
            therapist = None
            if valid_data:
                risk = assess(telemetry, base_risk=self._patient_base_risk(patient_id))
                coaching = coach(telemetry, risk_tier=risk["tier"])
                therapist = summarize(
                    telemetry,
                    baseline_quality=self._patient_baseline(patient_id),
                    risk=risk,
                )
            else:
                coaching = {
                    "message": "Insufficient movement data. Complete at least one valid repetition and try again.",
                    "severity": "warning",
                }
            session_id = self._persist_summary(
                patient_id=patient_id,
                exercise=exercise,
                source_kind=source_kind,
                completed=session_completed,
                started_at=started_at,
                telemetry=telemetry,
                risk=risk,
                therapist=therapist,
                valid_data=valid_data,
                clinic_id=self._status.get("_owner_clinic_id"),
            )
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
            with self._frame_ready:
                self._status.update({"phase": "error", "error": str(exc)})
                self._frame_ready.notify_all()
        finally:
            if "notifier" in locals():
                notifier.flush(timeout=15)
            if writer is not None:
                writer.release()
            if source is not None:
                source.release()
            if pose is not None:
                pose.close()
            if hand_pose is not None:
                hand_pose.close()
            if source_kind == "upload":
                Path(str(source_value)).unlink(missing_ok=True)
            with self._lock:
                self._browser_source = None

    @staticmethod
    def _patient_base_risk(patient_id: int | None) -> float:
        if patient_id is None:
            return 20.0
        from app.core.database import SessionLocal
        from app.models.patient import Patient

        with SessionLocal() as db:
            patient = db.get(Patient, patient_id)
            tier = getattr(patient.risk_tier, "value", patient.risk_tier) if patient else "moderate"
        return {"low": 10.0, "moderate": 35.0, "high": 65.0, "critical": 90.0}.get(
            str(tier), 35.0
        )

    @staticmethod
    def _patient_baseline(patient_id: int | None) -> float:
        if patient_id is None:
            return 80.0
        from sqlalchemy import func
        from app.core.database import SessionLocal
        from app.models.session import RehabSession

        with SessionLocal() as db:
            value = (
                db.query(func.avg(RehabSession.movement_quality_score))
                .filter(RehabSession.patient_id == patient_id)
                .scalar()
            )
        return round(float(value or 80.0), 1)

    @staticmethod
    def _persist_summary(
        *,
        patient_id: int | None,
        exercise: str,
        source_kind: str,
        completed: bool,
        started_at: datetime,
        telemetry: dict,
        risk: dict | None,
        therapist: dict | None,
        valid_data: bool,
        clinic_id: int | None,
    ) -> int | None:
        if patient_id is None:
            return None
        from app.core.database import SessionLocal
        from app.models.alert import Alert
        from app.models.patient import Patient
        from app.models.session import RehabSession, SessionStatus

        with SessionLocal() as db:
            patient = db.get(Patient, patient_id)
            if patient is None or (
                clinic_id is not None and patient.clinic_id != clinic_id
            ):
                return None
            row = RehabSession(
                patient_id=patient_id,
                edge_node_id="local-monitor",
                camera_id=source_kind,
                status=(
                    SessionStatus.INSUFFICIENT_DATA
                    if not valid_data
                    else SessionStatus.COMPLETED if completed else SessionStatus.ABORTED
                ),
                started_at=started_at,
                ended_at=datetime.now(timezone.utc),
                movement_quality_score=telemetry["movement_quality_score"] if valid_data else None,
                risk_score=risk["risk_score"] if risk else None,
                fatigue_index=telemetry["fatigue_index"] if valid_data else None,
                compensation_detected=telemetry["compensation_detected"] if valid_data else False,
                total_reps=telemetry["total_reps"],
                rom_achieved_deg=telemetry["rom_achieved_deg"],
                rom_target_deg=telemetry["rom_target_deg"],
                evidence_clip_url=f"exercise:{exercise}",
            )
            db.add(row)
            db.flush()
            if risk and therapist and (
                risk["tier"] != "low" or telemetry["compensation_detected"]
            ):
                db.add(
                    Alert(
                        session_id=row.id,
                        patient_id=patient_id,
                        severity="critical" if risk["tier"] == "high" else "warning",
                        type="compensation" if telemetry["compensation_detected"] else "risk",
                        message=therapist["summary"],
                        score=risk["risk_score"],
                    )
                )
            db.commit()
            return row.id


monitor_engine = MonitorEngine()
