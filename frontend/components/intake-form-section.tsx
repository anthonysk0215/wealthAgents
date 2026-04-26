"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"

const employmentOptions = [
  { value: "employed", label: "Employed" },
  { value: "self-employed", label: "Self-Employed" },
  { value: "retired", label: "Retired" },
  { value: "student", label: "Student" },
]

const goalOptions = [
  { value: "retirement", label: "Retirement", icon: "🏖️" },
  { value: "house", label: "Buy a Home", icon: "🏠" },
  { value: "emergency", label: "Emergency Fund", icon: "🛡️" },
  { value: "invest", label: "Grow Wealth", icon: "📈" },
  { value: "debt", label: "Pay Off Debt", icon: "💳" },
  { value: "education", label: "Education", icon: "🎓" },
]

export function IntakeFormSection() {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    age: "",
    income: "",
    savings: "",
    debt: "",
    employment: "",
    riskTolerance: [50],
    goals: [] as string[],
  })

  const handleGoalToggle = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      goals: prev.goals.includes(goal) ? prev.goals.filter((g) => g !== goal) : [...prev.goals, goal],
    }))
  }

  const handleSubmit = () => {
    // Here you would send the data to your API/agents
    console.log("Form submitted:", formData)
    alert("Your wealth plan is being generated! In a full implementation, this would trigger the 12 AI agents.")
  }

  const isStep1Valid = formData.age && formData.income && formData.savings && formData.debt
  const isStep2Valid = formData.employment && formData.goals.length > 0

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
                <div className="space-y-2">
                  <Label htmlFor="age" className="text-foreground">
                    Age
                  </Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="32"
                    value={formData.age}
                    onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                    className="bg-background border-border"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="income" className="text-foreground">
                    Annual Income
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="income"
                      type="number"
                      placeholder="85,000"
                      value={formData.income}
                      onChange={(e) => setFormData({ ...formData, income: e.target.value })}
                      className="bg-background border-border pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="savings" className="text-foreground">
                    Total Savings & Investments
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="savings"
                      type="number"
                      placeholder="45,000"
                      value={formData.savings}
                      onChange={(e) => setFormData({ ...formData, savings: e.target.value })}
                      className="bg-background border-border pl-7"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="debt" className="text-foreground">
                    Total Debt
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="debt"
                      type="number"
                      placeholder="12,000"
                      value={formData.debt}
                      onChange={(e) => setFormData({ ...formData, debt: e.target.value })}
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

          {/* Step 2: Goals & Employment */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-foreground mb-6">Your Goals & Situation</h3>

              <div className="space-y-4">
                <Label className="text-foreground">Employment Status</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {employmentOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, employment: option.value })}
                      className={cn(
                        "px-4 py-3 rounded-lg border text-sm font-medium transition-all",
                        formData.employment === option.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/50"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <Label className="text-foreground">Financial Goals (select all that apply)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {goalOptions.map((goal) => (
                    <button
                      key={goal.value}
                      type="button"
                      onClick={() => handleGoalToggle(goal.value)}
                      className={cn(
                        "px-4 py-4 rounded-lg border text-sm font-medium transition-all flex flex-col items-center gap-2",
                        formData.goals.includes(goal.value)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-foreground border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-2xl">{goal.icon}</span>
                      {goal.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 rounded-full py-6 border-border"
                >
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
                  className="flex-1 bg-secondary text-secondary-foreground hover:bg-secondary/90 rounded-full py-6"
                >
                  Generate My Plan
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
