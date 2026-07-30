"""Therapist Assistant Agent (clinician decision support).

INPUTS
  - consolidated movement + risk outputs
  - patient history, prior sessions, prescriptions

OUTPUTS
  - Per-session clinical summary
  - Suggested plan adjustments (sets/reps/frequency)
  - Triage flags for therapist attention

DECISION LOGIC
  Compares session metrics to the patient's rolling baseline.
  Drops below 70% of baseline quality -> flag for therapist review.
  Steady improvement -> propose progression (increase ROM target / load).

INTERACTION
  Surfaces in the Dashboard right panel + AI Reports. Feeds the SOAP agent.
"""
from typing import Dict, Any


def summarize(telemetry: Dict[str, Any], baseline_quality: float = 80.0) -> Dict[str, Any]:
    quality = telemetry.get("movement_quality_score", 0)
    needs_review = quality < 0.7 * baseline_quality
    return {
        "agent": "therapist_assistant",
        "needs_review": needs_review,
        "suggested_plan": (
            "Maintain current prescription"
            if quality >= baseline_quality
            else "Reduce reps by 2, add form-focus cues"
        ),
    }
