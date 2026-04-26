"""
Debate Facilitator — uAgent wrapper.

Run standalone (registers on Agentverse):
  cd backend && python3 -m app.agents.layer2.facilitator_agent
"""
from __future__ import annotations

import os

from uagents import Agent, Context, Model

from app.agents.layer2.facilitator import run_facilitator
from app.schemas import DebateRound, Layer1Reports, UserProfile


class FacilitatorRequest(Model):
    profile: dict
    bull_rounds: list[dict]
    bear_rounds: list[dict]
    layer1: dict | None = None


class FacilitatorResponse(Model):
    result: dict
    error: str = ""


agent = Agent(
    name="wealth_debate_facilitator",
    seed=os.getenv("SEED_FACILITATOR", "wealth-facilitator-seed-v1"),
    mailbox=True,
)


@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info(f"Debate Facilitator online | address: {agent.address}")


@agent.on_message(model=FacilitatorRequest, replies={FacilitatorResponse})
async def handle(ctx: Context, sender: str, msg: FacilitatorRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        bull_rounds = [DebateRound(**item) for item in msg.bull_rounds]
        bear_rounds = [DebateRound(**item) for item in msg.bear_rounds]
        layer1 = Layer1Reports(**msg.layer1) if msg.layer1 is not None else None
        verdict = await run_facilitator(
            profile=profile,
            bull_rounds=bull_rounds,
            bear_rounds=bear_rounds,
            layer1=layer1,
        )
        await ctx.send(sender, FacilitatorResponse(result=verdict.model_dump()))
    except Exception as exc:
        ctx.logger.error(f"Facilitator agent error: {exc}")
        await ctx.send(sender, FacilitatorResponse(result={}, error=str(exc)))


if __name__ == "__main__":
    agent.run()
