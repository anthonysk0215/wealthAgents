"""
Retirement Analyst — uAgent wrapper.

Run standalone (registers on Agentverse):
  cd backend && python -m app.agents.layer1.retirement_agent
"""
from __future__ import annotations

import os

from uagents import Agent, Context, Model

from app.agents.layer1.retirement import run_retirement_agent
from app.market_data import get_all_market_data
from app.schemas import UserProfile


# ── Message contracts ─────────────────────────────────────────────────────────

class RetirementRequest(Model):
    profile: dict

class RetirementResponse(Model):
    result: dict
    error: str = ""


# ── Agent identity ────────────────────────────────────────────────────────────

agent = Agent(
    name="wealth_retirement_analyst",
    seed=os.getenv("SEED_RETIREMENT", "wealth-retirement-seed-v1"),
    mailbox=True,
)


# ── Handlers ─────────────────────────────────────────────────────────────────

@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info(f"Retirement Analyst online | address: {ctx.address}")


@agent.on_message(model=RetirementRequest, replies={RetirementResponse})
async def handle(ctx: Context, sender: str, msg: RetirementRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        market = await get_all_market_data()
        report = await run_retirement_agent(profile, market)
        await ctx.send(sender, RetirementResponse(result=report.model_dump()))
    except Exception as exc:
        ctx.logger.error(f"Retirement error: {exc}")
        await ctx.send(sender, RetirementResponse(result={}, error=str(exc)))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    agent.run()
