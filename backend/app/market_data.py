"""
WealthAgents — Real market data fetcher.

Sources:
  • FRED (Federal Reserve Economic Data) — mortgage rates, treasury yields, CPI
  • yfinance — ETF prices, P/E ratios, YTD returns

No API key required for either source.
Results are cached for 60 minutes so 4 parallel Layer 1 agents don't each
make redundant network calls.

Usage:
  market = await get_all_market_data()
  mortgage_rate = market["mortgage_rate_30yr"]   # e.g. 6.87
"""
from __future__ import annotations

import asyncio
import time
from typing import Any

import httpx

try:
    import yfinance as yf
    _YF_AVAILABLE = True
except ImportError:
    _YF_AVAILABLE = False

# ── Module-level cache ────────────────────────────────────────────────────────
_cache: dict[str, Any] = {}
_cache_ts: float = 0.0
_CACHE_TTL = 3600  # 1 hour


# ── FRED helpers ─────────────────────────────────────────────────────────────

async def _fred(series_id: str, fallback: float) -> float:
    """Fetch the latest value for a FRED series. Returns fallback on any error."""
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://fred.stlouisfed.org/graph/fredgraph.csv",
                params={"id": series_id},
            )
            rows = [r for r in resp.text.strip().splitlines() if r and not r.startswith("DATE")]
            for row in reversed(rows):
                parts = row.split(",")
                if len(parts) == 2 and parts[1].strip() not in ("", "."):
                    return float(parts[1])
    except Exception:
        pass
    return fallback


async def get_mortgage_rate_30yr() -> float:
    """Current 30-year fixed mortgage rate (%). Fallback: 6.8."""
    return await _fred("MORTGAGE30US", 6.8)


async def get_treasury_10yr() -> float:
    """Current 10-year Treasury yield (%). Fallback: 4.3."""
    return await _fred("DGS10", 4.3)


async def get_cpi_yoy() -> float:
    """CPI year-over-year inflation rate (%). Fallback: 3.2."""
    try:
        async with httpx.AsyncClient(timeout=6.0) as client:
            resp = await client.get(
                "https://fred.stlouisfed.org/graph/fredgraph.csv",
                params={"id": "CPIAUCSL"},
            )
            rows = [r for r in resp.text.strip().splitlines() if r and not r.startswith("DATE")]
            numeric = [
                float(r.split(",")[1])
                for r in rows
                if len(r.split(",")) == 2 and r.split(",")[1].strip() not in ("", ".")
            ]
            if len(numeric) >= 13:
                return round((numeric[-1] - numeric[-13]) / numeric[-13] * 100, 2)
    except Exception:
        pass
    return 3.2


# ── yfinance helpers ─────────────────────────────────────────────────────────

def _fetch_equity_sync() -> dict[str, dict]:
    """Fetch ETF data synchronously (run in executor). Gracefully handles failures."""
    symbols = ["VTI", "VXUS", "BND", "SPY", "QQQ", "SCHD"]
    results: dict[str, dict] = {}

    for symbol in symbols:
        try:
            t = yf.Ticker(symbol)
            info = t.info or {}
            hist = t.history(period="1y", auto_adjust=True)
            ytd_return = None
            if not hist.empty and len(hist) > 20:
                ytd_return = round(
                    (hist["Close"].iloc[-1] - hist["Close"].iloc[0])
                    / hist["Close"].iloc[0]
                    * 100,
                    2,
                )
            results[symbol] = {
                "price": info.get("regularMarketPrice") or info.get("previousClose"),
                "forward_pe": info.get("forwardPE"),
                "trailing_pe": info.get("trailingPE"),
                "dividend_yield_pct": round((info.get("dividendYield") or 0) * 100, 2),
                "ytd_return_pct": ytd_return,
            }
        except Exception:
            results[symbol] = {}

    return results


async def get_equity_data() -> dict[str, dict]:
    if not _YF_AVAILABLE:
        return {}
    loop = asyncio.get_event_loop()
    try:
        return await asyncio.wait_for(
            loop.run_in_executor(None, _fetch_equity_sync),
            timeout=15.0,
        )
    except Exception:
        return {}


# ── Main entry point ─────────────────────────────────────────────────────────

async def get_all_market_data() -> dict[str, Any]:
    """
    Fetch all market data in parallel and return a flat dict.
    Cached for 60 minutes — safe to call at the start of every pipeline run.

    Keys:
      mortgage_rate_30yr  (float, %)
      treasury_10yr       (float, %)
      cpi_yoy             (float, %)
      equities            (dict[symbol, dict])
    """
    global _cache, _cache_ts

    if _cache and (time.monotonic() - _cache_ts) < _CACHE_TTL:
        return _cache

    mortgage, treasury, cpi, equity = await asyncio.gather(
        get_mortgage_rate_30yr(),
        get_treasury_10yr(),
        get_cpi_yoy(),
        get_equity_data(),
    )

    _cache = {
        "mortgage_rate_30yr": mortgage,
        "treasury_10yr": treasury,
        "cpi_yoy": cpi,
        "equities": equity,
    }
    _cache_ts = time.monotonic()
    return _cache
