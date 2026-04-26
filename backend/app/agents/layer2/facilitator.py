"""
Debate Facilitator — Layer 2.

Reads all 6 debate rounds and produces a DebateVerdict: which side won
on each topic, and an aggression_dial (0-1) that the allocator uses.
"""
from __future__ import annotations

from schemas import DebateRound, DebateVerdict, UserProfile


async def run_facilitator(
    profile: UserProfile,
    bull_rounds: list[DebateRound],
    bear_rounds: list[DebateRound],
) -> DebateVerdict:
    """
    Synthesise 3 rounds of bull/bear debate into a structured verdict.

    Inputs:
      - profile     → user context
      - bull_rounds → list of 3 DebateRound objects (speaker="bull")
      - bear_rounds → list of 3 DebateRound objects (speaker="bear")

    Returns:
      DebateVerdict with bull_wins_on, bear_wins_on, aggression_dial, summary.

    LLM prompt guidance:
      System: "You are an impartial financial debate moderator. Evaluate the
      bull and bear arguments on each key topic (emergency fund, equity exposure,
      housing timeline, speculative allocation). Declare a winner per topic.
      Then set aggression_dial: 0.0 = bear wins every topic, 1.0 = bull wins
      every topic, with proportional intermediate values."

      The aggression_dial is the single most important output — the allocator
      uses it as its primary input. Make it precise (2 decimal places).
      summary should read like a one-sentence newspaper verdict.
    """
    raise NotImplementedError(
        "run_facilitator not implemented. "
        "Replace this body with the ASI:One LLM call that returns DebateVerdict."
    )
