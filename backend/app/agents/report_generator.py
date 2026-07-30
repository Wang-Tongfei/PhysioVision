"""Report generator agent (stub).

Intended to synthesize patient/session data into a structured assessment
report (summary, findings, recommendations, risk score). Not yet implemented.
"""
from app.agents.base import BaseAgent


class ReportGeneratorAgent(BaseAgent):
    name = "report_generator"
    description = (
        "Generates patient assessment / progress reports with findings "
        "and recommendations."
    )

    async def run(self, target_id: int, **kwargs) -> dict:  # noqa: D102
        # TODO: integrate LLM / templating pipeline.
        raise NotImplementedError("ReportGeneratorAgent not yet implemented.")
