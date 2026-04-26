"""
Housing Analyst — uAgent wrapper.

Run standalone (registers on Agentverse):
  cd backend && python -m app.agents.layer1.housing_agent
"""
from __future__ import annotations

import os

from uagents import Agent, Context, Model

from app.agents.layer1.housing import run_housing_agent
from app.market_data import get_all_market_data
from app.schemas import UserProfile


# ── Message contracts ─────────────────────────────────────────────────────────

class HousingRequest(Model):
    profile: dict

class HousingResponse(Model):
    result: dict
    error: str = ""


# ── Agent identity ────────────────────────────────────────────────────────────

agent = Agent(
    name="wealth_housing_analyst",
    seed=os.getenv("SEED_HOUSING", "wealth-housing-seed-v1"),
    mailbox=True,
)


# ── Handlers ─────────────────────────────────────────────────────────────────

@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info(f"Housing Analyst online | address: {ctx.address}")


@agent.on_message(model=HousingRequest, replies={HousingResponse})
async def handle(ctx: Context, sender: str, msg: HousingRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        market = await get_all_market_data()
        report = await run_housing_agent(profile, market)
        await ctx.send(sender, HousingResponse(result=report.model_dump()))
    except Exception as exc:
        ctx.logger.error(f"Housing error: {exc}")
        await ctx.send(sender, HousingResponse(result={}, error=str(exc)))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    agent.run()
