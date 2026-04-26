"""
Retirement Analyst - Layer 1.

Math: 401k/Roth recommendations, IRS 2025 limits, benchmark check.
AI:   ASI:One generates the summary using live treasury yield context.
"""
from __future__ import annotations

from typing import Any

from app.schemas import RetirementReport, UserProfile
from app.llm import call_llm, Insight

# IRS 2025 limits
_401K_LIMIT = 23_500
_IRA_LIMIT = 7_000
_ROTH_PHASE_OUT_START = 150_000   # single filer
_ROTH_PHASE_OUT_END = 165_000

_INSIGHT_SYSTEM = (
    "You are a retirement planning analyst. Given precise contribution numbers and the "
    "current 10-year Treasury yield, write ONE sentence (max 30 words) that tells this "
    "person the most important thing about their retirement strategy. Be specific — "
    "mention actual dollar amounts and whether they are on track vs the benchmark."
)


def _recommended_401k_pct(user: UserProfile) -> float:
    by_risk = {
        "conservative": 8.0,
        "moderate": 10.0,
        "moderate_aggressive": 12.0,
        "aggressive": 15.0,
    }
    return max(user.employer_401k_match, by_risk[user.risk_tolerance])


def _on_track(user: UserProfile) -> tuple[bool, str]:
    """Check retirement balance against age-based benchmarks (1×, 2×, 3× salary)."""
    benchmarks = {30: 1.0, 35: 2.0, 40: 3.0, 45: 4.0, 50: 6.0}
    for age_cutoff in sorted(benchmarks):
        if user.age <= age_cutoff:
            target = user.annual_salary * benchmarks[age_cutoff]
            status = "on track" if user.retirement_balance >= target else "behind"
            return user.retirement_balance >= target, (
                f"{status} (have ${user.retirement_balance:,.0f}, "
                f"benchmark at {age_cutoff} is ${target:,.0f})"
            )
    target = user.annual_salary * 8.0
    status = "on track" if user.retirement_balance >= target else "behind"
    return user.retirement_balance >= target, f"{status} (benchmark ${target:,.0f})"


def run(user: UserProfile) -> RetirementReport:
    """
    Deterministic retirement math.
    Called by run_retirement_agent (async) and directly in unit tests.
    """
    recommended_401k_pct = _recommended_401k_pct(user)
    annual_401k = min(user.annual_salary * recommended_401k_pct / 100, _401K_LIMIT)
    roth_ira_eligible = user.annual_salary < _ROTH_PHASE_OUT_END
    roth_ira_amount = _IRA_LIMIT if user.annual_salary < _ROTH_PHASE_OUT_START else (
        _IRA_LIMIT * (1 - (user.annual_salary - _ROTH_PHASE_OUT_START) /
                      (_ROTH_PHASE_OUT_END - _ROTH_PHASE_OUT_START))
        if roth_ira_eligible else 0
    )
    annual_retirement_contribution = annual_401k + roth_ira_amount
    captures_full_match = recommended_401k_pct >= user.employer_401k_match

    if roth_ira_eligible:
        summary = "Capture the full match and add a Roth IRA for tax diversification."
    else:
        summary = "Capture the full match and max out pre-tax 401k contributions."

    return RetirementReport(
        recommended_401k_pct=round(recommended_401k_pct, 2),
        roth_ira_eligible=roth_ira_eligible,
        captures_full_match=captures_full_match,
        annual_retirement_contribution=round(annual_retirement_contribution, 2),
        summary=summary,
    )


async def run_retirement_agent(profile: UserProfile, market: dict[str, Any]) -> RetirementReport:
    """
    Full agent: retirement math + live treasury context + LLM-generated insight.
    """
    treasury_10yr = market.get("treasury_10yr", 4.3)
    report = run(profile)
    on_track, benchmark_str = _on_track(profile)

    user_prompt = (
        f"{profile.name}, {profile.age}yo {profile.occupation}.\n"
        f"Annual salary: ${profile.annual_salary:,.0f} | Risk tolerance: {profile.risk_tolerance}\n"
        f"Recommended 401k: {report.recommended_401k_pct:.1f}% (${report.annual_retirement_contribution:,.0f}/yr total)\n"
        f"Employer match: {profile.employer_401k_match}% | Captures full match: {report.captures_full_match}\n"
        f"Roth IRA eligible: {report.roth_ira_eligible}\n"
        f"Retirement balance benchmark: {benchmark_str}\n"
        f"Current 10yr Treasury yield: {treasury_10yr:.2f}% "
        f"({'competitive with stocks — bonds worth considering' if treasury_10yr > 4.5 else 'stocks still favoured long-term'})"
    )

    insight = await call_llm(_INSIGHT_SYSTEM, user_prompt, Insight, temperature=0.3)
    return report.model_copy(update={"summary": insight.summary})
