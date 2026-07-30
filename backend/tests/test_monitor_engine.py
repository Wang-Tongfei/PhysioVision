"""End-to-end smoke test for uploaded-video monitoring."""
import sys
import tempfile
import time
import unittest
from pathlib import Path

import cv2
import numpy as np
from fastapi.testclient import TestClient


BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from app.services.monitor_engine import monitor_engine
from main import app


class MonitorUploadTest(unittest.TestCase):
    def test_uploaded_video_produces_stream_frame_and_webm_result(self):
        with tempfile.TemporaryDirectory() as directory:
            input_path = Path(directory) / "input.mp4"
            writer = cv2.VideoWriter(
                str(input_path),
                cv2.VideoWriter_fourcc(*"mp4v"),
                10.0,
                (320, 240),
            )
            self.assertTrue(writer.isOpened())
            for frame_number in range(12):
                frame = np.zeros((240, 320, 3), dtype=np.uint8)
                frame[:, :, 1] = 30 + frame_number * 5
                writer.write(frame)
            writer.release()

            client = TestClient(app)
            with input_path.open("rb") as video:
                response = client.post(
                    "/api/v1/sessions/monitor/upload",
                    files={"video": ("input.mp4", video, "video/mp4")},
                    data={"exercise": "squat", "track_arm": "right"},
                )
            self.assertEqual(response.status_code, 202, response.text)

            deadline = time.monotonic() + 30
            while time.monotonic() < deadline:
                status = monitor_engine.status()
                if status["phase"] in {"completed", "error"}:
                    break
                time.sleep(0.2)

            status = monitor_engine.status()
            self.assertEqual(status["phase"], "completed", status)
            self.assertTrue(status["has_frame"])
            self.assertTrue(status["has_result_video"])
            self.assertFalse(status["telegram_enabled"])

            result = client.get("/api/v1/sessions/monitor/result")
            self.assertEqual(result.status_code, 200, result.text)
            self.assertEqual(result.headers["content-type"], "video/webm")
            self.assertGreater(len(result.content), 0)

            result_path = monitor_engine.result_path()
            if result_path:
                result_path.unlink(missing_ok=True)


if __name__ == "__main__":
    unittest.main()
