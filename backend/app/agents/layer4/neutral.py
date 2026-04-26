"""
Neutral Risk Agent — Layer 4.

Validates the allocator's plan from a balanced perspective.
May propose minor rebalancing or endorse the plan as-is.
"""
from __future__ import annotations

from typing import Dict

from pydantic import BaseModel

from app.llm import call_llm
from app.schemas import AllocationPlan, RiskView, UserProfile


class _NeutralOut(BaseModel):
    adjustments: Dict[str, float]
    reasoning: str


_SYSTEM = (
    "You are a balanced risk analyst reviewing a proposed financial allocation. "
    "Your job is to objectively validate the plan and propose only necessary corrections. "
    "Rules you MUST follow:\n"
    "- Net adjustments must sum to exactly 0 across all buckets.\n"
    "- Keep individual adjustments small: ±1 to ±3 percentage points maximum.\n"
    "- If the plan is already well-balanced for the profile, return an empty adjustments dict {}.\n"
    "- Bucket names: cash_emergency, retirement, investing, house_fund, speculative.\n"
    "Justify any change with a specific imbalance you observe in the data."
)


async def run_neutral_risk(
    profile: UserProfile,
    allocation: AllocationPlan,
) -> RiskView:
    user_prompt = (
        f"Profile: {profile.name}, {profile.age}yo {profile.occupation}, "
        f"risk_tolerance={profile.risk_tolerance}, salary=${profile.annual_salary:,.0f}, "
        f"debt=${profile.debt_amount:,.0f}, savings=${profile.current_savings:,.0f}, "
        f"goal: {profile.primary_goal}\n\n"
        f"Proposed allocation:\n"
        f"  cash_emergency: {allocation.cash_emergency_pct:.1f}%  (${allocation.monthly_amounts.get('cash_emergency', 0):,.0f}/mo)\n"
        f"  retirement:     {allocation.retirement_pct:.1f}%  (${allocation.monthly_amounts.get('retirement', 0):,.0f}/mo)\n"
        f"  investing:      {allocation.investing_pct:.1f}%  (${allocation.monthly_amounts.get('investing', 0):,.0f}/mo)\n"
        f"  house_fund:     {allocation.house_fund_pct:.1f}%  (${allocation.monthly_amounts.get('house_fund', 0):,.0f}/mo)\n"
        f"  speculative:    {allocation.speculative_pct:.1f}%  (${allocation.monthly_amounts.get('speculative', 0):,.0f}/mo)\n\n"
        f"Allocator summary: {allocation.summary}\n\n"
        f"Provide neutral evaluation. Minor corrections or empty dict if balanced."
    )

    out = await call_llm(_SYSTEM, user_prompt, _NeutralOut, temperature=0.3)

    adj = {k: round(v, 2) for k, v in out.adjustments.items()}
    net = sum(adj.values())
    if abs(net) > 0.01 and adj:
        largest = max(adj, key=lambda k: abs(adj[k]))
        adj[largest] = round(adj[largest] - net, 2)

    return RiskView(stance="neutral", adjustments=adj, reasoning=out.reasoning)
