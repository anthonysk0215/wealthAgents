"""
WealthAgents — ASI:One LLM helper.

call_llm(system, user, OutputModel) → OutputModel

Also exports Insight — a tiny single-field model used by Layer 1 agents
to get an AI-generated summary once they've done their math.
"""
from __future__ import annotations

import json
import os
from typing import Type, TypeVar

import httpx
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

_BASE_URL = os.getenv("ASI_ONE_BASE_URL", "https://api.asi1.ai/v1")
_MODEL = os.getenv("ASI_ONE_MODEL", "asi1-mini")


class Insight(BaseModel):
    """Single-sentence analyst insight returned by Layer 1 LLM calls."""
    summary: str


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    output_model: Type[T],
    temperature: float = 0.4,
) -> T:
    """
    Call ASI:One chat completions and parse the JSON response into output_model.

    Raises:
      RuntimeError          if ASI_ONE_API_KEY is missing
      httpx.HTTPStatusError if the API returns a non-2xx status
      pydantic.ValidationError if the response can't be parsed into output_model
    """
    api_key = os.getenv("ASI_ONE_API_KEY", "")
    if not api_key:
        raise RuntimeError("ASI_ONE_API_KEY is not set. Add it to backend/.env")

    schema_str = json.dumps(output_model.model_json_schema(), indent=2)
    full_system = (
        f"{system_prompt}\n\n"
        f"You MUST respond with a JSON object matching this schema exactly:\n"
        f"{schema_str}\n"
        f"Return ONLY the JSON object. No markdown fences, no explanation."
    )

    async with httpx.AsyncClient(timeout=90.0) as client:
        resp = await client.post(
            f"{_BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": _MODEL,
                "messages": [
                    {"role": "system", "content": full_system},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": temperature,
            },
        )
        resp.raise_for_status()

    content: str = resp.json()["choices"][0]["message"]["content"].strip()

    if content.startswith("```"):
        content = "\n".join(
            line for line in content.splitlines()
            if not line.strip().startswith("```")
        ).strip()

    return output_model.model_validate_json(content)
