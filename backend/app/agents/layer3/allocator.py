"""
Portfolio Allocator — Layer 3.

Combines the Layer 1 analyst reports and the debate verdict's aggression_dial
to produce a five-bucket monthly allocation plan.
"""
from __future__ import annotations

from schemas import AllocationPlan, DebateVerdict, Layer1Reports, UserProfile


async def run_allocator(
    profile: UserProfile,
    layer1: Layer1Reports,
    verdict: DebateVerdict,
) -> AllocationPlan:
    """
    Produce a five-bucket monthly surplus allocation plan.

    Inputs:
      - profile          → user context (salary, expenses, goals)
      - layer1           → all four analyst reports
      - verdict          → debate verdict, especially aggression_dial (0-1)

    Returns:
      AllocationPlan with five bucket percentages that sum to 100,
      monthly_amounts ($ per bucket based on cash_flow.monthly_surplus),
      and a summary.

    Bucket definitions:
      cash_emergency  → build/maintain 6-month emergency fund
      retirement      → 401k + Roth IRA contributions
      investing       → taxable brokerage (ETFs from investment report)
      house_fund      → dedicated savings toward down payment
      speculative     → high-risk/high-reward, only if room exists

    LLM prompt guidance:
      Use aggression_dial as the primary lever:
        0.0 → heavy cash_emergency + retirement, minimal speculative
        1.0 → heavy investing + speculative, lean cash_emergency
      Hard constraints:
        - retirement_pct must be >= min needed to capture full 401k match
        - cash_emergency_pct >= 10% until 6-month fund is fully funded
        - speculative_pct <= 10%
        - all five percentages must sum to exactly 100
      monthly_amounts keys: cash_emergency, retirement, investing, house_fund, speculative
    """
    raise NotImplementedError(
        "run_allocator not implemented. "
        "Replace this body with the ASI:One LLM call that returns AllocationPlan."
    )
