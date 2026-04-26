"""
Investment Analyst — Layer 1.

Recommends a long-term equity/bond split and specific ETFs based on
the user's time horizon and stated risk tolerance.
"""
from __future__ import annotations

from schemas import InvestmentReport, UserProfile


async def run_investment_agent(profile: UserProfile) -> InvestmentReport:
    """
    Recommend equity/bond allocation and ETF picks.

    Inputs used:
      - profile.risk_tolerance        → conservative/moderate/aggressive
      - profile.age / profile.target_age → time horizon
      - profile.taxable_investments   → existing portfolio context
      - profile.retirement_balance    → total invested assets context

    Returns:
      InvestmentReport with equity_pct, bond_pct, recommended_etfs, summary.

    LLM prompt guidance:
      Use age-based glide path as baseline (e.g. 110 - age = equity %).
      Adjust up/down based on risk_tolerance. Prefer low-cost broad index ETFs:
      VTI (US total market), VXUS (international), BND (bonds), SCHD (dividend).
      If speculative tolerance is present, allow up to 5-10% in QQQ or sector ETFs.
      summary should name the strategy, e.g. "90/10 equity/bonds, VTI + VXUS core."
    """
    raise NotImplementedError(
        "run_investment_agent not implemented. "
        "Replace this body with the ASI:One LLM call that returns InvestmentReport."
    )
