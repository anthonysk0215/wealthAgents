"""
Bear Researcher — uAgent wrapper.

Run standalone (registers on Agentverse):
  cd backend && python3 -m app.agents.layer2.bear_agent
"""
from __future__ import annotations

import os

from uagents import Agent, Context, Model

from app.agents.layer2.bear import run_bear
from app.schemas import DebateRound, Layer1Reports, UserProfile


class BearRequest(Model):
    profile: dict
    layer1: dict
    prior_bull_rounds: list[dict]
    round_number: int


class BearResponse(Model):
    result: dict
    error: str = ""


agent = Agent(
    name="wealth_bear_researcher",
    seed=os.getenv("SEED_BEAR", "wealth-bear-seed-v1"),
    mailbox=True,
)


@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info(f"Bear Researcher online | address: {agent.address}")


@agent.on_message(model=BearRequest, replies={BearResponse})
async def handle(ctx: Context, sender: str, msg: BearRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        layer1 = Layer1Reports(**msg.layer1)
        prior_bull_rounds = [DebateRound(**item) for item in msg.prior_bull_rounds]
        round_result = await run_bear(
            profile=profile,
            layer1=layer1,
            prior_bull_rounds=prior_bull_rounds,
            round_number=msg.round_number,
        )
        await ctx.send(sender, BearResponse(result=round_result.model_dump()))
    except Exception as exc:
        ctx.logger.error(f"Bear agent error: {exc}")
        await ctx.send(sender, BearResponse(result={}, error=str(exc)))


if __name__ == "__main__":
    agent.run()
