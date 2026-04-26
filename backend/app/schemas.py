"""
WealthAgents — Pydantic schemas.

Single source of truth for all inter-agent data contracts.
Every agent function imports its input/output types from here.
"""
from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


# ─────────────────────────────────────────────────────────────
# Intake / User Profile
# ─────────────────────────────────────────────────────────────

class UserProfile(BaseModel):
    name: str
    age: int
    occupation: str
    industry: Literal["Tech", "Finance", "Healthcare", "Government", "Education", "Other"]
    location: Optional[str] = None

    annual_salary: float
    monthly_expenses: float
    current_savings: float
    taxable_investments: float = 0.0
    retirement_balance: float = 0.0
    debt_amount: float = 0.0
    debt_interest_rate: float = 0.0   # annual %, only relevant if debt_amount > 0
    employer_401k_match: float = 0.0  # e.g. 4.0 means 4%

    primary_goal: str           # e.g. "Buy a $1M home by 33"
    target_age: int
    dream_scenario: Optional[str] = None  # e.g. "Maybe start a company"
    risk_tolerance: Literal["conservative", "moderate", "moderate_aggressive", "aggressive"]


# ─────────────────────────────────────────────────────────────
# Layer 1 — Analyst team outputs
# ─────────────────────────────────────────────────────────────

class CashFlowReport(BaseModel):
    monthly_surplus: float = Field(description="Take-home minus monthly expenses ($)")
    savings_rate: float = Field(description="Surplus / gross monthly income, as a percentage 0-100")
    burn_rate: float = Field(description="Monthly expenses / gross monthly income, as a percentage 0-100")
    summary: str = Field(description="1-2 sentence plain-English assessment")


class RetirementReport(BaseModel):
    recommended_401k_pct: float = Field(description="Recommended pre-tax 401k contribution as % of salary")
    roth_ira_eligible: bool = Field(description="Whether user is within Roth IRA income limits")
    captures_full_match: bool = Field(description="Whether recommendation captures full employer match")
    annual_retirement_contribution: float = Field(description="Total annual retirement contribution ($)")
    summary: str


class HousingReport(BaseModel):
    feasible: bool = Field(description="Whether housing goal is achievable given current financials")
    years_to_down_payment: float = Field(description="Estimated years to save a 20% down payment")
    required_monthly_savings: float = Field(description="Monthly savings needed to hit the goal ($)")
    estimated_home_price: Optional[float] = None
    summary: str


class InvestmentReport(BaseModel):
    equity_pct: float = Field(description="Recommended equity allocation as % of investable assets")
    bond_pct: float = Field(description="Recommended bond allocation as %")
    recommended_etfs: List[str] = Field(description="Ticker list, e.g. ['VTI', 'VXUS', 'BND']")
    summary: str


class Layer1Reports(BaseModel):
    """Convenience container — passed verbatim to Layer 2 and Layer 3 agents."""
    cash_flow: CashFlowReport
    retirement: RetirementReport
    housing: HousingReport
    investment: InvestmentReport


# ─────────────────────────────────────────────────────────────
# Layer 2 — Bull / Bear debate
# ─────────────────────────────────────────────────────────────

class DebateRound(BaseModel):
    speaker: Literal["bull", "bear"]
    round_number: int = Field(ge=1, le=3)
    argument: str = Field(description="The agent's full argument for this round")
    confidence: float = Field(ge=0.0, le=1.0, description="Confidence in position (0-1)")


class DebateVerdict(BaseModel):
    bull_wins_on: List[str] = Field(description="Topics where the bull case prevailed")
    bear_wins_on: List[str] = Field(description="Topics where the bear case prevailed")
    aggression_dial: float = Field(
        ge=0.0,
        le=1.0,
        description="0 = fully conservative, 1 = fully aggressive",
    )
    summary: str


# ─────────────────────────────────────────────────────────────
# Layer 3 — Portfolio Allocator
# ─────────────────────────────────────────────────────────────

class AllocationPlan(BaseModel):
    cash_emergency_pct: float = Field(description="% of monthly surplus → emergency fund")
    retirement_pct: float = Field(description="% of monthly surplus → retirement accounts")
    investing_pct: float = Field(description="% of monthly surplus → taxable investing")
    house_fund_pct: float = Field(description="% of monthly surplus → house down-payment fund")
    speculative_pct: float = Field(description="% of monthly surplus → speculative / startup")
    monthly_amounts: Dict[str, float] = Field(
        description="Dollar amounts per bucket; keys: cash_emergency, retirement, investing, house_fund, speculative"
    )
    summary: str


# ─────────────────────────────────────────────────────────────
# Layer 4 — Risk team
# ─────────────────────────────────────────────────────────────

class RiskView(BaseModel):
    stance: Literal["aggressive", "neutral", "conservative"]
    adjustments: Dict[str, float] = Field(
        description="Bucket name → delta percentage (positive = increase, negative = decrease)"
    )
    reasoning: str


class FinalRiskDecision(BaseModel):
    final_allocation: AllocationPlan
    risk_score: float = Field(ge=0.0, le=10.0, description="Overall risk score of the final plan (0-10)")
    warnings: List[str] = Field(description="Actionable warnings the user should know about")
    summary: str


# ─────────────────────────────────────────────────────────────
# Layer 5 — Wealth Manager final output
# ─────────────────────────────────────────────────────────────

class Milestone(BaseModel):
    label: str = Field(description="Human-readable name, e.g. 'Fully funded emergency fund'")
    target_metric: Optional[str] = None  # e.g. "$18,000 in HYSA"
    month: Optional[int] = None          # 1-12 for 12-month roadmap
    year: Optional[int] = None           # for 5-year roadmap


class NextThousand(BaseModel):
    """How to split the next $1,000 of monthly surplus."""
    emergency_fund: float
    roth_ira: float
    taxable_investing: float
    house_fund: float
    discretionary: float


class WealthPlan(BaseModel):
    headline: str = Field(description="One personalized sentence, e.g. 'Career-rich, capital-light.'")
    health_score: float = Field(ge=0.0, le=100.0, description="Overall financial health score 0-100")
    final_allocation: AllocationPlan
    next_thousand: NextThousand
    milestones_12mo: List[Milestone]
    milestones_5yr: List[Milestone]
    agent_transcript: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="Ordered list of all agent events; populated by the orchestrator after synthesis.",
    )
