"""
Conservative Risk Agent — Layer 4.

Argues for capital preservation: larger cash buffer, less speculation,
and reduced equity exposure relative to the allocator's plan.
"""
from __future__ import annotations

from typing import Dict

from pydantic import BaseModel

from app.llm import call_llm
from app.schemas import AllocationPlan, RiskView, UserProfile


class _ConOut(BaseModel):
    adjustments: Dict[str, float]
    reasoning: str


_SYSTEM = (
    "You are a conservative risk analyst focused on capital preservation and downside protection. "
    "Your job is to identify risks in the proposed allocation and propose safety-first corrections. "
    "Rules you MUST follow:\n"
    "- Net adjustments must sum to exactly 0 across all buckets.\n"
    "- Prefer shifting FROM speculative/investing TOWARD cash_emergency or retirement.\n"
    "- speculative cannot go below 0%.\n"
    "- cash_emergency cannot exceed 40% of the total allocation.\n"
    "- Maximum shift per bucket: ±10 percentage points.\n"
    "- Bucket names: cash_emergency, retirement, investing, house_fund, speculative.\n"
    "Ground every recommendation in the user's specific risk factors (debt, savings cushion, job security)."
)


async def run_conservative_risk(
    profile: UserProfile,
    allocation: AllocationPlan,
) -> RiskView:
    months_emergency = profile.current_savings / max(profile.monthly_expenses, 1)

    user_prompt = (
        f"Profile: {profile.name}, {profile.age}yo {profile.occupation}, "
        f"risk_tolerance={profile.risk_tolerance}, salary=${profile.annual_salary:,.0f}, "
        f"debt=${profile.debt_amount:,.0f} @ {profile.debt_interest_rate:.1f}%, "
        f"savings=${profile.current_savings:,.0f} ({months_emergency:.1f} months expenses covered), "
        f"goal: {profile.primary_goal}\n\n"
        f"Proposed allocation:\n"
        f"  cash_emergency: {allocation.cash_emergency_pct:.1f}%  (${allocation.monthly_amounts.get('cash_emergency', 0):,.0f}/mo)\n"
        f"  retirement:     {allocation.retirement_pct:.1f}%  (${allocation.monthly_amounts.get('retirement', 0):,.0f}/mo)\n"
        f"  investing:      {allocation.investing_pct:.1f}%  (${allocation.monthly_amounts.get('investing', 0):,.0f}/mo)\n"
        f"  house_fund:     {allocation.house_fund_pct:.1f}%  (${allocation.monthly_amounts.get('house_fund', 0):,.0f}/mo)\n"
        f"  speculative:    {allocation.speculative_pct:.1f}%  (${allocation.monthly_amounts.get('speculative', 0):,.0f}/mo)\n\n"
        f"Allocator summary: {allocation.summary}\n\n"
        f"Propose conservative adjustments to protect against downside risk."
    )

    out = await call_llm(_SYSTEM, user_prompt, _ConOut, temperature=0.4)

    adj = {k: round(v, 2) for k, v in out.adjustments.items()}
    net = sum(adj.values())
    if abs(net) > 0.01 and adj:
        largest = max(adj, key=lambda k: abs(adj[k]))
        adj[largest] = round(adj[largest] - net, 2)

    return RiskView(stance="conservative", adjustments=adj, reasoning=out.reasoning)
