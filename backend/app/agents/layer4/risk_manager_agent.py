"""
Risk Manager — uAgent wrapper.

Run standalone:
  cd backend && python -m app.agents.layer4.risk_manager_agent
"""
from __future__ import annotations

import os
from typing import List

from uagents import Agent, Context, Model

from app.agents.layer4.risk_manager import run_risk_manager
from app.schemas import AllocationPlan, RiskView, UserProfile


# ── Message contracts ─────────────────────────────────────────────────────────

class RiskManagerRequest(Model):
    profile: dict
    allocation: dict
    views: List[dict]

class RiskManagerResponse(Model):
    result: dict
    error: str = ""


# ── Agent identity ────────────────────────────────────────────────────────────

agent = Agent(
    name="wealth_risk_manager",
    seed=os.getenv("SEED_RISK_MGR", "wealth-risk-manager-seed-v1"),
    mailbox=True,
)


# ── Handlers ─────────────────────────────────────────────────────────────────

@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info("Risk Manager online")


@agent.on_message(model=RiskManagerRequest, replies={RiskManagerResponse})
async def handle(ctx: Context, sender: str, msg: RiskManagerRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        allocation = AllocationPlan(**msg.allocation)
        views = [RiskView(**v) for v in msg.views]
        decision = await run_risk_manager(profile, allocation, views)
        await ctx.send(sender, RiskManagerResponse(result=decision.model_dump()))
    except Exception as exc:
        ctx.logger.error(f"Risk manager error: {exc}")
        await ctx.send(sender, RiskManagerResponse(result={}, error=str(exc)))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    agent.run()
