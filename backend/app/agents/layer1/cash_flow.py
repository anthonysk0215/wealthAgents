"""
Cash Flow Analyst - Layer 1.
"""
from __future__ import annotations

from app.schemas import CashFlowReport, UserProfile


def run(user: UserProfile) -> CashFlowReport:
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


async def run_cash_flow_agent(profile: UserProfile) -> CashFlowReport:
    return run(profile)
