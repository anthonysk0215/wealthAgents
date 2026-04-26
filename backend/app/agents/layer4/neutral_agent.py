"""
Neutral Risk Agent — uAgent wrapper.

Run standalone:
  cd backend && python -m app.agents.layer4.neutral_agent
"""
from __future__ import annotations

import os

from uagents import Agent, Context, Model

from app.agents.layer4.neutral import run_neutral_risk
from app.schemas import AllocationPlan, UserProfile


# ── Message contracts ─────────────────────────────────────────────────────────

class NeutralRiskRequest(Model):
    profile: dict
    allocation: dict

class NeutralRiskResponse(Model):
    result: dict
    error: str = ""


# ── Agent identity ────────────────────────────────────────────────────────────

agent = Agent(
    name="wealth_neutral_risk",
    seed=os.getenv("SEED_NEU_RISK", "wealth-neutral-risk-seed-v1"),
    mailbox=True,
)


# ── Handlers ─────────────────────────────────────────────────────────────────

@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info("Neutral Risk Agent online")


@agent.on_message(model=NeutralRiskRequest, replies={NeutralRiskResponse})
async def handle(ctx: Context, sender: str, msg: NeutralRiskRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        allocation = AllocationPlan(**msg.allocation)
        view = await run_neutral_risk(profile, allocation)
        await ctx.send(sender, NeutralRiskResponse(result=view.model_dump()))
    except Exception as exc:
        ctx.logger.error(f"Neutral risk error: {exc}")
        await ctx.send(sender, NeutralRiskResponse(result={}, error=str(exc)))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    agent.run()
