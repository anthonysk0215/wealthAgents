"""
Risk Manager — Layer 4.

Reads the three risk views (aggressive, neutral, conservative) and the
original allocation, then produces the final risk-adjusted AllocationPlan
along with a risk score and any actionable warnings.
"""
from __future__ import annotations

from schemas import AllocationPlan, FinalRiskDecision, RiskView, UserProfile


async def run_risk_manager(
    profile: UserProfile,
    allocation: AllocationPlan,
    views: list[RiskView],
) -> FinalRiskDecision:
    """
    Synthesise three risk views into the final allocation and risk score.

    Inputs:
      - profile    → user context
      - allocation → original AllocationPlan from Layer 3
      - views      → list of 3 RiskView objects [aggressive, neutral, conservative]

    Returns:
      FinalRiskDecision with final_allocation, risk_score (0-10), warnings, summary.

    LLM prompt guidance:
      System: "You are the Chief Risk Officer. You receive three analyst views
      on the proposed allocation. Weigh them according to the user's stated
      risk_tolerance: aggressive profile → give more weight to the aggressive view,
      conservative profile → weight toward the conservative view, moderate → weight
      toward neutral. Produce a final_allocation where all five percentages sum to 100.
      Compute a risk_score 0-10 (10 = maximum risk). List concrete warnings the user
      should monitor (e.g. 'Emergency fund will not be 6 months until month 11')."

      views[0].stance == "aggressive", views[1].stance == "neutral",
      views[2].stance == "conservative" (guaranteed by orchestrator).
      final_allocation.monthly_amounts must be recomputed from the adjusted percentages
      using the original monthly_surplus from cash_flow.
    """
    raise NotImplementedError(
        "run_risk_manager not implemented. "
        "Replace this body with the ASI:One LLM call that returns FinalRiskDecision."
    )
