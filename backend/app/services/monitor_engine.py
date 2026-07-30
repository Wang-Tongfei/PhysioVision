"""Local camera/video analysis engine used by the dashboard monitor.

The engine deliberately reuses Physio_AI_Bot's estimators, exercise state
machines and HUD. The exact OpenCV frame painted by ``hud.draw`` is JPEG
encoded for the browser, so the desktop and web views share one visual source.
"""
from __future__ import annotations

import importlib
import sys
import threading
import time
import uuid
from pathlib import Path
from typing import Iterator

from app.core.config import settings


PROJECT_ROOT = Path(__file__).resolve().parents[3]
BOT_ROOT = PROJECT_ROOT / "Physio_AI_Bot"
DATA_ROOT = PROJECT_ROOT / "backend" / "data"
UPLOAD_ROOT = DATA_ROOT / "uploads"
OUTPUT_ROOT = DATA_ROOT / "processed"

SUPPORTED_EXERCISES = {"bicep_curl", "squat", "plank", "pushup"}


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
        raise RuntimeError(
            "Vision dependencies are unavailable. Install backend/requirements.txt "
            "and initialise the Physio_AI_Bot submodule."
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
        }

    def status(self) -> dict:
        with self._lock:
            return dict(self._status)

    def result_path(self) -> Path | None:
        with self._lock:
            path = self._result_path
        return path if path and path.is_file() else None

    def start_camera(
        self, exercise: str, camera_index: int = 0, track_arm: str = "right"
    ) -> dict:
        return self._start(
            source=camera_index,
            source_kind="camera",
            exercise=exercise,
            track_arm=track_arm,
        )

    def start_video(
        self, path: Path, exercise: str, track_arm: str = "right"
    ) -> dict:
        return self._start(
            source=str(path),
            source_kind="upload",
            exercise=exercise,
            track_arm=track_arm,
        )

    def _start(
        self, source: int | str, source_kind: str, exercise: str, track_arm: str
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
                }
            )
            self._thread = threading.Thread(
                target=self._run,
                args=(source, source_kind, exercise, track_arm),
                daemon=True,
                name="physiovision-monitor",
            )
            self._thread.start()
            return dict(self._status)

    def stop(self) -> dict:
        self._stop_event.set()
        with self._lock:
            if self._status["phase"] in {"starting", "running"}:
                self._status["phase"] = "stopping"
            return dict(self._status)

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
        self, source_value: int | str, source_kind: str, exercise: str, track_arm: str
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
                    metric_label = result.metric_label
                    metric_value = result.metric_value
                    form_ok = result.form_ok
                    form_status = result.status
                    if result.fault:
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
                            }
                        )
                        self._frame_ready.notify_all()

                if source_kind == "upload":
                    elapsed = time.monotonic() - loop_started
                    self._stop_event.wait(max(0.0, frame_interval - elapsed))

            if writer is not None:
                writer.release()
                writer = None
            stopped = self._stop_event.is_set()
            with self._frame_ready:
                self._status["phase"] = "stopped" if stopped else "completed"
                self._status["complete"] = bool(analyzer.is_complete)
                self._status["has_result_video"] = self._result_path is not None
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


monitor_engine = MonitorEngine()
