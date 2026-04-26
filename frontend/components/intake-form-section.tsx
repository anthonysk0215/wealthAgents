"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import { API_URL, authHeaders, getToken } from "@/lib/auth"

const industryOptions = [
  "Technology & Software",
  "Finance & Banking",
  "Healthcare & Medicine",
  "Legal & Law",
  "Real Estate",
  "Education",
  "Government & Public Sector",
  "Manufacturing & Engineering",
  "Retail & E-commerce",
  "Media & Entertainment",
  "Construction",
  "Non-profit",
  "Other",
]

const goalOptions = [
  { value: "retirement", label: "Retirement" },
  { value: "house",      label: "Buy a Home" },
  { value: "emergency",  label: "Emergency Fund" },
  { value: "invest",     label: "Grow Wealth" },
  { value: "debt",       label: "Pay Off Debt" },
  { value: "education",  label: "Education" },
]

type GoalContext = Record<string, string>

const GOAL_CONTEXT_FIELDS: Record<string, { id: string; label: string; placeholder: string; prefix?: string }[]> = {
  house: [
    { id: "houseLocation", label: "Target location / area",  placeholder: "e.g. Austin, TX" },
    { id: "housePrice",    label: "Target home price",       placeholder: "750,000", prefix: "$" },
  ],
  retirement: [
    { id: "retirementIncome", label: "Target monthly retirement income", placeholder: "6,000", prefix: "$" },
    { id: "retirementStyle",  label: "Retirement lifestyle",             placeholder: "e.g. comfortable travel, modest suburban" },
  ],
  education: [
    { id: "educationType", label: "Type of education",     placeholder: "e.g. MBA, coding bootcamp, MD" },
    { id: "educationCost", label: "Estimated total cost",  placeholder: "60,000", prefix: "$" },
  ],
  emergency: [
    { id: "emergencyMonths", label: "Target months of expenses covered", placeholder: "6" },
  ],
  invest: [
    { id: "investTarget",  label: "Target portfolio value", placeholder: "500,000", prefix: "$" },
    { id: "investHorizon", label: "Time horizon (years)",   placeholder: "10" },
  ],
  debt: [
    { id: "debtDescription", label: "Describe the debt", placeholder: "e.g. $28k student loans at 5.5%" },
  ],
}

function buildPrimaryGoal(goals: string[], ctx: GoalContext): string {
  if (goals.length === 0) return "Build long-term wealth"
  return goals.map((g) => {
    if (g === "house") {
      const loc   = ctx.houseLocation ? ` in ${ctx.houseLocation}` : ""
      const price = ctx.housePrice    ? ` for $${ctx.housePrice}`   : ""
      return `Buy a home${loc}${price}`
    }
    if (g === "retirement") {
      const income = ctx.retirementIncome ? ` with $${ctx.retirementIncome}/month` : ""
      const style  = ctx.retirementStyle  ? ` (${ctx.retirementStyle})`           : ""
      return `Retire comfortably${income}${style}`
    }
    if (g === "education") {
      const type = ctx.educationType ? ` — ${ctx.educationType}` : ""
      const cost = ctx.educationCost ? ` ($${ctx.educationCost} total)` : ""
      return `Fund education${type}${cost}`
    }
    if (g === "emergency") {
      const mo = ctx.emergencyMonths ? ` (${ctx.emergencyMonths}-month target)` : ""
      return `Build emergency fund${mo}`
    }
    if (g === "invest") {
      const target  = ctx.investTarget  ? ` to $${ctx.investTarget}` : ""
      const horizon = ctx.investHorizon ? ` over ${ctx.investHorizon} years` : ""
      return `Grow investment portfolio${target}${horizon}`
    }
    if (g === "debt") {
      const desc = ctx.debtDescription ? `: ${ctx.debtDescription}` : ""
      return `Pay off debt${desc}`
    }
    return g
  }).join("; ")
}

function toRiskTolerance(val: number): "conservative" | "moderate" | "moderate_aggressive" | "aggressive" {
  if (val <= 25) return "conservative"
  if (val <= 50) return "moderate"
  if (val <= 75) return "moderate_aggressive"
  return "aggressive"
}

export function IntakeFormSection() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    age: "",
    occupation: "",
    industry: "",
    annualSalary: "",
    monthlyExpenses: "",
    currentSavings: "",
    debtAmount: "",
    goals: [] as string[],
    goalContext: {} as GoalContext,
    targetAge: "",
    industryCustom: "",
    riskTolerance: [50],
  })

  const handleGoalToggle = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal) ? prev.goals.filter((g) => g !== goal) : [...prev.goals, goal],
    }))
  }

  const handleSubmit = async () => {
    setLoading(true)
    const primaryGoal = buildPrimaryGoal(formData.goals, formData.goalContext)

    const profile = {
      name: formData.name,
      age: parseInt(formData.age),
      occupation: formData.occupation,
      industry: formData.industry === "Other" && formData.industryCustom
        ? formData.industryCustom
        : formData.industry,
      annual_salary: parseFloat(formData.annualSalary),
      monthly_expenses: parseFloat(formData.monthlyExpenses),
      current_savings: parseFloat(formData.currentSavings),
      debt_amount: parseFloat(formData.debtAmount) || 0,
      debt_interest_rate: 0,
      taxable_investments: 0,
      retirement_balance: 0,
      employer_401k_match: 0,
      primary_goal: primaryGoal,
      target_age: parseInt(formData.targetAge),
      risk_tolerance: toRiskTolerance(formData.riskTolerance[0]),
    }

    try {
      const res = await fetch(`${API_URL}/api/plan/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify(profile),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const { plan_id } = await res.json()
      sessionStorage.setItem("wealthProfile", JSON.stringify(profile))
      if (!getToken()) {
        sessionStorage.setItem("wealthAnonymousPlan", "true")
      }
      router.push(`/plan/${plan_id}`)
    } catch (err) {
      console.error("Failed to start plan:", err)
      setLoading(false)
    }
  }

  const industryValue = formData.industry === "Other" ? formData.industryCustom : formData.industry
  const isStep1Valid = formData.name && formData.age && formData.occupation && industryValue
    && formData.annualSalary && formData.monthlyExpenses && formData.currentSavings
  const isStep2Valid = formData.goals.length > 0 && formData.targetAge

  return (
    <section id="intake-section" className="w-full py-16 md:py-24 px-4 md:px-6">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-foreground mb-4">
            Build Your Wealth Plan
          </h2>
          <p className="text-muted-foreground text-base md:text-lg max-w-xl mx-auto">
            Answer a few questions and watch 12 AI agents craft your personalized financial strategy.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-10">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  step >= s
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground border border-border"
                )}
              >
                {s}
              </div>
              {s < 3 && <div className={cn("w-12 h-0.5", step > s ? "bg-primary" : "bg-border")} />}
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 md:p-10 shadow-lg">
          {/* Step 1: Financial Snapshot */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">Your Financial Snapshot</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="name" className="text-foreground">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Alex Johnson"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age" className="text-foreground">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="28"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="occupation" className="text-foreground">Occupation</Label>
                  <Input
                    id="occupation"
                    type="text"
                    placeholder="Software Engineer"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label className="text-foreground">Industry</Label>
                  <div className="flex flex-wrap gap-2">
                    {industryOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setFormData({ ...formData, industry: opt === formData.industry ? formData.industry : opt })}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-sm font-medium transition-all whitespace-nowrap",
                          formData.industry === opt
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background text-foreground border-border hover:border-primary/50"
                        )}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                  {formData.industry === "Other" && (
                    <Input
                      type="text"
                      placeholder="Type your industry..."
                      value={formData.industryCustom}
                      onChange={(e) => setFormData({ ...formData, industryCustom: e.target.value })}
                      className="bg-background border-border mt-2"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="annualSalary" className="text-foreground">Annual Salary</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="annualSalary"
                      type="number"
                      placeholder="95,000"
                      value={formData.annualSalary}
                      onChange={(e) => setFormData({ ...formData, annualSalary: e.target.value })}
                      className="bg-background border-border pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyExpenses" className="text-foreground">Monthly Expenses</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="monthlyExpenses"
                      type="number"
                      placeholder="3,500"
                      value={formData.monthlyExpenses}
                      onChange={(e) => setFormData({ ...formData, monthlyExpenses: e.target.value })}
                      className="bg-background border-border pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currentSavings" className="text-foreground">Current Savings</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="currentSavings"
                      type="number"
                      placeholder="20,000"
                      value={formData.currentSavings}
                      onChange={(e) => setFormData({ ...formData, currentSavings: e.target.value })}
                      className="bg-background border-border pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="debtAmount" className="text-foreground">Total Debt</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="debtAmount"
                      type="number"
                      placeholder="0"
                      value={formData.debtAmount}
                      onChange={(e) => setFormData({ ...formData, debtAmount: e.target.value })}
                      className="bg-background border-border pl-7"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Button
                  onClick={() => setStep(2)}
                  disabled={!isStep1Valid}
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-6"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Goals */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">Your Goals</h3>

              <div className="space-y-3">
                <Label className="text-foreground">Select your financial goals</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {goalOptions.map((goal) => (
                    <button
                      key={goal.value}
                      type="button"
                      onClick={() => handleGoalToggle(goal.value)}
                      className={cn(
                        "px-4 py-3 rounded-lg border text-sm font-medium transition-all text-left",
                        formData.goals.includes(goal.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {goal.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context fields for each selected goal */}
              {formData.goals.map((goalKey) => {
                const fields = GOAL_CONTEXT_FIELDS[goalKey]
                if (!fields) return null
                const goalLabel = goalOptions.find((g) => g.value === goalKey)?.label ?? goalKey
                return (
                  <div key={goalKey} className="bg-muted/40 rounded-xl p-4 border border-border space-y-3">
                    <p className="text-sm font-semibold text-foreground">{goalLabel} — details</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {fields.map((f) => (
                        <div key={f.id} className="space-y-1">
                          <Label htmlFor={f.id} className="text-foreground text-xs">{f.label}</Label>
                          <div className="relative">
                            {f.prefix && (
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">{f.prefix}</span>
                            )}
                            <Input
                              id={f.id}
                              type="text"
                              placeholder={f.placeholder}
                              value={formData.goalContext[f.id] ?? ""}
                              onChange={(e) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  goalContext: { ...prev.goalContext, [f.id]: e.target.value },
                                }))
                              }
                              className={cn("bg-background border-border text-sm", f.prefix && "pl-7")}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}

              <div className="space-y-2">
                <Label htmlFor="targetAge" className="text-foreground">By what age do you want to achieve these goals?</Label>
                <Input
                  id="targetAge"
                  type="number"
                  placeholder="35"
                  value={formData.targetAge}
                  onChange={(e) => setFormData({ ...formData, targetAge: e.target.value })}
                  className="bg-background border-border"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 rounded-full py-6 border-border">
                  Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!isStep2Valid}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 rounded-full py-6"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Risk Tolerance */}
          {step === 3 && (
            <div className="space-y-8">
              <h3 className="text-xl font-semibold text-foreground mb-6">Risk Tolerance</h3>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Conservative</span>
                    <span className="text-foreground font-medium">{formData.riskTolerance[0]}%</span>
                    <span className="text-muted-foreground">Aggressive</span>
                  </div>
                  <Slider
                    value={formData.riskTolerance}
                    onValueChange={(value) => setFormData({ ...formData, riskTolerance: value })}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div className="bg-muted/50 rounded-xl p-4 border border-border">
                  <p className="text-sm text-muted-foreground">
                    {formData.riskTolerance[0] <= 30 && (
                      <>
                        <strong className="text-foreground">Conservative:</strong> You prefer stability and capital
                        preservation. The agents will prioritize bonds, savings, and low-volatility investments.
                      </>
                    )}
                    {formData.riskTolerance[0] > 30 && formData.riskTolerance[0] <= 70 && (
                      <>
                        <strong className="text-foreground">Balanced:</strong> You seek a mix of growth and stability.
                        The agents will balance stocks, bonds, and alternative investments.
                      </>
                    )}
                    {formData.riskTolerance[0] > 70 && (
                      <>
                        <strong className="text-foreground">Aggressive:</strong> You prioritize growth and can tolerate
                        volatility. The agents will focus on equities, growth stocks, and higher-risk opportunities.
                      </>
                    )}
                  </p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl p-6 border border-primary/20">
                <h4 className="font-semibold text-foreground mb-2">Ready to meet your agents?</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Once you submit, 12 specialized AI agents will analyze your profile, debate strategies, and craft
                  your personalized wealth plan.
                </p>
                <div className="flex flex-wrap gap-2">
                  {["Cash Flow", "Retirement", "Housing", "Investment", "Bull", "Bear", "Facilitator", "Allocator"].map(
                    (agent) => (
                      <span key={agent} className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full">
                        {agent} Agent
                      </span>
                    )
                  )}
                  <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">+4 more</span>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-full py-6 border-border"
                >
                  Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full py-6"
                >
                  {loading ? "Launching agents..." : "Generate My Plan"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
