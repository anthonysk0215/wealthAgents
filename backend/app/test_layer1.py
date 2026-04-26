from __future__ import annotations

from app.agents.layer1.cash_flow import run as run_cash_flow
from app.agents.layer1.housing import run as run_housing
from app.agents.layer1.investment import run as run_investment
from app.agents.layer1.retirement import run as run_retirement
from app.schemas import Layer1Reports, UserProfile


def build_demo_user() -> UserProfile:
    return UserProfile(
        name="Alex Chen",
        age=24,
        occupation="Software Engineer",
        industry="Tech",
        location="San Francisco Bay Area",
        annual_salary=145000,
        monthly_expenses=4200,
        current_savings=18000,
        taxable_investments=5000,
        retirement_balance=8000,
        debt_amount=0,
        debt_interest_rate=0,
        employer_401k_match=5.0,
        primary_goal="Buy a $1M home by 33",
        target_age=33,
        dream_scenario="Maybe start a company someday",
        risk_tolerance="moderate_aggressive",
    )


def main() -> None:
    user = build_demo_user()
    reports = Layer1Reports(
        cash_flow=run_cash_flow(user),
        retirement=run_retirement(user),
        housing=run_housing(user),
        investment=run_investment(user),
    )
    print(reports.model_dump_json(indent=2))


if __name__ == "__main__":
    main()
