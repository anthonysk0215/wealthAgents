"""
Wealth Manager — uAgent wrapper.

Run standalone:
  cd backend && python -m app.agents.layer5.wealth_manager_agent
"""
from __future__ import annotations

import os

from uagents import Agent, Context, Model

from app.agents.layer5.wealth_manager import run_wealth_manager
from app.schemas import (
    AllocationPlan,
    DebateVerdict,
    FinalRiskDecision,
    Layer1Reports,
    UserProfile,
)


# ── Message contracts ─────────────────────────────────────────────────────────

class WealthManagerRequest(Model):
    profile: dict
    layer1: dict
    verdict: dict
    allocation: dict
    risk: dict


class WealthManagerResponse(Model):
    result: dict
    error: str = ""


# ── Agent identity ────────────────────────────────────────────────────────────

agent = Agent(
    name="wealth_final_manager",
    seed=os.getenv("SEED_WEALTH_MANAGER", "wealth-final-manager-seed-v1"),
    mailbox=True,
)


# ── Handlers ─────────────────────────────────────────────────────────────────

@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info(f"Wealth Manager online | address: {ctx.address}")


@agent.on_message(model=WealthManagerRequest, replies={WealthManagerResponse})
async def handle(ctx: Context, sender: str, msg: WealthManagerRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        layer1 = Layer1Reports(**msg.layer1)
        verdict = DebateVerdict(**msg.verdict)
        allocation = AllocationPlan(**msg.allocation)
        risk = FinalRiskDecision(**msg.risk)

        plan = await run_wealth_manager(
            profile=profile,
            layer1=layer1,
            verdict=verdict,
            allocation=allocation,
            risk=risk,
        )
        await ctx.send(sender, WealthManagerResponse(result=plan.model_dump()))
    except Exception as exc:
        ctx.logger.error(f"Wealth manager error: {exc}")
        await ctx.send(sender, WealthManagerResponse(result={}, error=str(exc)))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    agent.run()
