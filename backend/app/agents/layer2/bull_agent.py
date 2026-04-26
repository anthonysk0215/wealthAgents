"""
Bull Researcher — uAgent wrapper.

Run standalone (registers on Agentverse):
  cd backend && python3 -m app.agents.layer2.bull_agent
"""
from __future__ import annotations

import os

from uagents import Agent, Context, Model

from app.agents.layer2.bull import run_bull
from app.schemas import DebateRound, Layer1Reports, UserProfile


class BullRequest(Model):
    profile: dict
    layer1: dict
    prior_bear_rounds: list[dict]
    round_number: int


class BullResponse(Model):
    result: dict
    error: str = ""


agent = Agent(
    name="wealth_bull_researcher",
    seed=os.getenv("SEED_BULL", "wealth-bull-seed-v1"),
    mailbox=True,
)


@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info(f"Bull Researcher online | address: {agent.address}")


@agent.on_message(model=BullRequest, replies={BullResponse})
async def handle(ctx: Context, sender: str, msg: BullRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        layer1 = Layer1Reports(**msg.layer1)
        prior_bear_rounds = [DebateRound(**item) for item in msg.prior_bear_rounds]
        round_result = await run_bull(
            profile=profile,
            layer1=layer1,
            prior_bear_rounds=prior_bear_rounds,
            round_number=msg.round_number,
        )
        await ctx.send(sender, BullResponse(result=round_result.model_dump()))
    except Exception as exc:
        ctx.logger.error(f"Bull agent error: {exc}")
        await ctx.send(sender, BullResponse(result={}, error=str(exc)))


if __name__ == "__main__":
    agent.run()
