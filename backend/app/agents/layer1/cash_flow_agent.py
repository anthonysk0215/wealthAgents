"""
Cash Flow Analyst — uAgent wrapper.

Run standalone (registers on Agentverse):
  cd backend && python -m app.agents.layer1.cash_flow_agent

Prints its agent1q... address on startup.
"""
from __future__ import annotations

import os

from uagents import Agent, Context, Model

from app.agents.layer1.cash_flow import run_cash_flow_agent
from app.market_data import get_all_market_data
from app.schemas import UserProfile


# ── Message contracts ─────────────────────────────────────────────────────────

class CashFlowRequest(Model):
    profile: dict

class CashFlowResponse(Model):
    result: dict
    error: str = ""


# ── Agent identity ────────────────────────────────────────────────────────────

agent = Agent(
    name="wealth_cash_flow_analyst",
    seed=os.getenv("SEED_CASH_FLOW", "wealth-cash-flow-seed-v1"),
    mailbox=True,
)


# ── Handlers ─────────────────────────────────────────────────────────────────

@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info(f"Cash Flow Analyst online | address: {ctx.address}")


@agent.on_message(model=CashFlowRequest, replies={CashFlowResponse})
async def handle(ctx: Context, sender: str, msg: CashFlowRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        market = await get_all_market_data()
        report = await run_cash_flow_agent(profile, market)
        await ctx.send(sender, CashFlowResponse(result=report.model_dump()))
    except Exception as exc:
        ctx.logger.error(f"Cash flow error: {exc}")
        await ctx.send(sender, CashFlowResponse(result={}, error=str(exc)))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    agent.run()
