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


def summarize(
    telemetry: Dict[str, Any],
    baseline_quality: float = 80.0,
    risk: Dict[str, Any] | None = None,
) -> Dict[str, Any]:
    quality = telemetry.get("movement_quality_score", 0)
    risk = risk or {"risk_score": 0, "tier": "low"}
    needs_review = quality < 0.7 * baseline_quality or risk["tier"] == "high"
    delta = round(quality - baseline_quality, 1)
    suggested_plan = (
        "Pause progression and review safety before the next session."
        if needs_review
        else "Maintain the current prescription."
        if delta < 5
        else "Consider gradual progression after therapist review."
    )
    return {
        "agent": "therapist_assistant",
        "needs_review": needs_review,
        "summary": (
            f"Session quality {quality:.1f}/100 ({delta:+.1f} vs baseline); "
            f"risk {risk['tier']} at {risk['risk_score']:.1f}/100."
        ),
        "baseline_quality": baseline_quality,
        "quality_delta": delta,
        "risk_factors": ["compensation"] if telemetry.get("compensation_detected") else [],
        "suggested_plan": suggested_plan,
    }
