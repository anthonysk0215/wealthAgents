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
        AnalystReports,
        DebateVerdict,
        FinalRiskDecision,
        Layer1Reports,
        Milestone,
        NextThousand,
        PlanInsights,
        UserProfile,
        WealthPlan,
    )
except ModuleNotFoundError:  # Supports running from backend/app as the app root.
    from llm import call_llm
    from schemas import (
        AllocationPlan,
        AnalystReports,
        DebateVerdict,
        FinalRiskDecision,
        Layer1Reports,
        Milestone,
        NextThousand,
        PlanInsights,
        UserProfile,
        WealthPlan,
    )


class _WealthNarrative(BaseModel):
    headline: str = Field(description="One personalized sentence")
    health_score: float = Field(ge=0.0, le=100.0)
    milestones_12mo: List[Milestone]
    milestones_5yr: List[Milestone]


_SALARY_GROWTH = {"conservative": 0.03, "moderate": 0.04, "moderate_aggressive": 0.05, "aggressive": 0.06}

_SYSTEM = (
    "You are the Wealth Manager, the final decision-maker in a multi-agent "
    "financial planning firm. Synthesize prior agent outputs into a personalized plan. "
    "Use final_allocation and next_thousand numbers as fixed facts — do not alter them.\n\n"
    "For milestones_12mo: produce 6-8 items covering months 1-12 in order. "
    "Each item MUST include:\n"
    "  - label: the goal name (brief)\n"
    "  - target_metric: a specific dollar amount, percentage, or account balance\n"
    "  - action: the exact step (e.g. 'Open Fidelity account, set $X auto-invest into VTI on payday')\n"
    "  - career_note (optional): a career-growth tip (e.g. 'When salary hits $X, bump investing to $Y/mo')\n"
    "  - month: 1-12\n\n"
    "For milestones_5yr: produce 4-5 items. Each must include label, target_metric, "
    "action (what to do to hit this milestone), and year (1-5).\n\n"
    "Milestones must reference the user's specific numbers — actual dollar amounts, "
    "account names, ETF tickers, salary growth projections. No generic advice."
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


def _career_projection(profile: UserProfile, layer1: Layer1Reports) -> dict[str, Any]:
    rate = _SALARY_GROWTH.get(profile.risk_tolerance, 0.04)
    surplus = layer1.cash_flow.monthly_surplus
    return {
        "growth_rate_pct": round(rate * 100, 1),
        "salary_in_1yr": round(profile.annual_salary * (1 + rate), 0),
        "salary_in_3yr": round(profile.annual_salary * (1 + rate) ** 3, 0),
        "salary_in_5yr": round(profile.annual_salary * (1 + rate) ** 5, 0),
        "monthly_surplus_now": round(surplus, 0),
        "monthly_surplus_in_1yr": round(surplus * (1 + rate), 0),
        "monthly_surplus_in_3yr": round(surplus * (1 + rate) ** 3, 0),
        "note": (
            f"At {rate*100:.0f}%/yr growth, salary goes from ${profile.annual_salary:,.0f} "
            f"→ ${profile.annual_salary*(1+rate)**3:,.0f} in 3 years. "
            f"Monthly surplus grows from ${surplus:,.0f} → ${surplus*(1+rate)**3:,.0f}."
        ),
    }


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
        "layer1_analyst_summaries": {
            "cash_flow": layer1.cash_flow.summary,
            "retirement": layer1.retirement.summary,
            "housing": layer1.housing.summary,
            "investment": layer1.investment.summary,
        },
        "layer1_key_numbers": {
            "monthly_surplus": layer1.cash_flow.monthly_surplus,
            "savings_rate_pct": layer1.cash_flow.savings_rate,
            "recommended_401k_pct": layer1.retirement.recommended_401k_pct,
            "annual_retirement_contribution": layer1.retirement.annual_retirement_contribution,
            "roth_ira_eligible": layer1.retirement.roth_ira_eligible,
            "housing_feasible": layer1.housing.feasible,
            "years_to_down_payment": layer1.housing.years_to_down_payment,
            "equity_pct": layer1.investment.equity_pct,
            "recommended_etfs": layer1.investment.recommended_etfs,
        },
        "debate_verdict": verdict.model_dump(),
        "layer4_final_risk_decision": {
            "risk_score": risk.risk_score,
            "warnings": risk.warnings,
            "summary": risk.summary,
        },
        "fixed_final_allocation": risk.final_allocation.model_dump(),
        "fixed_next_thousand": next_thousand.model_dump(),
        "career_projection": _career_projection(profile, layer1),
        "health_score_seed": health_score_seed,
        "instructions": {
            "headline": "One punchy sentence capturing the user's financial personality.",
            "health_score": "Use health_score_seed as anchor; adjust ±5 only with strong evidence.",
            "milestones_12mo": (
                "6-8 items, months 1-12. Each needs: label, target_metric (exact $), "
                "action (specific step with account/ETF names and dollar amounts), "
                "career_note where career growth applies."
            ),
            "milestones_5yr": (
                "4-5 items, years 1-5. Each needs: label, target_metric, "
                "action (how to reach it), year. Reference career salary projections."
            ),
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
        max_tokens=2500,
    )

    return WealthPlan(
        headline=narrative.headline,
        health_score=round(max(0.0, min(100.0, narrative.health_score)), 1),
        final_allocation=final_allocation,
        next_thousand=next_thousand,
        milestones_12mo=narrative.milestones_12mo,
        milestones_5yr=narrative.milestones_5yr,
        analyst_reports=AnalystReports(
            cash_flow=layer1.cash_flow.summary,
            retirement=layer1.retirement.summary,
            housing=layer1.housing.summary,
            investment=layer1.investment.summary,
        ),
        plan_insights=PlanInsights(
            bull_wins_on=verdict.bull_wins_on,
            bear_wins_on=verdict.bear_wins_on,
            aggression_dial=verdict.aggression_dial,
            verdict_summary=verdict.summary,
            allocator_summary=allocation.summary,
            risk_score=risk.risk_score,
            risk_summary=risk.summary,
            risk_warnings=risk.warnings,
        ),
    )
