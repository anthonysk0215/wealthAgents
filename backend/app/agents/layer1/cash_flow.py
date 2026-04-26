"""
Cash Flow Analyst — Layer 1.

Analyses the user's income vs. expenses to determine monthly surplus,
savings rate, and burn rate. This is the financial foundation every
other agent builds on.
"""
from __future__ import annotations

from schemas import CashFlowReport, UserProfile


async def run_cash_flow_agent(profile: UserProfile) -> CashFlowReport:
    """
    Compute burn rate, savings rate, and monthly surplus for the user.

    Inputs used:
      - profile.annual_salary        → gross monthly income
      - profile.monthly_expenses     → total monthly outgoings

    Returns:
      CashFlowReport with monthly_surplus, savings_rate, burn_rate, summary.

    LLM prompt guidance:
      Ask the model to assess whether the surplus is healthy, flag if
      monthly_expenses > 0.7 * gross_monthly_income as a risk, and
      produce a concise 1-2 sentence summary for the dashboard card.
    """
    raise NotImplementedError(
        "run_cash_flow_agent not implemented. "
        "Replace this body with the ASI:One LLM call that returns CashFlowReport."
    )
