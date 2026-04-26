"""
Retirement Analyst - Layer 1.
"""
from __future__ import annotations

from app.schemas import RetirementReport, UserProfile


def _recommended_401k_pct(user: UserProfile) -> float:
    by_risk = {
        "conservative": 8.0,
        "moderate": 10.0,
        "moderate_aggressive": 12.0,
        "aggressive": 15.0,
    }
    return max(user.employer_401k_match, by_risk[user.risk_tolerance])


def run(user: UserProfile) -> RetirementReport:
    recommended_401k_pct = _recommended_401k_pct(user)
    roth_ira_eligible = user.annual_salary < 161000
    roth_ira_amount = 7000 if roth_ira_eligible else 0
    annual_401k = user.annual_salary * recommended_401k_pct / 100
    annual_retirement_contribution = annual_401k + roth_ira_amount
    captures_full_match = recommended_401k_pct >= user.employer_401k_match

    if roth_ira_eligible:
        summary = "Capture the full match and add a Roth IRA for tax diversification."
    else:
        summary = "Capture the full match and prioritize 401k contributions."

    return RetirementReport(
        recommended_401k_pct=round(recommended_401k_pct, 2),
        roth_ira_eligible=roth_ira_eligible,
        captures_full_match=captures_full_match,
        annual_retirement_contribution=round(annual_retirement_contribution, 2),
        summary=summary,
    )


async def run_retirement_agent(profile: UserProfile) -> RetirementReport:
    return run(profile)
