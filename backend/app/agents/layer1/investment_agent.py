"""
Investment Analyst — uAgent wrapper.

Run standalone (registers on Agentverse):
  cd backend && python -m app.agents.layer1.investment_agent
"""
from __future__ import annotations

import os

from uagents import Agent, Context, Model

from app.agents.layer1.investment import run_investment_agent
from app.market_data import get_all_market_data
from app.schemas import UserProfile


# ── Message contracts ─────────────────────────────────────────────────────────

class InvestmentRequest(Model):
    profile: dict

class InvestmentResponse(Model):
    result: dict
    error: str = ""


# ── Agent identity ────────────────────────────────────────────────────────────

agent = Agent(
    name="wealth_investment_analyst",
    seed=os.getenv("SEED_INVESTMENT", "wealth-investment-seed-v1"),
    mailbox=True,
)


# ── Handlers ─────────────────────────────────────────────────────────────────

@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info(f"Investment Analyst online | address: {ctx.address}")


@agent.on_message(model=InvestmentRequest, replies={InvestmentResponse})
async def handle(ctx: Context, sender: str, msg: InvestmentRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        market = await get_all_market_data()
        report = await run_investment_agent(profile, market)
        await ctx.send(sender, InvestmentResponse(result=report.model_dump()))
    except Exception as exc:
        ctx.logger.error(f"Investment error: {exc}")
        await ctx.send(sender, InvestmentResponse(result={}, error=str(exc)))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    agent.run()
