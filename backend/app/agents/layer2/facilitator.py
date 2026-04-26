"""
Debate Facilitator — Layer 2.

Reads all 6 debate rounds and produces a DebateVerdict: which side won
on each topic, and an aggression_dial (0-1) that the allocator uses.
"""
from __future__ import annotations

from app.llm import call_llm
from app.schemas import DebateRound, DebateVerdict, Layer1Reports, UserProfile


async def run_facilitator(
    profile: UserProfile,
    bull_rounds: list[DebateRound],
    bear_rounds: list[DebateRound],
    layer1: Layer1Reports | None = None,
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
    if len(bull_rounds) != 3:
        raise ValueError(f"bull_rounds must contain exactly 3 rounds (got {len(bull_rounds)})")
    if len(bear_rounds) != 3:
        raise ValueError(f"bear_rounds must contain exactly 3 rounds (got {len(bear_rounds)})")

    if any(r.speaker != "bull" for r in bull_rounds):
        raise ValueError("All bull_rounds entries must have speaker='bull'")
    if any(r.speaker != "bear" for r in bear_rounds):
        raise ValueError("All bear_rounds entries must have speaker='bear'")

    system_prompt = (
        "You are an impartial financial debate moderator in a multi-agent wealth planning firm. "
        "Your objective is to maximize long-term expected wealth while controlling catastrophic downside risk. "
        "Evaluate argument quality using evidence quality, numeric grounding, and profile fit.\n\n"
        "You must decide winners for these topics:\n"
        "- emergency_fund\n"
        "- equity_exposure\n"
        "- housing_timeline\n"
        "- speculative_allocation\n\n"
        "Output rules:\n"
        "- Return valid JSON for DebateVerdict.\n"
        "- bull_wins_on and bear_wins_on must use only the topic keys above.\n"
        "- Every topic must appear in exactly one side's list (no duplicates, no omissions).\n"
        "- aggression_dial: 0.00 means fully bear, 1.00 means fully bull; include 2-decimal precision.\n"
        "- summary: one punchy sentence explaining why this dial is right for this user."
    )

    layer1_context = (
        f"Layer 1 full reports (market-enriched analyst outputs):\n{layer1.model_dump_json(indent=2)}\n\n"
        if layer1 is not None
        else ""
    )

    user_prompt = (
        f"User profile:\n"
        f"- Name: {profile.name}\n"
        f"- Age: {profile.age}\n"
        f"- Occupation: {profile.occupation}\n"
        f"- Industry: {profile.industry}\n"
        f"- Annual salary: ${profile.annual_salary:,.0f}\n"
        f"- Monthly expenses: ${profile.monthly_expenses:,.0f}\n"
        f"- Current savings: ${profile.current_savings:,.0f}\n"
        f"- Taxable investments: ${profile.taxable_investments:,.0f}\n"
        f"- Retirement balance: ${profile.retirement_balance:,.0f}\n"
        f"- Debt: ${profile.debt_amount:,.0f} at {profile.debt_interest_rate:.2f}%\n"
        f"- Employer 401k match: {profile.employer_401k_match:.1f}%\n"
        f"- Goal: {profile.primary_goal} (target age {profile.target_age})\n"
        f"- Risk tolerance: {profile.risk_tolerance}\n\n"
        f"{layer1_context}"
        "Bull rounds:\n"
        f"1) conf={bull_rounds[0].confidence:.2f} | {bull_rounds[0].argument}\n"
        f"2) conf={bull_rounds[1].confidence:.2f} | {bull_rounds[1].argument}\n"
        f"3) conf={bull_rounds[2].confidence:.2f} | {bull_rounds[2].argument}\n\n"
        "Bear rounds:\n"
        f"1) conf={bear_rounds[0].confidence:.2f} | {bear_rounds[0].argument}\n"
        f"2) conf={bear_rounds[1].confidence:.2f} | {bear_rounds[1].argument}\n"
        f"3) conf={bear_rounds[2].confidence:.2f} | {bear_rounds[2].argument}\n\n"
        "Decision policy:\n"
        "- Reward compounding and opportunity capture when downside is survivable.\n"
        "- Penalize plans that create liquidity fragility, especially with low emergency runway.\n"
        "- Prefer recommendations that are executable from current cash flow, not aspirational.\n"
        "- If Layer 1 reports are provided, weight those facts heavily when assigning topic winners.\n"
        "- aggression_dial should be higher only if bull arguments are materially stronger on most topics."
    )

    result = await call_llm(system_prompt, user_prompt, DebateVerdict, temperature=0.25)

    allowed_topics = {
        "emergency_fund",
        "equity_exposure",
        "housing_timeline",
        "speculative_allocation",
    }
    bull_set = {topic for topic in result.bull_wins_on if topic in allowed_topics}
    bear_set = {topic for topic in result.bear_wins_on if topic in allowed_topics}

    missing = allowed_topics - (bull_set | bear_set)
    overlap = bull_set & bear_set

    # Normalize edge cases so downstream allocator always gets a coherent verdict.
    if overlap:
        bear_set -= overlap
    if missing:
        if result.aggression_dial >= 0.5:
            bull_set |= missing
        else:
            bear_set |= missing

    return result.model_copy(
        update={
            "bull_wins_on": sorted(bull_set),
            "bear_wins_on": sorted(bear_set),
            "aggression_dial": round(max(0.0, min(1.0, result.aggression_dial)), 2),
        }
    )
