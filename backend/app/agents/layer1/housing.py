"""
Housing Analyst - Layer 1.
"""
from __future__ import annotations

import re
from typing import Optional

from app.schemas import HousingReport, UserProfile


def _parse_home_price(goal: str) -> Optional[float]:
    million_match = re.search(r"\$\s*(\d+(?:\.\d+)?)\s*m\b", goal, re.IGNORECASE)
    if million_match:
        return float(million_match.group(1)) * 1_000_000

    dollar_match = re.search(r"\$\s*([\d,]+(?:\.\d+)?)", goal)
    if dollar_match:
        return float(dollar_match.group(1).replace(",", ""))

    return None


def run(user: UserProfile) -> HousingReport:
    estimated_home_price = _parse_home_price(user.primary_goal)
    gross_monthly_income = user.annual_salary / 12
    monthly_surplus = gross_monthly_income - user.monthly_expenses
    months_until_target = max((user.target_age - user.age) * 12, 1)

    if estimated_home_price is None:
        down_payment_target = 0.0
        remaining_down_payment = 0.0
    else:
        down_payment_target = estimated_home_price * 0.20
        remaining_down_payment = max(down_payment_target - user.current_savings, 0.0)

    required_monthly_savings = remaining_down_payment / months_until_target
    feasible = monthly_surplus > 0 and required_monthly_savings <= monthly_surplus * 0.60

    if remaining_down_payment == 0:
        years_to_down_payment = 0.0
    elif monthly_surplus > 0:
        years_to_down_payment = remaining_down_payment / (monthly_surplus * 12)
    else:
        years_to_down_payment = float("inf")

    if feasible:
        summary = "Home goal is feasible if a dedicated house fund gets priority."
    else:
        summary = "Home goal is aggressive relative to current surplus."

    return HousingReport(
        feasible=feasible,
        years_to_down_payment=round(years_to_down_payment, 2),
        required_monthly_savings=round(required_monthly_savings, 2),
        estimated_home_price=estimated_home_price,
        summary=summary,
    )


async def run_housing_agent(profile: UserProfile) -> HousingReport:
    return run(profile)
