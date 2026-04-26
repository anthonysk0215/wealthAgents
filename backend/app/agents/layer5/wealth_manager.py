"""
Wealth Manager — Layer 5.

Final synthesis agent. Receives everything from all prior layers and
produces the complete WealthPlan: personalized headline, health score,
Next $1000 card, 12-month milestones, and 5-year milestones.
"""
from __future__ import annotations

from schemas import (
    AllocationPlan,
    DebateVerdict,
    FinalRiskDecision,
    Layer1Reports,
    UserProfile,
    WealthPlan,
)


async def run_wealth_manager(
    profile: UserProfile,
    layer1: Layer1Reports,
    verdict: DebateVerdict,
    allocation: AllocationPlan,
    risk: FinalRiskDecision,
) -> WealthPlan:
    """
    Produce the final WealthPlan from the full multi-agent context.

    Inputs:
      - profile    → user intake data
      - layer1     → four analyst reports
      - verdict    → debate outcome and aggression_dial
      - allocation → Layer 3 proposed allocation
      - risk       → Layer 4 final risk decision (use risk.final_allocation)

    Returns:
      WealthPlan with headline, health_score, final_allocation, next_thousand,
      milestones_12mo (4-6 items), milestones_5yr (3-5 items).
      NOTE: agent_transcript is populated by the orchestrator after this call —
      leave it as the default empty list.

    LLM prompt guidance:
      System: "You are the Wealth Manager, the final decision-maker in a
      multi-agent financial planning firm. Synthesise all prior agent outputs
      into a polished, personalised wealth plan."

      headline: one punchy sentence capturing the user's financial personality,
        e.g. "Career-rich, capital-light. Aggressive investing, patient housing."

      health_score: 0-100 composite of:
        - savings_rate (higher = better, max contribution 30 pts)
        - debt_ratio   (lower debt = better, max 20 pts)
        - retirement_on_track (max 20 pts)
        - emergency_fund_months (max 15 pts)
        - diversification (max 15 pts)

      next_thousand: derive from risk.final_allocation percentages applied to
        $1,000. Values must sum to exactly 1000.0.

      milestones_12mo: concrete targets for months 1, 3, 6, 9, 12.
        Use month field (int 1-12). target_metric must be a specific $ figure.

      milestones_5yr: targets for years 1, 2, 3, 5.
        Use year field (int). target_metric = specific outcome.

      final_allocation: use risk.final_allocation exactly — do not modify it.
    """
    raise NotImplementedError(
        "run_wealth_manager not implemented. "
        "Replace this body with the ASI:One LLM call that returns WealthPlan."
    )
