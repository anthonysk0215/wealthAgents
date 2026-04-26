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
    Full agent: real mortgage rate + math + LLM-generated insight summary.
    """
    mortgage_rate = market.get("mortgage_rate_30yr", 6.8)
    report = run(profile, mortgage_rate=mortgage_rate)

    if report.estimated_home_price:
        loan = report.estimated_home_price * 0.80
        monthly_payment = _monthly_pi(loan, mortgage_rate)
        gross_monthly = profile.annual_salary / 12
        dti = (monthly_payment + profile.monthly_expenses) / gross_monthly * 100
        down_remaining = max(report.estimated_home_price * 0.20 - profile.current_savings, 0.0)

        user_prompt = (
            f"{profile.name}, {profile.age}yo, goal: {profile.primary_goal} by age {profile.target_age}.\n"
            f"Home price: ${report.estimated_home_price:,.0f} | 20% down: ${report.estimated_home_price * 0.20:,.0f} "
            f"(still need ${down_remaining:,.0f})\n"
            f"Live 30yr rate: {mortgage_rate:.2f}% → monthly P&I: ${monthly_payment:,.0f}\n"
            f"Post-mortgage DTI: {dti:.1f}% (safe < 43%)\n"
            f"Years to down payment at current savings rate: {report.years_to_down_payment:.1f}\n"
            f"Monthly required for house fund: ${report.required_monthly_savings:,.0f}"
        )
    else:
        user_prompt = (
            f"{profile.name}, {profile.age}yo, goal: {profile.primary_goal}.\n"
            f"No specific home price found in goal. Live 30yr rate: {mortgage_rate:.2f}%.\n"
            f"Monthly surplus: ${profile.annual_salary / 12 - profile.monthly_expenses:,.0f}"
        )

    insight = await call_llm(_INSIGHT_SYSTEM, user_prompt, Insight, temperature=0.3)
    return report.model_copy(update={"summary": insight.summary})
