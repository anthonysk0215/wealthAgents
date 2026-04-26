"""
Bull Researcher — Layer 2.

Argues the aggressive case: higher equity exposure, faster house purchase,
startup / speculative upside. Rebuts the bear's prior arguments each round.
"""
from __future__ import annotations

from app.llm import call_llm
from app.schemas import DebateRound, Layer1Reports, UserProfile


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
    if round_number not in (1, 2, 3):
        raise ValueError(f"round_number must be 1, 2, or 3 (got {round_number})")

    latest_bear = prior_bear_rounds[-1].argument if prior_bear_rounds else "No bear argument provided yet."
    layer1_snapshot = layer1.model_dump_json(indent=2)

    gross_monthly = profile.annual_salary / 12
    monthly_surplus = layer1.cash_flow.monthly_surplus
    emergency_months = (
        profile.current_savings / profile.monthly_expenses if profile.monthly_expenses > 0 else 0.0
    )

    opening_or_rebuttal = (
        "This is round 1: provide a growth-oriented opening argument."
        if round_number == 1
        else "This is round 2/3: directly rebut the latest bear argument first, then advance your own case."
    )

    system_prompt = (
        "You are a bullish financial researcher in a multi-agent wealth planning debate. "
        "Prioritize long-term compounding, appropriate equity exposure, and calculated risk-taking "
        "that is still grounded in the user's real numbers. Be specific, not generic.\n\n"
        "Return valid JSON matching DebateRound with:\n"
        "- speaker: always 'bull'\n"
        "- round_number: exactly the provided round number\n"
        "- argument: 2-4 sentences, concrete and numeric\n"
        "- confidence: float between 0.50 and 0.90"
    )

    user_prompt = (
        f"{opening_or_rebuttal}\n\n"
        f"Round number: {round_number}\n"
        f"Profile: {profile.name}, age {profile.age}, occupation {profile.occupation}, risk {profile.risk_tolerance}\n"
        f"Income/expenses: annual_salary=${profile.annual_salary:,.0f}, gross_monthly=${gross_monthly:,.0f}, "
        f"monthly_expenses=${profile.monthly_expenses:,.0f}, monthly_surplus=${monthly_surplus:,.0f}\n"
        f"Balance sheet: current_savings=${profile.current_savings:,.0f}, taxable=${profile.taxable_investments:,.0f}, "
        f"retirement=${profile.retirement_balance:,.0f}, debt=${profile.debt_amount:,.0f} at {profile.debt_interest_rate:.2f}%\n"
        f"Emergency fund coverage: {emergency_months:.1f} months of expenses\n"
        f"Goal: {profile.primary_goal} (target age {profile.target_age})\n\n"
        "Layer 1 analyst highlights:\n"
        f"- Cash flow: {layer1.cash_flow.summary} (savings_rate={layer1.cash_flow.savings_rate:.1f}%, "
        f"burn_rate={layer1.cash_flow.burn_rate:.1f}%)\n"
        f"- Retirement: {layer1.retirement.summary} "
        f"(recommended_401k={layer1.retirement.recommended_401k_pct:.1f}%, "
        f"annual_retirement=${layer1.retirement.annual_retirement_contribution:,.0f})\n"
        f"- Housing: {layer1.housing.summary} "
        f"(feasible={layer1.housing.feasible}, years_to_down={layer1.housing.years_to_down_payment:.1f}, "
        f"required_monthly=${layer1.housing.required_monthly_savings:,.0f})\n"
        f"- Investment: {layer1.investment.summary} "
        f"(equity={layer1.investment.equity_pct:.0f}%, bonds={layer1.investment.bond_pct:.0f}%)\n\n"
        "Complete Layer1Reports JSON (all fields must be considered):\n"
        f"{layer1_snapshot}\n\n"
        f"Latest bear argument to rebut:\n{latest_bear}\n\n"
        "Constraints:\n"
        "- Round 2/3 must begin by rebutting the latest bear point directly.\n"
        "- Emphasize long-term expected value and compounding, without ignoring near-term cash constraints.\n"
        "- Use evidence from all four Layer 1 reports, including analyst summaries informed by market data.\n"
        "- Keep confidence realistic for this profile, in [0.50, 0.90]."
    )

    result = await call_llm(system_prompt, user_prompt, DebateRound, temperature=0.4)
    return result.model_copy(
        update={
            "speaker": "bull",
            "round_number": round_number,
            "confidence": max(0.50, min(0.90, result.confidence)),
        }
    )
