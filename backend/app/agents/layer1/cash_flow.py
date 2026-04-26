"""
Cash Flow Analyst - Layer 1.

Math: surplus, savings rate, burn rate.
AI:   ASI:One generates the summary using live CPI to frame real purchasing power.
"""
from __future__ import annotations

from typing import Any

from app.schemas import CashFlowReport, UserProfile
from app.llm import call_llm, Insight

_INSIGHT_SYSTEM = (
    "You are a cash flow analyst. Given a person's exact monthly numbers and current CPI, "
    "write ONE sentence (max 30 words) that names the single most important cash flow fact "
    "for their specific goal. Mention the actual dollar surplus and what it enables or prevents."
)


def run(user: UserProfile) -> CashFlowReport:
    """
    Deterministic cash flow math.
    Called by run_cash_flow_agent (async) and directly in unit tests.
    """
    gross_monthly_income = user.annual_salary / 12
    monthly_surplus = gross_monthly_income - user.monthly_expenses

    if gross_monthly_income > 0:
        savings_rate = monthly_surplus / gross_monthly_income * 100
        burn_rate = user.monthly_expenses / gross_monthly_income * 100
    else:
        savings_rate = 0.0
        burn_rate = 0.0

    if savings_rate >= 30:
        summary = "Strong cash flow with a high monthly surplus."
    elif savings_rate >= 15:
        summary = "Solid cash flow with room to fund multiple goals."
    elif monthly_surplus > 0:
        summary = "Positive cash flow, but savings capacity is limited."
    else:
        summary = "Expenses exceed income and need immediate attention."

    return CashFlowReport(
        monthly_surplus=round(monthly_surplus, 2),
        savings_rate=round(savings_rate, 2),
        burn_rate=round(burn_rate, 2),
        summary=summary,
    )


async def run_cash_flow_agent(profile: UserProfile, market: dict[str, Any]) -> CashFlowReport:
    """
    Full agent: cash flow math with deterministic summary (no LLM call for speed).
    """
    cpi = market.get("cpi_yoy", 3.2)
    report = run(profile)
    surplus = report.monthly_surplus
    real = surplus / (1 + cpi / 100)
    summary = (
        f"Monthly surplus ${surplus:,.0f} (${real:,.0f} real at {cpi:.1f}% CPI); "
        f"savings rate {report.savings_rate:.1f}%."
    )
    return report.model_copy(update={"summary": summary})
