"""AI agent orchestration via LangGraph.

Each agent is a node in a graph that consumes movement telemetry and emits
decisions / recommendations. The LLM calls are stubbed for offline demo.
"""
from typing import Dict, Any, List


class AgentContext:
    def __init__(self, telemetry: Dict[str, Any], patient: Dict[str, Any]):
        self.telemetry = telemetry
        self.patient = patient


def run_agent_graph(telemetry: Dict[str, Any], patient: Dict[str, Any]) -> Dict[str, Any]:
    """Execute the agent pipeline: movement -> risk -> coach -> therapist.

    Returns a consolidated decision bundle for the dashboard + EMR.
    """
    ctx = AgentContext(telemetry, patient)
    movement = analyze_movement(ctx)
    risk = assess_risk(ctx, movement)
    coach = coach_patient(ctx, movement, risk)
    therapist = summarize_for_therapist(ctx, movement, risk, coach)
    return {
        "movement": movement,
        "risk": risk,
        "coach": coach,
        "therapist_summary": therapist,
    }


def analyze_movement(ctx: AgentContext) -> Dict[str, Any]:
    t = ctx.telemetry
    return {
        "movement_quality_score": t.get("movement_quality_score", 0),
        "rom_achieved_deg": t.get("rom_achieved_deg", 0),
        "rom_target_deg": t.get("rom_target_deg", 0),
        "total_reps": t.get("total_reps", 0),
        "compensation_detected": t.get("compensation_detected", False),
        "notes": "Pose estimation and joint-angle analysis completed.",
    }


def assess_risk(ctx: AgentContext, movement: Dict[str, Any]) -> Dict[str, Any]:
    risk_score = ctx.telemetry.get("risk_score", 0)
    tier = "low" if risk_score < 33 else "moderate" if risk_score < 66 else "high"
    return {
        "risk_score": risk_score,
        "tier": tier,
        "factors": ["compensation"] if movement["compensation_detected"] else [],
    }


def coach_patient(ctx: AgentContext, movement: Dict[str, Any], risk: Dict[str, Any]) -> Dict[str, Any]:
    tips: List[str] = []
    if movement["compensation_detected"]:
        tips.append("Keep your torso still and avoid leaning to one side.")
    if movement["rom_achieved_deg"] < movement["rom_target_deg"] * 0.8:
        tips.append("Try to reach a little further within your pain-free range.")
    tips.append("Breathe steadily and maintain a neutral spine.")
    return {"tips": tips, "encouragement": "Great progress today — keep it up!"}


def summarize_for_therapist(
    ctx: AgentContext, movement: Dict[str, Any], risk: Dict[str, Any], coach: Dict[str, Any]
) -> str:
    return (
        f"Patient {ctx.patient.get('full_name', 'unknown')} completed "
        f"{movement['total_reps']} reps with a movement quality score of "
        f"{movement['movement_quality_score']}/100. Risk tier: {risk['tier']}. "
        f"Recommendation: {coach['tips'][0] if coach['tips'] else 'maintain current plan'}."
    )
