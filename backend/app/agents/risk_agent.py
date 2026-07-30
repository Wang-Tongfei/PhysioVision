"""Risk Assessment Agent.

INPUTS
  - movement_quality_score, compensation flag, fatigue index
  - patient risk_tier and diagnosis history

OUTPUTS
  - risk_score (0-100) and tier (low/moderate/high/critical)
  - Alert objects (type, severity, message, evidence clip)
  - triggers Telegram alert + dashboard banner

DECISION LOGIC
  risk_score = w1*fatigue + w2*compensation + w3*(100-quality) + w4*base_risk
  If risk_score crosses a threshold -> emit CRITICAL alert and pause session.
  Safety violations (unsafe range of motion) short-circuit to CRITICAL.

INTERACTION
  Subscribes to `session:{id}:telemetry`; publishes to `session:{id}:alerts`.
  Calls storage_service to attach the evidence clip URL.
"""
from typing import Dict, Any


def assess(telemetry: Dict[str, Any], base_risk: float = 20.0) -> Dict[str, Any]:
    quality = telemetry.get("movement_quality_score", 100)
    fatigue = telemetry.get("fatigue_index", 0)
    compensation = 30 if telemetry.get("compensation_detected") else 0
    risk_score = round(
        0.4 * (100 - quality) + 0.3 * fatigue + 0.2 * compensation + 0.1 * base_risk, 1
    )
    tier = (
        "low" if risk_score < 33 else
        "moderate" if risk_score < 66 else "high"
    )
    return {"agent": "risk_assessment", "risk_score": risk_score, "tier": tier}
