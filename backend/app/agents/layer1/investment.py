"""
Investment Analyst - Layer 1.
"""
from __future__ import annotations

from app.schemas import InvestmentReport, UserProfile


def run(user: UserProfile) -> InvestmentReport:
    adjustment = {
        "conservative": -15,
        "moderate": -5,
        "moderate_aggressive": 0,
        "aggressive": 5,
    }[user.risk_tolerance]

    equity_pct = 110 - user.age + adjustment
    equity_pct = min(max(equity_pct, 40), 95)
    bond_pct = 100 - equity_pct
    recommended_etfs = ["VTI", "VXUS", "BND"]

    return InvestmentReport(
        equity_pct=round(equity_pct, 2),
        bond_pct=round(bond_pct, 2),
        recommended_etfs=recommended_etfs,
        summary=f"{round(equity_pct):.0f}/{round(bond_pct):.0f} equity/bond mix using broad low-cost ETFs.",
    )


async def run_investment_agent(profile: UserProfile) -> InvestmentReport:
    return run(profile)
