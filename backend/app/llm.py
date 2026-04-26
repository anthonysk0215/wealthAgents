"""
WealthAgents — ASI:One LLM helper.

call_llm(system, user, OutputModel) → OutputModel

Also exports Insight — a tiny single-field model used by Layer 1 agents
to get an AI-generated summary once they've done their math.
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import re
from typing import Type, TypeVar

_log = logging.getLogger("wealthagents.llm")

import httpx
from pydantic import BaseModel

T = TypeVar("T", bound=BaseModel)

_BASE_URL = os.getenv("ASI_ONE_BASE_URL", "https://api.asi1.ai/v1")
_MODEL = os.getenv("ASI_ONE_MODEL", "asi1-mini")


class Insight(BaseModel):
    summary: str


async def call_llm(
    system_prompt: str,
    user_prompt: str,
    output_model: Type[T],
    temperature: float = 0.4,
    max_tokens: int = 600,
    _retries: int = 3,
) -> T:
    """
    Call ASI:One chat completions and parse the JSON response into output_model.
    Retries up to _retries times with exponential back-off on any failure.
    """
    last_err: Exception = RuntimeError("No attempts made")
    for attempt in range(1, _retries + 1):
        try:
            return await _call_llm_once(system_prompt, user_prompt, output_model, temperature, max_tokens)
        except Exception as e:
            last_err = e
            _log.warning("LLM attempt %d/%d failed: %s", attempt, _retries, e)
            if attempt < _retries:
                await asyncio.sleep(0.5)
    raise last_err


async def _call_llm_once(
    system_prompt: str,
    user_prompt: str,
    output_model: Type[T],
    temperature: float = 0.4,
    max_tokens: int = 600,
) -> T:
    api_key = os.getenv("ASI_ONE_API_KEY", "")
    if not api_key:
        raise RuntimeError("ASI_ONE_API_KEY is not set. Add it to backend/.env")

    schema_str = json.dumps(output_model.model_json_schema(), indent=2)
    full_system = (
        f"{system_prompt}\n\n"
        f"You MUST respond with a JSON object that is a FILLED-IN INSTANCE of the following schema. "
        f"Do NOT return the schema itself — return actual real values.\n\n"
        f"Schema:\n{schema_str}\n\n"
        f"Return ONLY the JSON object with real content values. "
        f"No markdown fences, no backticks, no schema definitions, no explanation."
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
                "max_tokens": max_tokens,
            },
        )
        resp.raise_for_status()

    body = resp.json()
    choices = body.get("choices", [])
    if not choices:
        import logging
        logging.getLogger("wealthagents.llm").error(
            "ASI:One returned no choices. Full response: %s", body
        )
        raise RuntimeError(
            f"LLM returned no choices — possible rate-limit or content filter. "
            f"Response: {str(body)[:300]}"
        )
    content: str = choices[0]["message"]["content"].strip()

    if content.startswith("```"):
        content = "\n".join(
            line for line in content.splitlines()
            if not line.strip().startswith("```")
        ).strip()

    # Strip control characters (\x00-\x08, \x0b, \x0c, \x0e-\x1f) that
    # appear inside LLM-generated JSON strings and cause parse failures.
    # \x09 (tab), \x0a (newline), \x0d (carriage-return) are kept as they
    # are valid JSON structural whitespace.
    content = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f]", "", content)

    return output_model.model_validate_json(content)


async def call_llm_with_retry(
    system_prompt: str,
    user_prompt: str,
    output_model: Type[T],
    temperature: float = 0.4,
    max_tokens: int = 600,
    retries: int = 3,
    backoff: float = 2.0,
) -> T:
    last_err: Exception = RuntimeError("No attempts made")
    for attempt in range(1, retries + 1):
        try:
            return await call_llm(system_prompt, user_prompt, output_model, temperature, max_tokens)
        except Exception as e:
            last_err = e
            _log.warning("LLM attempt %d/%d failed: %s", attempt, retries, e)
            if attempt < retries:
                await asyncio.sleep(backoff * attempt)
    raise last_err
