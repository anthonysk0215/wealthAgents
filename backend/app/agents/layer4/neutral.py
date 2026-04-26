"""
Neutral Risk Agent — Layer 4.

Validates the allocator's plan from a balanced perspective.
May propose minor rebalancing or endorse the plan as-is.
"""
from __future__ import annotations

from schemas import AllocationPlan, RiskView, UserProfile


async def run_neutral_risk(
    profile: UserProfile,
    allocation: AllocationPlan,
) -> RiskView:
    """
    Evaluate the allocation plan from a neutral / balanced perspective.

    Inputs:
      - profile    → user context
      - allocation → proposed AllocationPlan from Layer 3

    Returns:
      RiskView(stance="neutral", adjustments={bucket: delta_pct}, reasoning)

    LLM prompt guidance:
      System: "You are a neutral risk analyst. Evaluate the plan objectively.
      If it is already well-balanced, you may return all-zero adjustments.
      If there are minor imbalances (e.g. house_fund slightly high given the
      timeline), propose small corrections (1-2% moves). Justify each change.
      Keep net adjustments at zero."

      It is completely valid to return {"adjustments": {}} with reasoning
      "Plan is well-balanced for this profile."
    """
    raise NotImplementedError(
        "run_neutral_risk not implemented. "
        "Replace this body with the ASI:One LLM call that returns RiskView."
    )
