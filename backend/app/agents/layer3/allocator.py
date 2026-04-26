"""
Portfolio Allocator - Layer 3.

Combines Layer 1 reports and the debate verdict's aggression dial into a
five-bucket monthly allocation plan.
"""
from __future__ import annotations

try:
    from app.schemas import AllocationPlan, DebateVerdict, Layer1Reports, UserProfile
except ModuleNotFoundError:  # Supports running from backend/app as the app root.
    from schemas import AllocationPlan, DebateVerdict, Layer1Reports, UserProfile


def _clamp(value: float, lower: float, upper: float) -> float:
    return min(max(value, lower), upper)


def _monthly_amounts(monthly_surplus: float, percentages: dict[str, float]) -> dict[str, float]:
    return {
        key: round(monthly_surplus * pct / 100, 2)
        for key, pct in percentages.items()
    }


def run(
    profile: UserProfile,
    layer1: Layer1Reports,
    verdict: DebateVerdict,
) -> AllocationPlan:
    monthly_surplus = max(layer1.cash_flow.monthly_surplus, 0.0)
    aggression = _clamp(verdict.aggression_dial, 0.0, 1.0)

    if monthly_surplus == 0:
        return AllocationPlan(
            cash_emergency_pct=100.0,
            retirement_pct=0.0,
            investing_pct=0.0,
            house_fund_pct=0.0,
            speculative_pct=0.0,
            monthly_amounts={
                "cash_emergency": 0.0,
                "retirement": 0.0,
                "investing": 0.0,
                "house_fund": 0.0,
                "speculative": 0.0,
            },
            summary="No positive surplus is available, so new allocation should pause.",
        )

    emergency_target = profile.monthly_expenses * 6
    needs_emergency = profile.current_savings < emergency_target

    match_monthly = profile.annual_salary * profile.employer_401k_match / 100 / 12
    match_pct = match_monthly / monthly_surplus * 100 if monthly_surplus else 0.0
    retirement_target_pct = layer1.retirement.annual_retirement_contribution / 12 / monthly_surplus * 100

    house_need_pct = layer1.housing.required_monthly_savings / monthly_surplus * 100
    house_cap = 45.0 if layer1.housing.feasible else 25.0

    cash_emergency_pct = 10.0 if needs_emergency else 5.0
    retirement_pct = _clamp(max(match_pct, min(retirement_target_pct, 30.0)), 0.0, 35.0)
    house_fund_pct = _clamp(house_need_pct if layer1.housing.feasible else house_need_pct * 0.5, 0.0, house_cap)
    speculative_pct = round(2.0 + aggression * 8.0, 2)

    fixed_cash_pct = cash_emergency_pct
    percentages = {
        "cash_emergency": cash_emergency_pct,
        "retirement": retirement_pct,
        "house_fund": house_fund_pct,
        "speculative": speculative_pct,
    }

    flexible_reserved = retirement_pct + house_fund_pct + speculative_pct
    flexible_cap = 100.0 - fixed_cash_pct
    if flexible_reserved > flexible_cap:
        scale = flexible_cap / flexible_reserved
        percentages["retirement"] = retirement_pct * scale
        percentages["house_fund"] = house_fund_pct * scale
        percentages["speculative"] = speculative_pct * scale

    investing_pct = 100.0 - sum(percentages.values())
    percentages["investing"] = investing_pct

    percentages = {key: round(value, 2) for key, value in percentages.items()}
    difference = round(100 - sum(percentages.values()), 2)
    percentages["investing"] = round(percentages["investing"] + difference, 2)
    monthly_amounts = _monthly_amounts(monthly_surplus, percentages)

    summary = (
        "Balances emergency reserves, retirement, and the home goal with a small "
        "speculative bucket."
    )

    return AllocationPlan(
        cash_emergency_pct=percentages["cash_emergency"],
        retirement_pct=percentages["retirement"],
        investing_pct=percentages["investing"],
        house_fund_pct=percentages["house_fund"],
        speculative_pct=percentages["speculative"],
        monthly_amounts=monthly_amounts,
        summary=summary,
    )


async def run_allocator(
    profile: UserProfile,
    layer1: Layer1Reports,
    verdict: DebateVerdict,
) -> AllocationPlan:
    return run(profile, layer1, verdict)
