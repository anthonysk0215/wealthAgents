"""
Layer 3 allocation insight agent.

This is the LLM-backed counterpart to the deterministic allocator. The
allocator owns the numeric split; this agent interprets whether that split
fits the user's profile, career trajectory, goals, and Layer 1 market context.
"""
from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field

try:
    from app.llm import call_llm
    from app.schemas import AllocationPlan, DebateVerdict, Layer1Reports, UserProfile
except ModuleNotFoundError:  # Supports running from backend/app as the app root.
    from llm import call_llm
    from schemas import AllocationPlan, DebateVerdict, Layer1Reports, UserProfile


class AllocationAdjustments(BaseModel):
    cash_emergency_pct: float = Field(description="Suggested delta to cash_emergency_pct")
    retirement_pct: float = Field(description="Suggested delta to retirement_pct")
    investing_pct: float = Field(description="Suggested delta to investing_pct")
    house_fund_pct: float = Field(description="Suggested delta to house_fund_pct")
    speculative_pct: float = Field(description="Suggested delta to speculative_pct")


class AllocationInsight(BaseModel):
    allocation_thesis: str
    career_trajectory: str
    goal_tradeoffs: str
    market_adjustments: list[str]
    risks: list[str]
    opportunities: list[str]
    recommended_adjustments: AllocationAdjustments
    summary: str


def build_llm_context(
    profile: UserProfile,
    layer1: Layer1Reports,
    verdict: DebateVerdict,
    allocation: AllocationPlan,
) -> dict[str, Any]:
    return {
        "profile": profile.model_dump(),
        "layer1_reports": layer1.model_dump(),
        "debate_verdict": verdict.model_dump(),
        "allocation_plan": allocation.model_dump(),
    }


async def run(
    profile: UserProfile,
    layer1: Layer1Reports,
    verdict: DebateVerdict,
    allocation: AllocationPlan,
) -> AllocationInsight:
    context = build_llm_context(profile, layer1, verdict, allocation)

    system_prompt = (
        "You are the Layer 3 allocation insight agent for WealthAgents. "
        "Use the allocation plan as the numeric source of truth. Do not "
        "recalculate percentages. Interpret the plan against the user's "
        "personal profile, career trajectory, primary goal, dream scenario, "
        "Layer 1 financial reports, Layer 1 market-enriched summaries, and "
        "Layer 2 debate verdict. Recommended adjustments must be percentage "
        "point deltas, not final allocations, and should usually sum near 0."
    )
    user_prompt = json.dumps(context, indent=2)

    return await call_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        output_model=AllocationInsight,
        temperature=0.4,
    )


async def run_allocation_insight(
    profile: UserProfile,
    layer1: Layer1Reports,
    verdict: DebateVerdict,
    allocation: AllocationPlan,
) -> AllocationInsight:
    return await run(profile, layer1, verdict, allocation)
