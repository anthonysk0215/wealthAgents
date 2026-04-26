"""
Aggressive Risk Agent — uAgent wrapper.

Run standalone:
  cd backend && python -m app.agents.layer4.aggressive_agent
"""
from __future__ import annotations

import os

from uagents import Agent, Context, Model

from app.agents.layer4.aggressive import run_aggressive_risk
from app.schemas import AllocationPlan, UserProfile


# ── Message contracts ─────────────────────────────────────────────────────────

class AggRiskRequest(Model):
    profile: dict
    allocation: dict

class AggRiskResponse(Model):
    result: dict
    error: str = ""


# ── Agent identity ────────────────────────────────────────────────────────────

agent = Agent(
    name="wealth_aggressive_risk",
    seed=os.getenv("SEED_AGG_RISK", "wealth-aggressive-risk-seed-v1"),
    mailbox=True,
)


# ── Handlers ─────────────────────────────────────────────────────────────────

@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info("Aggressive Risk Agent online")


@agent.on_message(model=AggRiskRequest, replies={AggRiskResponse})
async def handle(ctx: Context, sender: str, msg: AggRiskRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        allocation = AllocationPlan(**msg.allocation)
        view = await run_aggressive_risk(profile, allocation)
        await ctx.send(sender, AggRiskResponse(result=view.model_dump()))
    except Exception as exc:
        ctx.logger.error(f"Aggressive risk error: {exc}")
        await ctx.send(sender, AggRiskResponse(result={}, error=str(exc)))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    agent.run()
