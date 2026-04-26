"""
Conservative Risk Agent — uAgent wrapper.

Run standalone:
  cd backend && python -m app.agents.layer4.conservative_agent
"""
from __future__ import annotations

import os

from uagents import Agent, Context, Model

from app.agents.layer4.conservative import run_conservative_risk
from app.schemas import AllocationPlan, UserProfile


# ── Message contracts ─────────────────────────────────────────────────────────

class ConRiskRequest(Model):
    profile: dict
    allocation: dict

class ConRiskResponse(Model):
    result: dict
    error: str = ""


# ── Agent identity ────────────────────────────────────────────────────────────

agent = Agent(
    name="wealth_conservative_risk",
    seed=os.getenv("SEED_CON_RISK", "wealth-conservative-risk-seed-v1"),
    mailbox=True,
)


# ── Handlers ─────────────────────────────────────────────────────────────────

@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info("Conservative Risk Agent online")


@agent.on_message(model=ConRiskRequest, replies={ConRiskResponse})
async def handle(ctx: Context, sender: str, msg: ConRiskRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        allocation = AllocationPlan(**msg.allocation)
        view = await run_conservative_risk(profile, allocation)
        await ctx.send(sender, ConRiskResponse(result=view.model_dump()))
    except Exception as exc:
        ctx.logger.error(f"Conservative risk error: {exc}")
        await ctx.send(sender, ConRiskResponse(result={}, error=str(exc)))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    agent.run()
