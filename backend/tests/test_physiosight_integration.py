"""Integration with the physiosight engine package (no camera or video needed)."""
import sys
import threading
import unittest
from pathlib import Path

import cv2
import numpy as np

BACKEND_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_ROOT))

from physiosight.pipeline import analyze_sequence  # noqa: E402
from physiosight.testing import synth  # noqa: E402

from app.services.monitor_engine import BrowserFrameSource, _load_vision  # noqa: E402
from app.services.session_records import fatigue_from_session, rom_from_session  # noqa: E402


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

    @staticmethod
    def _squats(paces: list[float]):
        """Squats whose descent and ascent each take ``pace`` seconds, one per entry."""
        stand = {"knee_l": 176.0, "knee_r": 176.0}
        moves = [(1.0, stand)]
        for pace in paces:
            moves += [(pace, {"knee_l": 85.0, "knee_r": 85.0}), (0.3, {}), (pace, stand), (0.6, {})]
        script = synth.Script("squat", stand, moves)
        return analyze_sequence(synth.render(script), "squat", 50, stop_at_target=False).session

    def test_fatigue_is_within_set_velocity_loss(self):
        slowing = self._squats([0.8, 0.8, 1.0, 1.2, 1.4, 1.6])
        self.assertEqual(slowing.summary.achieved, 6)
        # angular velocity ~ range / (2*pace + 0.3): last reps ~45% slower than the first
        self.assertGreater(fatigue_from_session(slowing), 35.0)
        steady = self._squats([1.0] * 6)
        self.assertLess(fatigue_from_session(steady), 3.0)

    def test_fatigue_is_none_when_not_estimable(self):
        self.assertIsNone(fatigue_from_session(self._squats([1.0] * 3)))  # fewer than 4 valid reps
        plank = analyze_sequence(synth.render(synth.plank_script(2)), "plank", 30).session
        self.assertIsNone(fatigue_from_session(plank))

    def test_agents_accept_an_unknown_fatigue_index(self):
        from app.agents.coach_agent import coach
        from app.agents.risk_agent import assess

        telemetry = {"movement_quality_score": 90, "fatigue_index": None, "compensation_detected": False,
                     "rom_achieved_deg": 80, "rom_target_deg": 80}
        risk = assess(telemetry, base_risk=10)
        self.assertEqual(risk["tier"], "low")
        self.assertEqual(coach(telemetry, risk_tier=risk["tier"])["severity"], "info")

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


if __name__ == "__main__":
    unittest.main()
