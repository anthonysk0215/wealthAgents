"""
Bear Researcher — Layer 2.

Argues the conservative case: capital preservation, larger emergency fund,
delayed leveraged purchases, reduced speculation. Rebuts the bull each round.
"""
from __future__ import annotations

from schemas import DebateRound, Layer1Reports, UserProfile


async def run_bear(
    profile: UserProfile,
    layer1: Layer1Reports,
    prior_bull_rounds: list[DebateRound],
    round_number: int,
) -> DebateRound:
    """
    Produce the bear argument for `round_number` (1, 2, or 3).

    Inputs:
      - profile           → user context
      - layer1            → analyst reports
      - prior_bull_rounds → all bull arguments so far (including this round's bull)
      - round_number      → 1 = opening, 2 = rebuttal, 3 = closing

    Returns:
      DebateRound(speaker="bear", round_number=round_number, argument=..., confidence=...)

    LLM prompt guidance:
      System: "You are a bearish financial researcher. You believe in capital
      preservation, robust emergency funds, and conservative debt management.
      Your job is to argue for the most risk-managed strategy. Round 1: opening.
      Rounds 2-3: directly rebut the bull's most recent argument, then advance
      your own position."

      Ground arguments in the user's specific numbers (e.g. if current_savings
      is low relative to monthly_expenses, hammer the emergency fund gap).
      Confidence should reflect how strongly the bear case applies (0.4-0.85).
    """
    raise NotImplementedError(
        "run_bear not implemented. "
        "Replace this body with the ASI:One LLM call that returns DebateRound."
    )
