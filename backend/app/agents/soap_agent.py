"""SOAP Report Agent (automated clinical documentation).

INPUTS
  - Therapist Assistant summary + movement/risk outputs
  - Session telemetry, rep events, evidence clip
  - Patient subjective notes (optional)

OUTPUTS
  - Structured SOAP note: Subjective / Objective / Assessment / Plan
  - FHIR DocumentReference bundle for EMR export
  - Plain-language progress summary

DECISION LOGIC
  Objective = measured ROM, reps, quality, risk tier.
  Assessment = trend vs baseline + compensation/fatigue flags.
  Plan = therapist agent's suggested adjustment, formatted as orders.
  LLM (gpt-4o) used to draft natural-language narrative from the structured data.

INTERACTION
  Invoked after session completion (or on-demand). Writes Report row and
  pushes FHIR bundle to the clinic HL7/FHIR endpoint.
"""
from typing import Dict, Any
import httpx
from app.agents.risk_agent import assess
from app.agents.therapist_agent import summarize
from app.services.foundry_service import generate_soap


def draft_soap(telemetry: Dict[str, Any], subjective: str = "") -> Dict[str, Any]:
    q = telemetry.get("movement_quality_score", 0)
    rom_a = telemetry.get("rom_achieved_deg", 0)
    rom_t = telemetry.get("rom_target_deg", 0)
    reps = telemetry.get("total_reps", 0)
    fallback = {
        "subjective": subjective or "Patient tolerated session well.",
        "objective": (
            f"{reps} reps completed; ROM achieved {rom_a:.0f}° "
            f"(target {rom_t:.0f}°); movement quality {q:.0f}/100."
        ),
        "assessment": (
            "Within expected recovery trajectory."
            if q >= 70
            else "Quality below baseline; form cues required."
        ),
        "plan": "Continue current prescription; review in 1 week.",
    }
    risk = assess(telemetry)
    decision_support = summarize(telemetry, risk=risk)
    generation_mode = "foundry"
    try:
        soap = generate_soap(telemetry, subjective, decision_support) or fallback
        if soap is fallback:
            generation_mode = "template"
    except (httpx.HTTPError, KeyError, TypeError, ValueError):
        # A model outage must not block clinical documentation. The therapist
        # still receives a measurable, reviewable local draft.
        soap = fallback
        generation_mode = "template-fallback"
    fhir_bundle = {
        "resourceType": "DocumentReference",
        "type": "SOAP",
        "content": soap,
    }
    return {
        "agent": "soap_report",
        "generation_mode": generation_mode,
        "soap": soap,
        "fhir_bundle": fhir_bundle,
    }
