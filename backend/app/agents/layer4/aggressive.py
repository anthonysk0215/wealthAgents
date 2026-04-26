"""
Aggressive Risk Agent — Layer 4.

Argues for increasing upside exposure: shift weight from defensive buckets
(cash_emergency) toward investing and speculative.
"""
from __future__ import annotations

from schemas import AllocationPlan, RiskView, UserProfile


async def run_aggressive_risk(
    profile: UserProfile,
    allocation: AllocationPlan,
) -> RiskView:
    """
    Propose upward risk adjustments to the allocator's plan.

    Inputs:
      - profile    → user context (age, risk_tolerance, income stability)
      - allocation → proposed AllocationPlan from Layer 3

    Returns:
      RiskView(stance="aggressive", adjustments={bucket: delta_pct}, reasoning)

    LLM prompt guidance:
      System: "You are an aggressive risk analyst. Your job is to find
      opportunities to increase return potential in the allocation plan.
      Propose specific percentage shifts (e.g. -3 from cash_emergency,
      +2 to investing, +1 to speculative). Keep total adjustments net-zero.
      Do NOT recommend changes that would push cash_emergency below 5% or
      speculative above 15%. Justify each adjustment with data from the profile."

      adjustments dict example: {"cash_emergency": -3.0, "investing": 2.0, "speculative": 1.0}
    """
    raise NotImplementedError(
        "run_aggressive_risk not implemented. "
        "Replace this body with the ASI:One LLM call that returns RiskView."
    )
