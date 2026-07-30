"""Small Microsoft Foundry model gateway used by clinical documentation."""
from __future__ import annotations

import json

import httpx

from app.core.config import settings


SOAP_SCHEMA = {
    "type": "object",
    "properties": {
        "subjective": {"type": "string"},
        "objective": {"type": "string"},
        "assessment": {"type": "string"},
        "plan": {"type": "string"},
    },
    "required": ["subjective", "objective", "assessment", "plan"],
    "additionalProperties": False,
}


def foundry_configured() -> bool:
    return bool(
        settings.AZURE_OPENAI_ENDPOINT
        and settings.AZURE_OPENAI_API_KEY
        and settings.AZURE_OPENAI_DEPLOYMENT
    )


def generate_soap(telemetry: dict, subjective: str, decision_support: dict) -> dict | None:
    """Return a schema-constrained SOAP draft, or None when Foundry is disabled."""
    if not foundry_configured():
        return None

    base = settings.AZURE_OPENAI_ENDPOINT.rstrip("/")
    if not base.endswith("/openai/v1"):
        base = f"{base}/openai/v1"
    response = httpx.post(
        f"{base}/chat/completions",
        headers={
            "api-key": settings.AZURE_OPENAI_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "model": settings.AZURE_OPENAI_DEPLOYMENT,
            "temperature": 0.1,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "Draft a concise physiotherapy SOAP note from supplied facts. "
                        "Do not invent diagnoses, symptoms, measurements, or treatment "
                        "orders. The output is a draft requiring therapist review."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "patient_subjective": subjective,
                            "session_telemetry": telemetry,
                            "decision_support": decision_support,
                        },
                        ensure_ascii=False,
                    ),
                },
            ],
            "response_format": {
                "type": "json_schema",
                "json_schema": {
                    "name": "physiotherapy_soap_note",
                    "strict": True,
                    "schema": SOAP_SCHEMA,
                },
            },
        },
        timeout=30.0,
    )
    response.raise_for_status()
    content = response.json()["choices"][0]["message"]["content"]
    result = json.loads(content)
    if set(result) != set(SOAP_SCHEMA["required"]):
        raise ValueError("Foundry SOAP response did not match the required schema")
    return result
