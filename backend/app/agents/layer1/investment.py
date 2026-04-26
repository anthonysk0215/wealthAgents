"""
Investment Analyst - Layer 1.

Math: age-based glide path + risk tolerance + valuation tilt.
AI:   ASI:One generates the summary citing live market data.
"""
from __future__ import annotations

from typing import Any

from app.schemas import InvestmentReport, UserProfile
from app.llm import call_llm, Insight

_INSIGHT_SYSTEM = (
    "You are an investment analyst. Given an equity/bond allocation and live market data, "
    "write ONE sentence (max 30 words) explaining the portfolio rationale for this specific person. "
    "Include the actual P/E ratio or YTD return if it justifies a tilt decision."
)


def run(user: UserProfile, spy_pe: float = 22.0, treasury_10yr: float = 4.3) -> InvestmentReport:
    """
    Deterministic allocation with market-aware tilt.
    Called by run_investment_agent (async) and directly in unit tests.
    """
    adjustment = {
        "conservative": -15,
        "moderate": -5,
        "moderate_aggressive": 0,
        "aggressive": 5,
    }[user.risk_tolerance]

    equity_pct = 110 - user.age + adjustment

    # Valuation tilt: expensive US market → add international weight
    if spy_pe and spy_pe > 25:
        intl_tilt = True
        equity_pct -= 2  # slightly reduce domestic, shift to international
    else:
        intl_tilt = False

    # High treasury yield → bonds more competitive, nudge bond_pct up slightly
    if treasury_10yr > 4.5:
        equity_pct -= 3

    equity_pct = min(max(equity_pct, 40), 95)
    bond_pct = 100 - equity_pct

    # ETF selection
    etfs = ["VTI", "VXUS", "BND"]
    if intl_tilt:
        etfs = ["VTI", "VXUS", "BND", "SCHD"]  # extra international + dividend for stability
    if user.risk_tolerance == "aggressive":
        etfs = ["VTI", "VXUS", "QQQ", "BND"]

    return InvestmentReport(
        equity_pct=round(equity_pct, 2),
        bond_pct=round(bond_pct, 2),
        recommended_etfs=etfs,
        summary=f"{round(equity_pct):.0f}/{round(bond_pct):.0f} equity/bond, {', '.join(etfs)}.",
    )


async def run_investment_agent(profile: UserProfile, market: dict[str, Any]) -> InvestmentReport:
    """
    Full agent: allocation math with live valuations + LLM-generated insight.
    """
    equities = market.get("equities", {})
    spy_pe = (equities.get("SPY") or {}).get("forward_pe") or (equities.get("SPY") or {}).get("trailing_pe") or 22.0
    treasury_10yr = market.get("treasury_10yr", 4.3)

    vti_ytd = (equities.get("VTI") or {}).get("ytd_return_pct")
    vxus_ytd = (equities.get("VXUS") or {}).get("ytd_return_pct")
    bnd_yield = (equities.get("BND") or {}).get("dividend_yield_pct")

    report = run(profile, spy_pe=spy_pe, treasury_10yr=treasury_10yr)

    user_prompt = (
        f"{profile.name}, {profile.age}yo, risk tolerance: {profile.risk_tolerance}.\n"
        f"Allocation: {report.equity_pct:.0f}% equity / {report.bond_pct:.0f}% bonds\n"
        f"ETFs: {', '.join(report.recommended_etfs)}\n"
        f"Live market: SPY P/E {spy_pe:.1f} | 10yr Treasury {treasury_10yr:.2f}%"
        + (f" | VTI YTD {vti_ytd:+.1f}%" if vti_ytd is not None else "")
        + (f" | VXUS YTD {vxus_ytd:+.1f}%" if vxus_ytd is not None else "")
        + (f" | BND yield {bnd_yield:.2f}%" if bnd_yield else "")
    )

    insight = await call_llm(_INSIGHT_SYSTEM, user_prompt, Insight, temperature=0.3)
    return report.model_copy(update={"summary": insight.summary})
