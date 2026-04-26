"""
Bull Researcher — Layer 2.

Argues the aggressive case: higher equity exposure, faster house purchase,
startup / speculative upside. Rebuts the bear's prior arguments each round.
"""
from __future__ import annotations

from schemas import DebateRound, Layer1Reports, UserProfile


async def run_bull(
    profile: UserProfile,
    layer1: Layer1Reports,
    prior_bear_rounds: list[DebateRound],
    round_number: int,
) -> DebateRound:
    """
    Produce the bull argument for `round_number` (1, 2, or 3).

    Inputs:
      - profile          → user context (income, age, goal, risk tolerance)
      - layer1           → analyst reports (cash flow, retirement, housing, investment)
      - prior_bear_rounds → all bear arguments so far (empty in round 1)
      - round_number     → 1 = opening, 2 = rebuttal, 3 = closing

    Returns:
      DebateRound(speaker="bull", round_number=round_number, argument=..., confidence=...)

    LLM prompt guidance:
      System: "You are a bullish financial researcher. You believe in aggressive
      long-term equity investing and calculated risk-taking. Your job is to argue
      for the most growth-oriented strategy consistent with the user's profile.
      Round 1: make your opening argument. Rounds 2-3: directly rebut the bear's
      most recent point before advancing your own."

      Incorporate specific numbers from layer1 (e.g. monthly_surplus, equity_pct).
      Confidence should reflect how convincingly the bull case applies to this
      specific profile (0.5-0.9 typical range).
    """
    raise NotImplementedError(
        "run_bull not implemented. "
        "Replace this body with the ASI:One LLM call that returns DebateRound."
    )
