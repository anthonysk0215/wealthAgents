"""
Investment Analyst - Layer 1.

Math: age-based glide path + risk tolerance + valuation tilt.
AI:   ASI:One proposes stock picks from public market snapshots.
"""
from __future__ import annotations

import json
from typing import Any

import httpx
from pydantic import BaseModel, Field

from app.schemas import InvestmentReport, StockIdea, UserProfile
from app.llm import call_llm

_SCREENERS = ("day_gainers", "most_actives")
_YAHOO_SCREEN_URL = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved"


class _StockPickResponse(BaseModel):
    individual_stock_ideas: list[StockIdea] = Field(
        description="Pick exactly 3 ideas from provided candidates"
    )


_STOCK_PICK_SYSTEM = (
    "You are a buy-side equity analyst. Choose exactly 3 individual stocks from the provided public-market candidates. "
    "Use recent performance, liquidity, size, and trend signals. "
    "All tickers must come from the candidate list. "
    "The sum of allocation_pct values must equal target_individual_stocks_pct exactly. "
    "Respect user risk tolerance: conservative favors stable mega-caps, aggressive can include higher beta."
)


def _stock_bucket_pct(risk_tolerance: str, spy_pe: float, treasury_10yr: float, vti_ytd: float | None) -> tuple[float, float]:
    base_individual = {
        "conservative": 10.0,
        "moderate": 20.0,
        "moderate_aggressive": 30.0,
        "aggressive": 40.0,
    }[risk_tolerance]

    if spy_pe > 25:
        base_individual -= 5.0
    if treasury_10yr > 4.5:
        base_individual -= 5.0
    if vti_ytd is not None and vti_ytd < -5:
        base_individual -= 5.0
    if vti_ytd is not None and vti_ytd > 15 and risk_tolerance in {"moderate_aggressive", "aggressive"}:
        base_individual += 5.0

    individual_pct = min(max(base_individual, 5.0), 45.0)
    etf_index_pct = 100.0 - individual_pct
    return round(etf_index_pct, 2), round(individual_pct, 2)


def _fallback_stock_ideas(individual_stock_pct: float) -> list[StockIdea]:
    fallback = [
        ("MSFT", "Large-cap quality with resilient cash flows", "AI and cloud demand remains durable"),
        ("JPM", "Diversified financial leader with strong balance sheet", "Rates and credit conditions support net interest profile"),
        ("JNJ", "Defensive healthcare cash-flow profile", "Healthcare demand remains steady through cycles"),
    ]
    per_stock = round(individual_stock_pct / 3.0, 2)
    ideas = [
        StockIdea(
            ticker=ticker,
            allocation_pct=per_stock,
            rationale=rationale,
            trend_signal=trend,
        )
        for ticker, rationale, trend in fallback
    ]
    if ideas:
        allocated = round(sum(i.allocation_pct for i in ideas), 2)
        drift = round(individual_stock_pct - allocated, 2)
        ideas[-1].allocation_pct = round(ideas[-1].allocation_pct + drift, 2)
    return ideas


async def _fetch_screener_quotes(screener_name: str, count: int = 12) -> list[dict[str, Any]]:
    params = {"scrIds": screener_name, "count": count, "formatted": "false"}
    async with httpx.AsyncClient(timeout=8.0) as client:
        resp = await client.get(_YAHOO_SCREEN_URL, params=params)
        resp.raise_for_status()
    payload = resp.json()
    quotes = (
        payload.get("finance", {})
        .get("result", [{}])[0]
        .get("quotes", [])
    )
    return quotes if isinstance(quotes, list) else []


def _normalize_candidate(quote: dict[str, Any]) -> dict[str, Any] | None:
    symbol = quote.get("symbol")
    price = quote.get("regularMarketPrice")
    market_cap = quote.get("marketCap")
    volume = quote.get("regularMarketVolume")
    change_pct = quote.get("regularMarketChangePercent")

    if not symbol or price is None or market_cap is None or volume is None or change_pct is None:
        return None
    if market_cap < 5_000_000_000 or volume < 1_000_000:
        return None

    return {
        "ticker": symbol,
        "price": round(float(price), 2),
        "market_cap_bil": round(float(market_cap) / 1_000_000_000, 2),
        "volume_mil": round(float(volume) / 1_000_000, 2),
        "day_change_pct": round(float(change_pct), 2),
        "sector": quote.get("sector") or "unknown",
        "name": quote.get("shortName") or quote.get("longName") or symbol,
    }


async def _gather_public_stock_candidates(limit: int = 15) -> list[dict[str, Any]]:
    merged: dict[str, dict[str, Any]] = {}
    for screener in _SCREENERS:
        try:
            quotes = await _fetch_screener_quotes(screener)
        except Exception:
            continue
        for q in quotes:
            normalized = _normalize_candidate(q)
            if normalized:
                merged[normalized["ticker"]] = normalized

    candidates = sorted(
        merged.values(),
        key=lambda x: (x["market_cap_bil"], abs(x["day_change_pct"]), x["volume_mil"]),
        reverse=True,
    )
    return candidates[:limit]


async def _llm_select_stock_ideas(
    user: UserProfile,
    candidates: list[dict[str, Any]],
    individual_stock_pct: float,
) -> list[StockIdea]:
    if not candidates:
        return _fallback_stock_ideas(individual_stock_pct)

    user_prompt = json.dumps(
        {
            "user_profile": {
                "age": user.age,
                "industry": user.industry,
                "occupation": user.occupation,
                "risk_tolerance": user.risk_tolerance,
                "primary_goal": user.primary_goal,
            },
            "target_individual_stocks_pct": individual_stock_pct,
            "candidate_stocks_public_market_data": candidates,
            "constraints": {
                "exactly_three_stocks": True,
                "must_use_candidate_tickers_only": True,
                "sum_allocation_pct_equals_target": True,
                "no_single_stock_over_pct_of_total_portfolio": max(10.0, round(individual_stock_pct * 0.5, 2)),
            },
        },
        indent=2,
    )

    try:
        llm_resp = await call_llm(
            system_prompt=_STOCK_PICK_SYSTEM,
            user_prompt=user_prompt,
            output_model=_StockPickResponse,
            temperature=0.35,
            max_tokens=900,
        )
        ideas = llm_resp.individual_stock_ideas[:3]
        for idea in ideas:
            idea.ticker = idea.ticker.upper()
        valid_tickers = {c["ticker"] for c in candidates}
        ideas = [i for i in ideas if i.ticker in valid_tickers]
        if len(ideas) < 3:
            return _fallback_stock_ideas(individual_stock_pct)
        allocated = round(sum(i.allocation_pct for i in ideas), 2)
        drift = round(individual_stock_pct - allocated, 2)
        ideas[-1].allocation_pct = round(ideas[-1].allocation_pct + drift, 2)
        return ideas
    except Exception:
        return _fallback_stock_ideas(individual_stock_pct)


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

    etf_index_funds_pct, individual_stocks_pct = _stock_bucket_pct(
        risk_tolerance=user.risk_tolerance,
        spy_pe=spy_pe,
        treasury_10yr=treasury_10yr,
        vti_ytd=None,
    )

    return InvestmentReport(
        equity_pct=round(equity_pct, 2),
        bond_pct=round(bond_pct, 2),
        recommended_etfs=etfs,
        etf_index_funds_pct=etf_index_funds_pct,
        individual_stocks_pct=individual_stocks_pct,
        individual_stock_ideas=_fallback_stock_ideas(individual_stocks_pct),
        summary=(
            f"{round(equity_pct):.0f}/{round(bond_pct):.0f} equity/bond, "
            f"{etf_index_funds_pct:.0f}% ETFs/index + {individual_stocks_pct:.0f}% individual stocks."
        ),
    )


async def run_investment_agent(profile: UserProfile, market: dict[str, Any]) -> InvestmentReport:
    """
    Full agent: allocation math with live valuations + public candidate gather + LLM stock selection.
    """
    equities = market.get("equities", {})
    spy_pe = (equities.get("SPY") or {}).get("forward_pe") or (equities.get("SPY") or {}).get("trailing_pe") or 22.0
    treasury_10yr = market.get("treasury_10yr", 4.3)
    vti_ytd = (equities.get("VTI") or {}).get("ytd_return_pct")

    report = run(profile, spy_pe=spy_pe, treasury_10yr=treasury_10yr)
    etf_index_funds_pct, individual_stocks_pct = _stock_bucket_pct(
        risk_tolerance=profile.risk_tolerance,
        spy_pe=spy_pe,
        treasury_10yr=treasury_10yr,
        vti_ytd=vti_ytd,
    )
    candidate_snapshot = await _gather_public_stock_candidates(limit=15)
    stock_ideas = await _llm_select_stock_ideas(
        user=profile,
        candidates=candidate_snapshot,
        individual_stock_pct=individual_stocks_pct,
    )
    ytd_str = f"; VTI YTD {vti_ytd:+.1f}%" if vti_ytd is not None else ""
    summary = (
        f"{report.equity_pct:.0f}/{report.bond_pct:.0f} equity/bond via {', '.join(report.recommended_etfs)}"
        f" | split: {etf_index_funds_pct:.0f}% ETFs/index, {individual_stocks_pct:.0f}% individual stocks"
        f" | picks: {', '.join(idea.ticker for idea in stock_ideas)}"
        f" (10yr Treasury {treasury_10yr:.2f}%{ytd_str})."
    )
    return report.model_copy(
        update={
            "etf_index_funds_pct": etf_index_funds_pct,
            "individual_stocks_pct": individual_stocks_pct,
            "individual_stock_ideas": stock_ideas,
            "summary": summary,
        }
    )
