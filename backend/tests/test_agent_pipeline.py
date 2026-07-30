import unittest

from app.agents.coach_agent import coach
from app.agents.risk_agent import assess
from app.agents.therapist_agent import summarize
from app.agents.soap_agent import draft_soap


class AgentPipelineTest(unittest.TestCase):
    def test_soap_has_stable_template_without_foundry_credentials(self):
        result = draft_soap(
            {
                "movement_quality_score": 82,
                "rom_achieved_deg": 72,
                "rom_target_deg": 70,
                "total_reps": 10,
            },
            subjective="Mild fatigue after the final set.",
        )

        self.assertEqual(result["generation_mode"], "template")
        self.assertEqual(
            set(result["soap"]),
            {"subjective", "objective", "assessment", "plan"},
        )

    def test_low_risk_session_produces_positive_coaching(self):
        telemetry = {
            "movement_quality_score": 95,
            "fatigue_index": 5,
            "compensation_detected": False,
            "rom_achieved_deg": 75,
            "rom_target_deg": 70,
        }
        risk = assess(telemetry, base_risk=10)
        result = coach(telemetry, risk_tier=risk["tier"])

        self.assertEqual(risk["tier"], "low")
        self.assertEqual(result["severity"], "info")
        self.assertFalse(result["pause_required"])

    def test_high_risk_session_requires_review_and_pause(self):
        telemetry = {
            "movement_quality_score": 20,
            "fatigue_index": 90,
            "compensation_detected": True,
            "rom_achieved_deg": 20,
            "rom_target_deg": 70,
        }
        risk = assess(telemetry, base_risk=65)
        coaching = coach(telemetry, risk_tier=risk["tier"])
        therapist = summarize(telemetry, baseline_quality=80, risk=risk)

        self.assertEqual(risk["tier"], "high")
        self.assertTrue(coaching["pause_required"])
        self.assertEqual(coaching["severity"], "critical")
        self.assertTrue(therapist["needs_review"])
        self.assertIn("Pause progression", therapist["suggested_plan"])


if __name__ == "__main__":
    unittest.main()
