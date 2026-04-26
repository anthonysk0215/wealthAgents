"""
Housing Analyst — Layer 1.

Evaluates the feasibility of the user's housing goal and calculates
the timeline to a 20% down payment.
"""
from __future__ import annotations

from schemas import HousingReport, UserProfile


async def run_housing_agent(profile: UserProfile) -> HousingReport:
    """
    Assess mortgage feasibility and down-payment timeline.

    Inputs used:
      - profile.primary_goal         → parse target home price if present
      - profile.target_age / age     → years remaining to goal
      - profile.annual_salary        → mortgage affordability (28% rule)
      - profile.current_savings      → existing capital toward down payment
      - profile.monthly_expenses     → debt-to-income context
      - profile.debt_amount          → affects DTI ratio

    Returns:
      HousingReport with feasible, years_to_down_payment,
      required_monthly_savings, estimated_home_price, summary.

    LLM prompt guidance:
      Standard 20% down payment target. Use the 28% gross income rule for
      mortgage affordability. If the goal implies a price, extract it;
      otherwise estimate based on 4-5× annual salary for the user's market.
      Flag if DTI (including mortgage) would exceed 43%.
    """
    raise NotImplementedError(
        "run_housing_agent not implemented. "
        "Replace this body with the ASI:One LLM call that returns HousingReport."
    )
