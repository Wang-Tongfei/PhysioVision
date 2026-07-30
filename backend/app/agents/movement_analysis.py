"""Movement analysis agent (stub).

Intended to consume session telemetry / video and produce movement-quality
metrics (range of motion, symmetry, pain). Not yet implemented.
"""
from app.agents.base import BaseAgent


class MovementAnalysisAgent(BaseAgent):
    name = "movement_analysis"
    description = (
        "Analyzes session video/telemetry to score range of motion, "
        "symmetry and pain."
    )

    async def run(self, target_id: int, **kwargs) -> dict:  # noqa: D102
        # TODO: integrate pose-estimation / vision model.
        raise NotImplementedError("MovementAnalysisAgent not yet implemented.")
