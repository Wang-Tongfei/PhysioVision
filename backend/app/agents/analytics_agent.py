"""Analytics Agent (historical trends & clinic KPIs).

INPUTS
  - Aggregated session metrics per patient / clinic / time range
  - Appointment & subscription data

OUTPUTS
  - Recovery trend charts (ROM, quality, adherence over time)
  - Clinic-level KPIs (active patients, sessions/day, alert rate)
  - Cohort insights for protocol benchmarking

DECISION LOGIC
  Rolling-window aggregation + linear trend on quality/ROM.
  Flags patients with stalled or regressing recovery for outreach.

INTERACTION
  Serves the dashboard "Historical Trends" and "Clinic Analytics" widgets
  via the /analytics endpoints. Pre-aggregates into Redis for fast reads.
"""
from typing import Dict, Any, List


def recovery_trend(sessions: List[Dict[str, Any]]) -> Dict[str, Any]:
    quality = [s.get("movement_quality_score", 0) for s in sessions]
    rom = [s.get("rom_achieved_deg", 0) for s in sessions]
    return {
        "agent": "analytics",
        "quality_trend": quality,
        "rom_trend": rom,
        "slope_quality": _slope(quality),
    }


def _slope(values: List[float]) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    xs = list(range(n))
    mx = sum(xs) / n
    my = sum(values) / n
    num = sum((xs[i] - mx) * (values[i] - my) for i in range(n))
    den = sum((xs[i] - mx) ** 2 for i in range(n))
    return round(num / den, 3) if den else 0.0
