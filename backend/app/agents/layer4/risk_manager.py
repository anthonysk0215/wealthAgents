"""
Risk Manager — Layer 4.

Reads the three risk views (aggressive, neutral, conservative) and the
original allocation, then produces the final risk-adjusted AllocationPlan
along with a risk score and any actionable warnings.

Design:
  - Weighted average of the 3 views applied deterministically (no hallucination risk)
  - ASI:One generates the warnings, risk_score, and summary from the final numbers
"""
from __future__ import annotations

from typing import List

from pydantic import BaseModel

from app.llm import call_llm
from app.schemas import AllocationPlan, FinalRiskDecision, RiskView, UserProfile

# How much weight to give each stance based on the user's risk_tolerance
_WEIGHTS: dict[str, dict[str, float]] = {
    "conservative":        {"aggressive": 0.10, "neutral": 0.30, "conservative": 0.60},
    "moderate":            {"aggressive": 0.20, "neutral": 0.60, "conservative": 0.20},
    "moderate_aggressive": {"aggressive": 0.50, "neutral": 0.40, "conservative": 0.10},
    "aggressive":          {"aggressive": 0.70, "neutral": 0.25, "conservative": 0.05},
}

_BUCKETS = ["cash_emergency", "retirement", "investing", "house_fund", "speculative"]


class _RiskAssessment(BaseModel):
    risk_score: float
    warnings: List[str]
    summary: str


_SYSTEM = (
    "You are the Chief Risk Officer of a wealth management firm. "
    "You receive a final risk-adjusted allocation plan and must produce:\n"
    "1. A risk_score (0-10, where 10 = maximum risk) based on the speculative+investing % "
    "relative to the user's age, debt, savings cushion, and income stability.\n"
    "2. A warnings list: 2-4 concrete, actionable warnings the user should monitor. "
    "Examples: 'Emergency fund covers only 2.3 months — target 6 months before investing more.', "
    "'High speculative bucket relative to current savings cushion.'\n"
    "3. A summary: 1-2 sentences explaining the final plan's risk posture.\n"
    "Be specific — use dollar amounts and months, not vague generalities."
)


def _apply_weighted_adjustments(
    allocation: AllocationPlan,
    views: list[RiskView],
    weights: dict[str, float],
) -> dict[str, float]:
    """Apply weighted average of 3 risk views to base allocation. Returns final pct dict."""
    base = {
        "cash_emergency": allocation.cash_emergency_pct,
        "retirement":     allocation.retirement_pct,
        "investing":      allocation.investing_pct,
        "house_fund":     allocation.house_fund_pct,
        "speculative":    allocation.speculative_pct,
    }

    # Accumulate weighted adjustments
    weighted_adj = {b: 0.0 for b in _BUCKETS}
    for view in views:
        w = weights.get(view.stance, 0.0)
        for bucket, delta in view.adjustments.items():
            if bucket in weighted_adj:
                weighted_adj[bucket] += w * delta

    # Apply adjustments
    final = {b: base[b] + weighted_adj[b] for b in _BUCKETS}

    # Guardrails
    final["cash_emergency"] = max(final["cash_emergency"], 5.0)
    final["speculative"] = max(final["speculative"], 0.0)
    for b in _BUCKETS:
        final[b] = max(final[b], 0.0)

    # Normalize to 100%
    total = sum(final.values())
    if total > 0:
        final = {b: round(v / total * 100, 2) for b, v in final.items()}

    return final


async def run_risk_manager(
    profile: UserProfile,
    allocation: AllocationPlan,
    views: list[RiskView],
) -> FinalRiskDecision:
    weights = _WEIGHTS[profile.risk_tolerance]
    final_pcts = _apply_weighted_adjustments(allocation, views, weights)

    # Recompute monthly amounts from final %s × original surplus
    monthly_surplus = sum(allocation.monthly_amounts.values())
    monthly_amounts = {b: round(monthly_surplus * final_pcts[b] / 100, 2) for b in _BUCKETS}

    final_allocation = AllocationPlan(
        cash_emergency_pct=final_pcts["cash_emergency"],
        retirement_pct=final_pcts["retirement"],
        investing_pct=final_pcts["investing"],
        house_fund_pct=final_pcts["house_fund"],
        speculative_pct=final_pcts["speculative"],
        monthly_amounts=monthly_amounts,
        summary=allocation.summary,
    )

    months_emergency_covered = profile.current_savings / max(profile.monthly_expenses, 1)

    views_summary = "\n".join(
        f"  {v.stance}: adjustments={v.adjustments} | {v.reasoning[:120]}..."
        for v in views
    )

    user_prompt = (
        f"Profile: {profile.name}, {profile.age}yo {profile.occupation}, "
        f"risk_tolerance={profile.risk_tolerance}, salary=${profile.annual_salary:,.0f}, "
        f"debt=${profile.debt_amount:,.0f}, current savings=${profile.current_savings:,.0f} "
        f"({months_emergency_covered:.1f} months expenses covered)\n\n"
        f"Three risk views (weights: agg={weights['aggressive']:.0%}, "
        f"neu={weights['neutral']:.0%}, con={weights['conservative']:.0%}):\n"
        f"{views_summary}\n\n"
        f"Final risk-adjusted allocation (after weighted averaging):\n"
        f"  cash_emergency: {final_pcts['cash_emergency']:.1f}%  (${monthly_amounts['cash_emergency']:,.0f}/mo)\n"
        f"  retirement:     {final_pcts['retirement']:.1f}%  (${monthly_amounts['retirement']:,.0f}/mo)\n"
        f"  investing:      {final_pcts['investing']:.1f}%  (${monthly_amounts['investing']:,.0f}/mo)\n"
        f"  house_fund:     {final_pcts['house_fund']:.1f}%  (${monthly_amounts['house_fund']:,.0f}/mo)\n"
        f"  speculative:    {final_pcts['speculative']:.1f}%  (${monthly_amounts['speculative']:,.0f}/mo)\n\n"
        f"Produce risk_score (0-10), 2-4 actionable warnings, and a 1-2 sentence summary."
    )

    assessment = await call_llm(_SYSTEM, user_prompt, _RiskAssessment, temperature=0.4)

    risk_score = max(0.0, min(10.0, assessment.risk_score))

    return FinalRiskDecision(
        final_allocation=final_allocation,
        risk_score=round(risk_score, 1),
        warnings=assessment.warnings,
        summary=assessment.summary,
    )
