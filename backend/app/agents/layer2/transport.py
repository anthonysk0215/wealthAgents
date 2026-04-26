"""
Layer 2 transport adapter.

Chooses between:
1) Local function calls (default/fallback)
2) uAgent network calls via Agentverse when USE_LAYER2_UAGENTS=true
"""
from __future__ import annotations

import json
import logging
import os
from typing import Any

from app.agents.layer2.bear import run_bear
from app.agents.layer2.bear_agent import BearRequest, BearResponse
from app.agents.layer2.bull import run_bull
from app.agents.layer2.bull_agent import BullRequest, BullResponse
from app.agents.layer2.facilitator import run_facilitator
from app.agents.layer2.facilitator_agent import FacilitatorRequest, FacilitatorResponse
from app.schemas import DebateRound, DebateVerdict, Layer1Reports, UserProfile

logger = logging.getLogger(__name__)


def _env_bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _layer2_enabled() -> bool:
    return _env_bool("USE_LAYER2_UAGENTS", default=False)


def _timeout_seconds() -> float:
    raw = os.getenv("LAYER2_AGENT_TIMEOUT_SECONDS", "25")
    try:
        return float(raw)
    except ValueError:
        return 25.0


def _extract_payload(raw: Any) -> Any:
    """
    Best-effort normalization for different uagents query response shapes.
    """
    if raw is None:
        raise ValueError("empty query response")

    # Most likely direct payload objects
    if isinstance(raw, dict):
        return raw.get("payload", raw)

    for attr in ("payload", "data", "message", "response"):
        if hasattr(raw, attr):
            value = getattr(raw, attr)
            if value is not None:
                raw = value
                break

    if isinstance(raw, (bytes, bytearray)):
        raw = raw.decode("utf-8")

    if isinstance(raw, str):
        return json.loads(raw)

    return raw


async def _query_model(address: str, request_model: Any, response_model: Any) -> Any:
    from uagents.query import query  # Imported lazily so local mode has no hard dependency at import time.

    raw = await query(destination=address, message=request_model, timeout=_timeout_seconds())
    payload = _extract_payload(raw)
    return response_model.model_validate(payload)


async def run_bull_transport(
    profile: UserProfile,
    layer1: Layer1Reports,
    prior_bear_rounds: list[DebateRound],
    round_number: int,
) -> DebateRound:
    if not _layer2_enabled():
        return await run_bull(profile, layer1, prior_bear_rounds, round_number)

    address = os.getenv("BULL_AGENT_ADDRESS", "").strip()
    if not address:
        logger.warning("USE_LAYER2_UAGENTS=true but BULL_AGENT_ADDRESS missing; falling back to local run_bull.")
        return await run_bull(profile, layer1, prior_bear_rounds, round_number)

    req = BullRequest(
        profile=profile.model_dump(),
        layer1=layer1.model_dump(),
        prior_bear_rounds=[r.model_dump() for r in prior_bear_rounds],
        round_number=round_number,
    )
    try:
        resp: BullResponse = await _query_model(address, req, BullResponse)
        if resp.error:
            raise RuntimeError(resp.error)
        return DebateRound(**resp.result)
    except Exception as exc:
        logger.warning(f"Layer 2 bull uAgent query failed; using local fallback. reason={exc}")
        return await run_bull(profile, layer1, prior_bear_rounds, round_number)


async def run_bear_transport(
    profile: UserProfile,
    layer1: Layer1Reports,
    prior_bull_rounds: list[DebateRound],
    round_number: int,
) -> DebateRound:
    if not _layer2_enabled():
        return await run_bear(profile, layer1, prior_bull_rounds, round_number)

    address = os.getenv("BEAR_AGENT_ADDRESS", "").strip()
    if not address:
        logger.warning("USE_LAYER2_UAGENTS=true but BEAR_AGENT_ADDRESS missing; falling back to local run_bear.")
        return await run_bear(profile, layer1, prior_bull_rounds, round_number)

    req = BearRequest(
        profile=profile.model_dump(),
        layer1=layer1.model_dump(),
        prior_bull_rounds=[r.model_dump() for r in prior_bull_rounds],
        round_number=round_number,
    )
    try:
        resp: BearResponse = await _query_model(address, req, BearResponse)
        if resp.error:
            raise RuntimeError(resp.error)
        return DebateRound(**resp.result)
    except Exception as exc:
        logger.warning(f"Layer 2 bear uAgent query failed; using local fallback. reason={exc}")
        return await run_bear(profile, layer1, prior_bull_rounds, round_number)


async def run_facilitator_transport(
    profile: UserProfile,
    bull_rounds: list[DebateRound],
    bear_rounds: list[DebateRound],
    layer1: Layer1Reports | None = None,
) -> DebateVerdict:
    if not _layer2_enabled():
        return await run_facilitator(profile, bull_rounds, bear_rounds, layer1=layer1)

    address = os.getenv("FACILITATOR_AGENT_ADDRESS", "").strip()
    if not address:
        logger.warning(
            "USE_LAYER2_UAGENTS=true but FACILITATOR_AGENT_ADDRESS missing; "
            "falling back to local run_facilitator."
        )
        return await run_facilitator(profile, bull_rounds, bear_rounds, layer1=layer1)

    req = FacilitatorRequest(
        profile=profile.model_dump(),
        bull_rounds=[r.model_dump() for r in bull_rounds],
        bear_rounds=[r.model_dump() for r in bear_rounds],
        layer1=layer1.model_dump() if layer1 is not None else None,
    )
    try:
        resp: FacilitatorResponse = await _query_model(address, req, FacilitatorResponse)
        if resp.error:
            raise RuntimeError(resp.error)
        return DebateVerdict(**resp.result)
    except Exception as exc:
        logger.warning(f"Layer 2 facilitator uAgent query failed; using local fallback. reason={exc}")
        return await run_facilitator(profile, bull_rounds, bear_rounds, layer1=layer1)
