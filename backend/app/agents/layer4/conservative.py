"""
Conservative Risk Agent — Layer 4.

Argues for capital preservation: larger cash buffer, less speculation,
and reduced equity exposure relative to the allocator's plan.
"""
from __future__ import annotations

from schemas import AllocationPlan, RiskView, UserProfile


async def run_conservative_risk(
    profile: UserProfile,
    allocation: AllocationPlan,
) -> RiskView:
    """
    Propose downward risk adjustments to the allocator's plan.

    Inputs:
      - profile    → user context (debt, savings cushion, job security context)
      - allocation → proposed AllocationPlan from Layer 3

    Returns:
      RiskView(stance="conservative", adjustments={bucket: delta_pct}, reasoning)

    LLM prompt guidance:
      System: "You are a conservative risk analyst focused on capital preservation
      and downside protection. Propose shifts toward cash_emergency and away from
      speculative. Net adjustments must be zero. Do NOT push speculative below 0%
      or cash_emergency above 40%. Ground your reasoning in the user's specific
      risk factors (debt_amount, low current_savings, market volatility)."

      adjustments dict example: {"speculative": -3.0, "cash_emergency": 2.0, "house_fund": 1.0}
    """
    raise NotImplementedError(
        "run_conservative_risk not implemented. "
        "Replace this body with the ASI:One LLM call that returns RiskView."
    )
