"""Rehab Coach Agent (patient-facing).

INPUTS
  - movement_quality_score, ROM vs target, compensation flag
  - exercise instructions & gamification state (badges, streak)

OUTPUTS
  - Real-time coaching cues ("lower your knee", "slow down")
  - Encouragement & reward badges
  - Avatar-mode guidance text

DECISION LOGIC
  Rule-based cues prioritised by safety, then quality, then engagement.
  Fatigue > 70 -> suggest rest. Compensation -> form cue. Low ROM -> reach cue.

INTERACTION
  Publishes lightweight text/audio cues to the patient display (Raspberry Pi
  screen / web patient view). Reads gamification state to award badges.
"""
from typing import Dict, Any, List


def coach(telemetry: Dict[str, Any]) -> Dict[str, Any]:
    fatigue = telemetry.get("fatigue_index", 0)
    comp = telemetry.get("compensation_detected", False)
    rom_a = telemetry.get("rom_achieved_deg", 0)
    rom_t = telemetry.get("rom_target_deg", 1)
    cues: List[str] = []
    if fatigue > 70:
        cues.append("Take a short rest — you're showing signs of fatigue.")
    if comp:
        cues.append("Keep your torso steady and avoid leaning.")
    if rom_a < rom_t * 0.8:
        cues.append("Reach a little further within your comfortable range.")
    if not cues:
        cues.append("Excellent form — keep the rhythm steady.")
    return {"agent": "rehab_coach", "cues": cues, "badge": "consistency_streak"}
