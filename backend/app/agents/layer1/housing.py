"""
Housing Analyst - Layer 1.

Math: down-payment timeline, real monthly P&I at live mortgage rate, DTI.
AI:   ASI:One generates the summary insight from the computed numbers.
"""
from __future__ import annotations

import re
from typing import Any, Optional

from app.schemas import HousingReport, UserProfile
from app.llm import call_llm, Insight

_INSIGHT_SYSTEM = (
    "You are a housing finance analyst. Given precise numbers, write ONE sentence "
    "(max 30 words) naming the single most important constraint or opportunity in "
    "this person's housing goal. Be specific — include the mortgage rate and a dollar figure."
)


def _parse_home_price(goal: str) -> Optional[float]:
    million_match = re.search(r"\$\s*(\d+(?:\.\d+)?)\s*m\b", goal, re.IGNORECASE)
    if million_match:
        return float(million_match.group(1)) * 1_000_000

    dollar_match = re.search(r"\$\s*([\d,]+(?:\.\d+)?)", goal)
    if dollar_match:
        return float(dollar_match.group(1).replace(",", ""))

    return None


def _monthly_pi(loan: float, annual_rate_pct: float, years: int = 30) -> float:
    """Standard amortising P&I payment."""
    r = annual_rate_pct / 100 / 12
    n = years * 12
    if r == 0:
        return loan / n
    return loan * r * (1 + r) ** n / ((1 + r) ** n - 1)


def run(user: UserProfile, mortgage_rate: float = 6.8) -> HousingReport:
    """
    Deterministic housing math with live mortgage rate.
    Called by run_housing_agent (async) and directly in unit tests.
    """
    estimated_home_price = _parse_home_price(user.primary_goal)
    gross_monthly = user.annual_salary / 12
    monthly_surplus = gross_monthly - user.monthly_expenses
    months_until_target = max((user.target_age - user.age) * 12, 1)

    if estimated_home_price is None:
        remaining_down = 0.0
        required_monthly_savings = 0.0
        years_to_down = 0.0
    else:
        down_target = estimated_home_price * 0.20
        remaining_down = max(down_target - user.current_savings, 0.0)
        required_monthly_savings = remaining_down / months_until_target
        if monthly_surplus > 0:
            years_to_down = remaining_down / (monthly_surplus * 12)
        else:
            years_to_down = float("inf")

    feasible = monthly_surplus > 0 and required_monthly_savings <= monthly_surplus * 0.60

    if feasible:
        summary = "Home goal is feasible if a dedicated house fund gets priority."
    else:
        summary = "Home goal is aggressive relative to current surplus."

    return HousingReport(
        feasible=feasible,
        years_to_down_payment=round(years_to_down if estimated_home_price else 0.0, 2),
        required_monthly_savings=round(required_monthly_savings, 2),
        estimated_home_price=estimated_home_price,
        summary=summary,
    )


async def run_housing_agent(profile: UserProfile, market: dict[str, Any]) -> HousingReport:
    """
    Full agent: real mortgage rate + math with deterministic summary (no LLM call for speed).
    """
    mortgage_rate = market.get("mortgage_rate_30yr", 6.8)
    report = run(profile, mortgage_rate=mortgage_rate)
    if report.estimated_home_price:
        loan = report.estimated_home_price * 0.80
        monthly_payment = _monthly_pi(loan, mortgage_rate)
        summary = (
            f"${report.estimated_home_price:,.0f} home at {mortgage_rate:.2f}% → "
            f"${monthly_payment:,.0f}/mo P&I; {report.years_to_down_payment:.1f} yrs to down payment."
        )
    else:
        summary = report.summary
    return report.model_copy(update={"summary": summary})
