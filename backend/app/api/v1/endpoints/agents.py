"""AI Agent endpoints (stub).

Exposes the available agents and lets clients trigger them. Agent logic
lives in `app.agents`; these endpoints are thin orchestration stubs.
"""
from fastapi import APIRouter

from app.schemas.common import Message

router = APIRouter()


@router.get("")
async def list_agents() -> list[dict]:
    """List the registered AI agents and their capabilities."""
    # TODO: reflect over registered agents in app.agents
    return [
        {
            "name": "movement_analysis",
            "description": "Analyzes session video/telemetry to score range of motion, symmetry and pain.",
            "status": "stub",
        },
        {
            "name": "report_generator",
            "description": "Generates patient assessment / progress reports with findings and recommendations.",
            "status": "stub",
        },
    ]


@router.post("/run", response_model=Message)
async def run_agent(name: str, target_id: int) -> Message:
    """Trigger an agent by name against a target resource id."""
    # TODO: dispatch to the matching agent in app.agents
    return Message(
        detail=f"Agent '{name}' run against target {target_id} is not yet implemented."
    )
