"""Integration with the physiosight engine package (no camera or video needed)."""
import sys
import threading
import unittest
from pathlib import Path
from types import SimpleNamespace

import cv2
import numpy as np
from fastapi.testclient import TestClient

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from physiosight.pipeline import analyze_sequence  # noqa: E402
from physiosight.session.models import Session  # noqa: E402
from physiosight.testing import synth  # noqa: E402

from app.api.v1.endpoints.auth import current_user  # noqa: E402
from app.core.database import Base, SessionLocal, engine  # noqa: E402
from app.models.patient import Patient  # noqa: E402
from app.services.monitor_engine import (  # noqa: E402
    BrowserFrameSource,
    MonitorEngine,
    _load_vision,
    rom_from_session,
)
from main import app  # noqa: E402


class EnginePackageTest(unittest.TestCase):
    def test_engine_comes_from_the_installed_package(self):
        vision = _load_vision()
        self.assertTrue(vision.Analysis.__module__.startswith("physiosight."))
        self.assertFalse(any("Physio_AI_Bot" in p for p in sys.path))
        self.assertTrue(vision.model_path(vision.POSE_MODEL).is_file())

    def test_rom_comes_from_per_repetition_angles(self):
        # 3 squats from 176 deg (standing) to 90 deg interior knee angle
        session = analyze_sequence(synth.render(synth.squat_script(3, depth=90)), "squat", 10).session
        self.assertEqual(session.summary.achieved, 3)
        # peak knee flexion = 180 - 90
        self.assertAlmostEqual(rom_from_session(session, [1.0, 2.0]), 90.0, delta=1.0)

    def test_rom_falls_back_to_the_live_metric_without_reps(self):
        session = analyze_sequence(synth.render(synth.squat_script(0)), "squat", 10).session
        self.assertEqual(rom_from_session(session, [170.0, 150.0]), 20.0)
        plank = analyze_sequence(synth.render(synth.plank_script(2)), "plank", 30).session
        self.assertEqual(rom_from_session(plank, [170.0, 172.0]), 171.0)

    def test_browser_frames_get_increasing_timestamps(self):
        source = BrowserFrameSource(cv2, threading.Event())
        ok, jpeg = cv2.imencode(".jpg", np.zeros((48, 64, 3), np.uint8))
        self.assertTrue(ok)
        frames = source.frames()
        times = []
        for received_at in (100.0, 100.1, 100.1):
            source.push(jpeg.tobytes(), received_at=received_at)
            t, frame = next(frames)
            times.append(t)
        self.assertEqual(frame.shape[:2], (48, 64))
        self.assertEqual(times[0], 0.0)
        self.assertAlmostEqual(times[1], 0.1)
        self.assertGreater(times[2], times[1])
        source.close()


class StoredAnalysisTest(unittest.TestCase):
    def setUp(self):
        Base.metadata.create_all(bind=engine)
        with SessionLocal() as db:
            patient = Patient(full_name="Synthetic Patient", clinic_id=9301)
            db.add(patient)
            db.commit()
            self.patient_id = patient.id

    def tearDown(self):
        app.dependency_overrides.clear()

    def test_session_document_is_persisted_and_served_to_the_same_clinic_only(self):
        session = analyze_sequence(synth.render(synth.squat_script(2)), "squat", 10).session
        telemetry = {
            "movement_quality_score": 90.0, "fatigue_index": 0.0, "compensation_detected": False,
            "total_reps": 2, "rom_achieved_deg": rom_from_session(session, []), "rom_target_deg": 80.0,
        }
        row_id = MonitorEngine._persist_summary(
            patient_id=self.patient_id, exercise="squat", source_kind="upload", completed=True,
            started_at=session.created_at, telemetry=telemetry, risk=None, therapist=None,
            valid_data=True, clinic_id=9301, analysis=session.model_dump(mode="json"),
        )
        self.assertIsNotNone(row_id)

        client = TestClient(app)
        app.dependency_overrides[current_user] = lambda: SimpleNamespace(id=1, clinic_id=9301, is_active=True)
        response = client.get(f"/api/v1/sessions/{row_id}/analysis")
        self.assertEqual(response.status_code, 200, response.text)
        stored = Session.model_validate(response.json())
        self.assertEqual(stored.session_id, session.session_id)
        self.assertEqual(stored.summary.achieved, 2)

        app.dependency_overrides[current_user] = lambda: SimpleNamespace(id=2, clinic_id=9302, is_active=True)
        self.assertEqual(client.get(f"/api/v1/sessions/{row_id}/analysis").status_code, 404)


if __name__ == "__main__":
    unittest.main()
