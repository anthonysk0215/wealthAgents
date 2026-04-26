"""
WealthAgents — Orchestrator.

Runs the 5-layer pipeline in the order prescribed by the spec:
  Layer 1 — 4 analysts in parallel
  Layer 2 — 3-round bull/bear debate (sequential), then facilitator
  Layer 3 — Portfolio allocator
  Layer 4 — 3 risk views in parallel, then risk manager
  Layer 5 — Wealth manager (final synthesis)

Called by main.py:
  plan = await run_pipeline(profile, on_event=on_event)

`on_event(stage, payload_dict)` is a sync callback; it puts events
onto the asyncio.Queue that the SSE stream drains.
"""
from __future__ import annotations

import asyncio
from typing import Any, Callable

from app.schemas import (
    Layer1Reports,
    UserProfile,
    WealthPlan,
)
from app.market_data import get_all_market_data
from app.agents.layer1 import (
    run_cash_flow_agent,
    run_housing_agent,
    run_investment_agent,
    run_retirement_agent,
)
from app.agents.layer2 import run_bear, run_bull, run_facilitator
from app.agents.layer3 import run_allocator
from app.agents.layer4 import (
    run_aggressive_risk,
    run_conservative_risk,
    run_neutral_risk,
    run_risk_manager,
)
from app.agents.layer5 import run_wealth_manager


async def run_pipeline(
    profile: UserProfile,
    on_event: Callable[[str, Any], None],
) -> WealthPlan:
    """
    Execute the full 17-call multi-agent pipeline and return the final WealthPlan.

    `on_event` is fired synchronously after each agent completes, giving the
    SSE stream a real-time view of agent progress.
    """
    transcript: list[dict] = []

    def fire(stage: str, payload: Any) -> None:
        data = payload.model_dump() if hasattr(payload, "model_dump") else dict(payload)
        on_event(stage, data)
        transcript.append({"stage": stage, "payload": data})

    # ── LAYER 1 — fetch live market data, then run 4 analysts in parallel ──────
    fire("layer1_start", {"message": "Fetching live market data..."})
    market = await get_all_market_data()
    fire("market_data", {
        "mortgage_rate_30yr": market["mortgage_rate_30yr"],
        "treasury_10yr": market["treasury_10yr"],
        "cpi_yoy": market["cpi_yoy"],
    })

    cf, ret, hou, inv = await asyncio.gather(
        run_cash_flow_agent(profile, market),
        run_retirement_agent(profile, market),
        run_housing_agent(profile, market),
        run_investment_agent(profile, market),
    )

    layer1 = Layer1Reports(cash_flow=cf, retirement=ret, housing=hou, investment=inv)

    fire("cash_flow",   cf)
    fire("retirement",  ret)
    fire("housing",     hou)
    fire("investments", inv)

    # ── LAYER 2 — 3-round sequential bull / bear debate ───────────────────────
    bull_rounds: list = []
    bear_rounds: list = []

    for round_number in range(1, 4):
        bull = await run_bull(
            profile=profile,
            layer1=layer1,
            prior_bear_rounds=bear_rounds,
            round_number=round_number,
        )
        bull_rounds.append(bull)
        fire(f"bull_round_{round_number}", bull)

        bear = await run_bear(
            profile=profile,
            layer1=layer1,
            prior_bull_rounds=bull_rounds,
            round_number=round_number,
        )
        bear_rounds.append(bear)
        fire(f"bear_round_{round_number}", bear)

    verdict = await run_facilitator(
        profile=profile,
        bull_rounds=bull_rounds,
        bear_rounds=bear_rounds,
        layer1=layer1,
    )
    fire("debate_verdict", verdict)

    # ── LAYER 3 — Portfolio allocator ────────────────────────────────────────
    allocation = await run_allocator(
        profile=profile,
        layer1=layer1,
        verdict=verdict,
    )
    fire("allocation_proposed", allocation)

    # ── LAYER 4 — 3 risk views in parallel, then risk manager ────────────────
    agg, neu, con = await asyncio.gather(
        run_aggressive_risk(profile=profile, allocation=allocation),
        run_neutral_risk(profile=profile, allocation=allocation),
        run_conservative_risk(profile=profile, allocation=allocation),
    )

    fire("risk_aggressive",   agg)
    fire("risk_neutral",      neu)
    fire("risk_conservative", con)

    risk = await run_risk_manager(
        profile=profile,
        allocation=allocation,
        views=[agg, neu, con],
    )
    fire("risk_final", risk)

    # ── LAYER 5 — Wealth manager final synthesis ─────────────────────────────
    plan = await run_wealth_manager(
        profile=profile,
        layer1=layer1,
        verdict=verdict,
        allocation=allocation,
        risk=risk,
    )

    # Fire wealth_plan *before* attaching transcript so the SSE payload is clean.
    fire("wealth_plan", plan)

    # Attach full transcript for the collapsible agent view in the dashboard.
    # main.py sends this as the `done` event payload via plan.model_dump_json().
    plan = plan.model_copy(update={"agent_transcript": transcript})

    return plan
