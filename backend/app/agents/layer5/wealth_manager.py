"""
Wealth Manager - Layer 5.

Final synthesis agent. Uses deterministic guardrails for numbers that must be
exact, and ASI:One for the user-facing headline, health score, and milestones.
"""
from __future__ import annotations

import json
from typing import Any, List

from pydantic import BaseModel, Field

try:
    from app.llm import call_llm
    from app.schemas import (
        AllocationPlan,
        DebateVerdict,
        FinalRiskDecision,
        Layer1Reports,
        Milestone,
        NextThousand,
        UserProfile,
        WealthPlan,
    )
except ModuleNotFoundError:  # Supports running from backend/app as the app root.
    from llm import call_llm
    from schemas import (
        AllocationPlan,
        DebateVerdict,
        FinalRiskDecision,
        Layer1Reports,
        Milestone,
        NextThousand,
        UserProfile,
        WealthPlan,
    )


class _WealthNarrative(BaseModel):
    headline: str = Field(description="One personalized sentence")
    health_score: float = Field(ge=0.0, le=100.0)
    milestones_12mo: List[Milestone]
    milestones_5yr: List[Milestone]


_SYSTEM = (
    "You are the Wealth Manager, the final decision-maker in a multi-agent "
    "financial planning firm. Synthesize the prior agent outputs into a clear, "
    "personalized plan. You must use the supplied final_allocation and "
    "next_thousand numbers as fixed facts; do not alter them. Produce a concise "
    "headline, a defensible health_score from 0-100, 4-6 concrete 12-month "
    "milestones, and 3-5 concrete 5-year milestones. Milestones should include "
    "specific dollar targets or outcomes, not vague advice."
)


def _round_money(value: float) -> float:
    return round(value, 2)


def _next_thousand(final_allocation: AllocationPlan) -> NextThousand:
    values = {
        "emergency_fund": final_allocation.cash_emergency_pct * 10,
        "roth_ira": final_allocation.retirement_pct * 10,
        "taxable_investing": final_allocation.investing_pct * 10,
        "house_fund": final_allocation.house_fund_pct * 10,
        "discretionary": final_allocation.speculative_pct * 10,
    }

    rounded = {key: _round_money(value) for key, value in values.items()}
    difference = _round_money(1000.0 - sum(rounded.values()))
    rounded["taxable_investing"] = _round_money(rounded["taxable_investing"] + difference)

    return NextThousand(**rounded)


def _health_score_seed(
    profile: UserProfile,
    layer1: Layer1Reports,
    risk: FinalRiskDecision,
) -> float:
    score = 50.0
    score += min(max(layer1.cash_flow.savings_rate, 0), 50) * 0.35
    score += 10.0 if profile.debt_amount <= 0 else max(0.0, 10.0 - profile.debt_interest_rate)
    score += 8.0 if layer1.retirement.captures_full_match else 0.0
    score += 5.0 if layer1.retirement.roth_ira_eligible else 0.0
    score += 7.0 if layer1.housing.feasible else -6.0

    emergency_months = profile.current_savings / max(profile.monthly_expenses, 1)
    score += min(emergency_months, 6.0) / 6.0 * 10.0

    # risk_score is 0-10, where 10 is highest risk.
    score -= max(risk.risk_score - 5.0, 0.0) * 2.0

    return round(max(0.0, min(100.0, score)), 1)


def _context(
    profile: UserProfile,
    layer1: Layer1Reports,
    verdict: DebateVerdict,
    allocation: AllocationPlan,
    risk: FinalRiskDecision,
    next_thousand: NextThousand,
    health_score_seed: float,
) -> dict[str, Any]:
    return {
        "profile": profile.model_dump(),
        "layer1_reports": layer1.model_dump(),
        "debate_verdict": verdict.model_dump(),
        "layer3_proposed_allocation": allocation.model_dump(),
        "layer4_final_risk_decision": risk.model_dump(),
        "fixed_final_allocation": risk.final_allocation.model_dump(),
        "fixed_next_thousand": next_thousand.model_dump(),
        "health_score_seed": health_score_seed,
        "instructions": {
            "headline": "One punchy sentence capturing the user's financial personality.",
            "health_score": "Use health_score_seed as the anchor; adjust only if upstream evidence strongly supports it.",
            "milestones_12mo": "Use month values 1-12. Include 4-6 items.",
            "milestones_5yr": "Use year values. Include 3-5 items.",
        },
    }


async def run_wealth_manager(
    profile: UserProfile,
    layer1: Layer1Reports,
    verdict: DebateVerdict,
    allocation: AllocationPlan,
    risk: FinalRiskDecision,
) -> WealthPlan:
    final_allocation = risk.final_allocation
    next_thousand = _next_thousand(final_allocation)
    health_score_seed = _health_score_seed(profile, layer1, risk)
    user_prompt = json.dumps(
        _context(
            profile=profile,
            layer1=layer1,
            verdict=verdict,
            allocation=allocation,
            risk=risk,
            next_thousand=next_thousand,
            health_score_seed=health_score_seed,
        ),
        indent=2,
    )

    narrative = await call_llm(
        system_prompt=_SYSTEM,
        user_prompt=user_prompt,
        output_model=_WealthNarrative,
        temperature=0.5,
    )

    return WealthPlan(
        headline=narrative.headline,
        health_score=round(max(0.0, min(100.0, narrative.health_score)), 1),
        final_allocation=final_allocation,
        next_thousand=next_thousand,
        milestones_12mo=narrative.milestones_12mo,
        milestones_5yr=narrative.milestones_5yr,
    )
