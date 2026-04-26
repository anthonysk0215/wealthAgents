"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, FileJson, Home, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { API_URL, authHeaders, getToken } from "@/lib/auth"
import { cn } from "@/lib/utils"

type AllocationPlan = {
  cash_emergency_pct: number
  retirement_pct: number
  investing_pct: number
  house_fund_pct: number
  speculative_pct: number
  monthly_amounts: Record<string, number>
  summary: string
}

type NextThousand = {
  emergency_fund: number
  roth_ira: number
  taxable_investing: number
  house_fund: number
  discretionary: number
}

type Milestone = {
  label: string
  target_metric?: string
  month?: number
  year?: number
  action?: string
  career_note?: string
}

type AnalystReports = {
  cash_flow?: string
  retirement?: string
  housing?: string
  investment?: string
}

type PlanInsights = {
  bull_wins_on?: string[]
  bear_wins_on?: string[]
  aggression_dial?: number | null
  verdict_summary?: string
  allocator_summary?: string
  risk_score?: number | null
  risk_summary?: string
  risk_warnings?: string[]
}

type WealthPlan = {
  headline: string
  health_score: number
  final_allocation: AllocationPlan
  next_thousand: NextThousand
  milestones_12mo: Milestone[]
  milestones_5yr: Milestone[]
  analyst_reports?: AnalystReports
  plan_insights?: PlanInsights
  agent_transcript?: Array<Record<string, unknown>>
}

type SavedReport = {
  id: string
  title: string
  created_at: string
  profile: {
    name: string
    age?: number
    occupation?: string
    industry?: string
    primary_goal: string
    annual_salary: number
  }
  plan: WealthPlan
}

const allocationBuckets = [
  ["cash_emergency_pct", "cash_emergency", "Emergency Fund", "bg-blue-500"],
  ["retirement_pct", "retirement", "Retirement", "bg-violet-500"],
  ["investing_pct", "investing", "Taxable Investing", "bg-emerald-500"],
  ["house_fund_pct", "house_fund", "House Fund", "bg-amber-500"],
  ["speculative_pct", "speculative", "Speculative", "bg-rose-500"],
] as const

const nextThousandBuckets = [
  ["emergency_fund", "Emergency Fund", "bg-blue-500"],
  ["roth_ira", "Roth IRA", "bg-violet-500"],
  ["taxable_investing", "Taxable Investing", "bg-emerald-500"],
  ["house_fund", "House Fund", "bg-amber-500"],
  ["discretionary", "Discretionary", "bg-rose-500"],
] as const

function money(value?: number) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function pct(value?: number) {
  return `${Number(value || 0).toFixed(1)}%`
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [report, setReport] = useState<SavedReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!getToken()) {
      router.replace(`/login?next=/history/${id}`)
      return
    }

    fetch(`${API_URL}/api/reports/${id}`, { headers: authHeaders() })
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.detail || "Failed to load report")
        setReport(payload)
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load report"))
      .finally(() => setLoading(false))
  }, [id, router])

  async function deleteReport() {
    if (!confirm("Delete this saved report?")) return
    const res = await fetch(`${API_URL}/api/reports/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    })
    if (res.ok) router.push("/history")
  }

  if (loading) return <main className="min-h-screen bg-background p-8 text-muted-foreground">Loading report...</main>
  if (error || !report) return <main className="min-h-screen bg-background p-8 text-destructive">{error || "Report not found"}</main>

  const plan = report.plan
  const allocation = plan.final_allocation
  const insights = plan.plan_insights
  const analystReports = plan.analyst_reports

  return (
    <main className="min-h-screen bg-background pb-16">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/history">
              <Button variant="ghost" className="gap-2 rounded-md">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
            <Link href="/">
              <Button variant="ghost" className="gap-2 rounded-md">
                <Home className="h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link href="/#intake-section">
              <Button className="gap-2 rounded-md">
                <Plus className="h-4 w-4" />
                New plan
              </Button>
            </Link>
          </div>
          <Button variant="ghost" className="gap-2 rounded-md text-destructive hover:text-destructive" onClick={deleteReport}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8">
        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <p className="text-xs text-muted-foreground">Saved {new Date(report.created_at).toLocaleString()}</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-normal text-foreground">{plan.headline}</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            {report.profile.name}
            {report.profile.age ? ` · ${report.profile.age}yo` : ""}
            {report.profile.occupation ? ` · ${report.profile.occupation}` : ""}
            {report.profile.industry ? ` · ${report.profile.industry}` : ""}
            {` · ${money(report.profile.annual_salary)}/yr · ${report.profile.primary_goal}`}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-border px-4 py-3">
              <p className="text-xs text-muted-foreground">Financial Health</p>
              <p className="text-2xl font-semibold text-foreground">{Math.round(plan.health_score)} / 100</p>
            </div>
            {typeof insights?.aggression_dial === "number" && (
              <div className="rounded-md border border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">Aggression Dial</p>
                <p className="text-2xl font-semibold text-foreground">{Math.round(insights.aggression_dial * 100)}%</p>
              </div>
            )}
            {typeof insights?.risk_score === "number" && (
              <div className="rounded-md border border-border px-4 py-3">
                <p className="text-xs text-muted-foreground">Risk Score</p>
                <p className="text-2xl font-semibold text-foreground">{insights.risk_score.toFixed(1)} / 10</p>
              </div>
            )}
          </div>
        </section>

        {insights?.risk_warnings && insights.risk_warnings.length > 0 && (
          <section className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6">
            <h2 className="font-semibold text-foreground">Risk Warnings</h2>
            <ul className="mt-3 space-y-2 text-sm text-foreground/80">
              {insights.risk_warnings.map((warning, idx) => <li key={idx}>• {warning}</li>)}
            </ul>
          </section>
        )}

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Monthly Allocation</h2>
          <p className="mt-1 text-sm text-muted-foreground">{allocation.summary}</p>
          <div className="mt-5 space-y-4">
            {allocationBuckets.map(([pctKey, amountKey, label, color]) => {
              const percent = allocation[pctKey]
              const amount = allocation.monthly_amounts?.[amountKey] || 0
              return (
                <div key={pctKey}>
                  <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
                    <span className="font-medium text-foreground">{label}</span>
                    <span className="text-muted-foreground">{pct(percent)} · {money(amount)}/mo</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted">
                    <div className={cn("h-2 rounded-full", color)} style={{ width: `${Math.min(Math.max(percent, 0), 100)}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Your Next $1,000</h2>
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
            {nextThousandBuckets.map(([key, label, color]) => (
              <div key={key} className="rounded-md bg-muted/40 p-4 text-center">
                <div className={cn("mx-auto mb-2 h-2 w-2 rounded-full", color)} />
                <p className="text-xl font-semibold text-foreground">{money(plan.next_thousand[key])}</p>
                <p className="mt-1 text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {analystReports && (
          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Analyst Reports</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {[
                ["cash_flow", "Cash Flow Analyst"],
                ["retirement", "Retirement Analyst"],
                ["housing", "Housing Analyst"],
                ["investment", "Investment Analyst"],
              ].map(([key, label]) => {
                const text = analystReports[key as keyof AnalystReports]
                if (!text) return null
                return (
                  <div key={key} className="rounded-md border border-border bg-muted/20 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-2 text-sm leading-6 text-foreground/85">{text}</p>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {insights && (
          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Agent Insights</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {insights.bull_wins_on && insights.bull_wins_on.length > 0 && (
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">Bull wins on</p>
                  <ul className="mt-2 space-y-1 text-sm text-foreground/85">
                    {insights.bull_wins_on.map((item, idx) => <li key={idx}>+ {item}</li>)}
                  </ul>
                </div>
              )}
              {insights.bear_wins_on && insights.bear_wins_on.length > 0 && (
                <div className="rounded-md border border-red-500/20 bg-red-500/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-red-400">Bear wins on</p>
                  <ul className="mt-2 space-y-1 text-sm text-foreground/85">
                    {insights.bear_wins_on.map((item, idx) => <li key={idx}>- {item}</li>)}
                  </ul>
                </div>
              )}
              {insights.verdict_summary && (
                <div className="rounded-md border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Debate Verdict</p>
                  <p className="mt-2 text-sm leading-6 text-foreground/85">{insights.verdict_summary}</p>
                </div>
              )}
              {insights.allocator_summary && (
                <div className="rounded-md border border-border bg-muted/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Allocator Reasoning</p>
                  <p className="mt-2 text-sm leading-6 text-foreground/85">{insights.allocator_summary}</p>
                </div>
              )}
              {insights.risk_summary && (
                <div className="rounded-md border border-border bg-muted/20 p-4 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk Manager Decision</p>
                  <p className="mt-2 text-sm leading-6 text-foreground/85">{insights.risk_summary}</p>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground">12-Month Roadmap</h2>
            <div className="mt-4 space-y-3">
              {plan.milestones_12mo.map((m, idx) => (
                <div key={idx} className="rounded-md bg-muted/40 p-4">
                  <p className="text-sm font-medium text-foreground">Month {m.month ?? idx + 1}: {m.label}</p>
                  {m.target_metric && <p className="mt-1 text-xs text-muted-foreground">{m.target_metric}</p>}
                  {m.action && <p className="mt-2 text-sm text-foreground/85">{m.action}</p>}
                  {m.career_note && <p className="mt-2 text-xs text-primary">{m.career_note}</p>}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="font-semibold text-foreground">5-Year Roadmap</h2>
            <div className="mt-4 space-y-3">
              {plan.milestones_5yr.map((m, idx) => (
                <div key={idx} className="rounded-md bg-muted/40 p-4">
                  <p className="text-sm font-medium text-foreground">Year {m.year ?? idx + 1}: {m.label}</p>
                  {m.target_metric && <p className="mt-1 text-xs text-muted-foreground">{m.target_metric}</p>}
                  {m.action && <p className="mt-2 text-sm text-foreground/85">{m.action}</p>}
                  {m.career_note && <p className="mt-2 text-xs text-primary">{m.career_note}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {plan.agent_transcript && plan.agent_transcript.length > 0 && (
          <section className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-foreground">Agent Transcript</h2>
            <div className="mt-4 space-y-3">
              {plan.agent_transcript.map((event, idx) => {
                const stage = String(event.stage || event.event || `event_${idx + 1}`)
                return (
                  <details key={idx} className="rounded-md border border-border bg-muted/20 p-4">
                    <summary className="cursor-pointer text-sm font-medium text-foreground">{stage}</summary>
                    <pre className="mt-3 max-h-80 overflow-auto rounded-md bg-background p-3 text-xs text-muted-foreground">
                      {JSON.stringify(event, null, 2)}
                    </pre>
                  </details>
                )
              })}
            </div>
          </section>
        )}

        <details className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <summary className="flex cursor-pointer items-center gap-2 text-lg font-semibold text-foreground">
            <FileJson className="h-5 w-5" />
            Complete Report JSON
          </summary>
          <pre className="mt-4 max-h-[560px] overflow-auto rounded-md bg-background p-4 text-xs leading-5 text-muted-foreground">
            {JSON.stringify(plan, null, 2)}
          </pre>
        </details>
      </div>
    </main>
  )
}
