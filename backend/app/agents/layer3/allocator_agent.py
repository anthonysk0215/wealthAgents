"""
Layer 3 Portfolio Allocator — uAgent wrapper.

Run standalone:
  cd backend && python -m app.agents.layer3.allocator_agent
"""
from __future__ import annotations

import os

from uagents import Agent, Context, Model

from app.agents.layer3.allocator import run_allocator
from app.agents.layer3.insight import run_allocation_insight
from app.schemas import DebateVerdict, Layer1Reports, UserProfile


# ── Message contracts ─────────────────────────────────────────────────────────

class AllocatorRequest(Model):
    profile: dict
    layer1: dict
    verdict: dict
    include_insight: bool = True


class AllocatorResponse(Model):
    result: dict
    insight: dict = {}
    error: str = ""
    insight_error: str = ""


# ── Agent identity ────────────────────────────────────────────────────────────

agent = Agent(
    name="wealth_layer3_allocator",
    seed=os.getenv("SEED_LAYER3_ALLOCATOR", "wealth-layer3-allocator-seed-v1"),
    mailbox=True,
)


# ── Handlers ─────────────────────────────────────────────────────────────────

@agent.on_event("startup")
async def on_startup(ctx: Context) -> None:
    ctx.logger.info(f"Layer 3 Allocator online | address: {ctx.address}")


@agent.on_message(model=AllocatorRequest, replies={AllocatorResponse})
async def handle(ctx: Context, sender: str, msg: AllocatorRequest) -> None:
    try:
        profile = UserProfile(**msg.profile)
        layer1 = Layer1Reports(**msg.layer1)
        verdict = DebateVerdict(**msg.verdict)

        allocation = await run_allocator(
            profile=profile,
            layer1=layer1,
            verdict=verdict,
        )

        insight = {}
        insight_error = ""
        if msg.include_insight:
            try:
                insight_report = await run_allocation_insight(
                    profile=profile,
                    layer1=layer1,
                    verdict=verdict,
                    allocation=allocation,
                )
                insight = insight_report.model_dump()
            except Exception as exc:
                insight_error = str(exc)
                ctx.logger.error(f"Layer 3 insight error: {exc}")

        await ctx.send(
            sender,
            AllocatorResponse(
                result=allocation.model_dump(),
                insight=insight,
                insight_error=insight_error,
            ),
        )
    except Exception as exc:
        ctx.logger.error(f"Layer 3 allocator error: {exc}")
        await ctx.send(sender, AllocatorResponse(result={}, error=str(exc)))


# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    agent.run()
