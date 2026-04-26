"use client"

import React, { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertTriangle, ArrowLeft, TrendingUp, Home, Shield, Briefcase, Zap, History, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Types ────────────────────────────────────────────────────────────────────

interface AllocationPlan {
  cash_emergency_pct: number
  retirement_pct: number
  investing_pct: number
  house_fund_pct: number
  speculative_pct: number
  monthly_amounts: Record<string, number>
  summary: string
}

interface NextThousand {
  emergency_fund: number
  roth_ira: number
  taxable_investing: number
  house_fund: number
  discretionary: number
}

interface Milestone {
  label: string
  target_metric?: string
  month?: number
  year?: number
  action?: string
  career_note?: string
}

interface AnalystReports {
  cash_flow?: string
  retirement?: string
  housing?: string
  investment?: string
}

interface PlanInsights {
  bull_wins_on?: string[]
  bear_wins_on?: string[]
  aggression_dial?: number | null
  verdict_summary?: string
  allocator_summary?: string
  risk_score?: number | null
  risk_summary?: string
  risk_warnings?: string[]
}

interface WealthPlan {
  headline: string
  health_score: number
  final_allocation: AllocationPlan
  next_thousand: NextThousand
  milestones_12mo: Milestone[]
  milestones_5yr: Milestone[]
  analyst_reports?: AnalystReports
  plan_insights?: PlanInsights
}

interface AgentEvent {
  stage: string
  payload: Record<string, unknown>
}

interface UserProfile {
  name: string
  age: number
  occupation: string
  industry: string
  annual_salary: number
  monthly_expenses: number
  current_savings: number
  debt_amount: number
  employer_401k_match: number
  risk_tolerance: string
  primary_goal: string
  target_age: number
}

// ── Agent conversation config ─────────────────────────────────────────────────

const TOTAL_STAGES = 17

type AgentMeta = { name: string; align: "left" | "right"; nameColor: string; bubbleClass: string }

const AGENT_META: Record<string, AgentMeta> = {
  layer1_start:        { name: "Orchestrator",             align: "left",  nameColor: "text-slate-400",   bubbleClass: "border-slate-700/50 bg-slate-900/40" },
  market_data:         { name: "Market Feed",              align: "left",  nameColor: "text-sky-400",     bubbleClass: "border-sky-900/50 bg-sky-950/30" },
  cash_flow:           { name: "Cash Flow Analyst",        align: "left",  nameColor: "text-blue-400",    bubbleClass: "border-blue-900/50 bg-blue-950/30" },
  retirement:          { name: "Retirement Analyst",       align: "left",  nameColor: "text-violet-400",  bubbleClass: "border-violet-900/50 bg-violet-950/30" },
  housing:             { name: "Housing Analyst",          align: "left",  nameColor: "text-amber-400",   bubbleClass: "border-amber-900/50 bg-amber-950/30" },
  investments:         { name: "Investment Analyst",       align: "left",  nameColor: "text-emerald-400", bubbleClass: "border-emerald-900/50 bg-emerald-950/30" },
  bull_round_1:        { name: "Bull Agent",               align: "left",  nameColor: "text-green-400",   bubbleClass: "border-green-900/50 bg-green-950/30" },
  bear_round_1:        { name: "Bear Agent",               align: "right", nameColor: "text-red-400",     bubbleClass: "border-red-900/50 bg-red-950/30" },
  bull_round_2:        { name: "Bull Agent",               align: "left",  nameColor: "text-green-400",   bubbleClass: "border-green-900/50 bg-green-950/30" },
  bear_round_2:        { name: "Bear Agent",               align: "right", nameColor: "text-red-400",     bubbleClass: "border-red-900/50 bg-red-950/30" },
  bull_round_3:        { name: "Bull Agent",               align: "left",  nameColor: "text-green-400",   bubbleClass: "border-green-900/50 bg-green-950/30" },
  bear_round_3:        { name: "Bear Agent",               align: "right", nameColor: "text-red-400",     bubbleClass: "border-red-900/50 bg-red-950/30" },
  debate_verdict:      { name: "Facilitator",              align: "left",  nameColor: "text-primary",     bubbleClass: "border-primary/30 bg-primary/10" },
  allocation_proposed: { name: "Portfolio Allocator",      align: "left",  nameColor: "text-cyan-400",    bubbleClass: "border-cyan-900/50 bg-cyan-950/30" },
  risk_aggressive:     { name: "Aggressive Risk Agent",    align: "left",  nameColor: "text-orange-400",  bubbleClass: "border-orange-900/50 bg-orange-950/30" },
  risk_neutral:        { name: "Neutral Risk Agent",       align: "left",  nameColor: "text-yellow-400",  bubbleClass: "border-yellow-900/50 bg-yellow-950/30" },
  risk_conservative:   { name: "Conservative Risk Agent",  align: "right", nameColor: "text-blue-400",    bubbleClass: "border-blue-900/50 bg-blue-950/30" },
  risk_final:          { name: "Risk Manager",             align: "left",  nameColor: "text-rose-400",    bubbleClass: "border-rose-900/50 bg-rose-950/30" },
  wealth_plan:         { name: "Wealth Manager",           align: "left",  nameColor: "text-primary",     bubbleClass: "border-primary/30 bg-primary/10" },
}

function summarizeText(text: string, maxLen = 150): string {
  const clean = text.replace(/\s+/g, " ").trim()
  if (!clean) return ""
  const firstSentence = clean.split(/(?<=[.!?])\s+/)[0] ?? clean
  if (firstSentence.length <= maxLen) return firstSentence
  return `${firstSentence.slice(0, maxLen - 1).trimEnd()}…`
}

function extractMessage(stage: string, p: Record<string, unknown>): string {
  if (stage === "layer1_start")        return String(p.message ?? "Starting analysis pipeline...")
  if (stage === "market_data")         return `Mortgage rate: ${p.mortgage_rate_30yr ?? "—"}% · 10yr Treasury: ${p.treasury_10yr ?? "—"}% · CPI YoY: ${p.cpi_yoy ?? "—"}%`
  if (stage === "cash_flow")           return String(p.summary ?? "")
  if (stage === "retirement")          return String(p.summary ?? "")
  if (stage === "housing")             return String(p.summary ?? "")
  if (stage === "investments")         return String(p.summary ?? "")
  if (stage.startsWith("bull_round_") || stage.startsWith("bear_round_")) {
    const conf = p.confidence ? ` (confidence: ${Math.round(Number(p.confidence) * 100)}%)` : ""
    return summarizeText(String(p.argument ?? ""), 90) + conf
  }
  if (stage === "debate_verdict")      return summarizeText(String(p.summary ?? ""), 100)
  if (stage === "allocation_proposed") return String(p.summary ?? "")
  if (stage === "risk_aggressive" || stage === "risk_neutral" || stage === "risk_conservative") {
    return String(p.reasoning ?? "")
  }
  if (stage === "risk_final")          return String(p.summary ?? "")
  if (stage === "wealth_plan")         return String(p.headline ?? "Wealth plan complete.")
  return ""
}

function RoundDivider({ round }: { round: number }) {
  return (
    <div className="flex items-center gap-3 my-2">
      <div className="flex-1 h-px bg-border/50" />
      <span className="text-xs text-muted-foreground font-medium px-2">Debate Round {round}</span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  )
}

// ── Occupation-based salary growth rate ──────────────────────────────────────

function getCareerGrowthRate(occupation?: string, industry?: string): { rate: number; basis: string } {
  const occ = (occupation ?? "").toLowerCase()
  const ind = (industry ?? "").toLowerCase()

  const OCC_RATES: [string[], number, string][] = [
    [["software", "developer", "engineer", "programmer", "swe", "full stack", "backend", "frontend"], 0.07, "Software engineers see 6–8%/yr average growth driven by high demand"],
    [["data scientist", "data analyst", "machine learning", "ml engineer", "ai engineer"], 0.075, "AI/data roles are seeing above-average growth due to market demand"],
    [["product manager", "product owner", "program manager"], 0.065, "Product managers typically see 5–7%/yr growth"],
    [["devops", "sre", "cloud", "platform engineer", "infrastructure"], 0.07, "Cloud/DevOps roles command strong salary growth"],
    [["investment bank", "private equity", "hedge fund", "trader", "quant"], 0.09, "Finance front-office roles see top-quartile compensation growth"],
    [["financial analyst", "actuary", "fp&a", "controller"], 0.055, "Finance analyst roles average 4–6%/yr growth"],
    [["doctor", "physician", "surgeon", "md", "psychiatrist", "radiolog"], 0.055, "Physicians see steady 4–6%/yr growth with specialization premium"],
    [["nurse", "nursing", "rn", "np ", "practitioner"], 0.04, "Nursing salaries grow 3–5%/yr driven by demand and experience"],
    [["dentist", "dental", "orthodon"], 0.05, "Dental professionals see ~5%/yr growth"],
    [["pharmacist", "pharmacy"], 0.04, "Pharmacy salaries are stable with 3–4%/yr growth"],
    [["lawyer", "attorney", "counsel", "paralegal", "solicitor"], 0.065, "Legal professionals average 5–7%/yr with partner-track premium"],
    [["consultant", "consulting", "advisory", "strategy"], 0.07, "Consultants see strong 6–8%/yr growth with promotions"],
    [["marketing", "growth marketer", "brand manager", "digital marketing"], 0.05, "Marketing roles average 4–6%/yr growth"],
    [["sales", "account executive", "business development", "ae ", "bdr", "sdr"], 0.055, "Sales roles vary; base grows 4–6%/yr plus comp upside"],
    [["teacher", "teaching", "educator", "instructor"], 0.025, "Teacher salaries grow slowly at ~2–3%/yr"],
    [["professor", "academic", "researcher", "postdoc"], 0.03, "Academic salaries grow modestly at ~2–4%/yr"],
    [["manager", "director", "vp ", "vice president", "c-suite", "cto", "cfo", "ceo"], 0.065, "Leadership roles see strong 6–7%/yr growth with equity"],
    [["analyst"], 0.05, "Analyst roles average ~5%/yr growth"],
  ]

  for (const [keywords, rate, basis] of OCC_RATES) {
    if (keywords.some(k => occ.includes(k))) return { rate, basis }
  }

  const IND_RATES: [string[], number, string][] = [
    [["tech", "software", "saas", "ai", "crypto", "startup"], 0.07, "Tech industry averages 6–8%/yr salary growth"],
    [["finance", "banking", "insurance", "investment", "fintech"], 0.06, "Finance industry averages 5–7%/yr growth"],
    [["healthcare", "medical", "pharma", "biotech", "hospital"], 0.045, "Healthcare averages 3–5%/yr growth"],
    [["legal", "law firm"], 0.06, "Legal sector averages 5–6%/yr growth"],
    [["consulting", "professional services"], 0.065, "Consulting averages 6–7%/yr with promotions"],
    [["real estate", "construction", "architecture"], 0.05, "Real estate sector averages 4–5%/yr growth"],
    [["education", "university", "school"], 0.025, "Education sector averages 2–3%/yr growth"],
    [["retail", "food", "hospitality", "restaurant"], 0.03, "Retail/hospitality averages 2–4%/yr growth"],
    [["government", "public sector", "federal", "state", "nonprofit"], 0.025, "Public sector averages 2–3%/yr; strong benefits offset"],
    [["manufacturing", "logistics", "supply chain", "automotive"], 0.035, "Manufacturing averages 3–4%/yr growth"],
    [["media", "entertainment", "advertising"], 0.04, "Media/entertainment averages 3–5%/yr growth"],
  ]

  for (const [keywords, rate, basis] of IND_RATES) {
    if (keywords.some(k => ind.includes(k))) return { rate, basis }
  }

  return { rate: 0.04, basis: "Average US salary growth is ~3–5%/yr" }
}

// ── Bucket display config ─────────────────────────────────────────────────────

const BUCKETS = [
  { key: "cash_emergency_pct", amountKey: "cash_emergency", label: "Emergency Fund", icon: Shield,   color: "bg-blue-500" },
  { key: "retirement_pct",     amountKey: "retirement",     label: "Retirement",     icon: Briefcase, color: "bg-violet-500" },
  { key: "investing_pct",      amountKey: "investing",      label: "Investing",       icon: TrendingUp,color: "bg-emerald-500" },
  { key: "house_fund_pct",     amountKey: "house_fund",     label: "House Fund",     icon: Home,      color: "bg-amber-500" },
  { key: "speculative_pct",    amountKey: "speculative",    label: "Speculative",    icon: Zap,       color: "bg-rose-500" },
] as const

const NEXT_K = [
  { key: "emergency_fund",   label: "Emergency Fund", color: "bg-blue-500" },
  { key: "roth_ira",         label: "Roth IRA",       color: "bg-violet-500" },
  { key: "taxable_investing",label: "Investing",       color: "bg-emerald-500" },
  { key: "house_fund",       label: "House Fund",     color: "bg-amber-500" },
  { key: "discretionary",    label: "Discretionary",  color: "bg-rose-500" },
] as const

// ── SVG Pie Chart ────────────────────────────────────────────────────────────

interface PieSlice { pct: number; color: string; label: string }

function PieChart({ slices, size = 160 }: { slices: PieSlice[]; size?: number }) {
  const cx = size / 2
  const cy = size / 2
  const r  = size / 2 - 8

  // Normalize to exactly 100% — eliminates floating-point gaps
  const rawTotal = slices.reduce((s, p) => s + Math.max(0, p.pct), 0)
  const scale    = rawTotal > 0 ? 100 / rawTotal : 1

  let startAngle = -Math.PI / 2
  const paths: React.ReactElement[] = []

  slices.forEach((s, i) => {
    if (s.pct <= 0) return
    const angle = ((s.pct * scale) / 100) * 2 * Math.PI
    const end   = startAngle + angle
    const large = angle > Math.PI ? 1 : 0
    const x1 = cx + r * Math.cos(startAngle), y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(end),         y2 = cy + r * Math.sin(end)

    paths.push(
      <path key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
        fill={s.color} stroke="hsl(var(--background))" strokeWidth="2"
      />
    )
    startAngle = end
  })

  // Largest-remainder method: displayed tenths always sum to exactly 1000 (= 100.0%)
  const scaledTenths = slices.map(s => s.pct > 0 ? s.pct * scale * 10 : 0)
  const floored      = scaledTenths.map(v => Math.floor(v))
  const extra        = 1000 - floored.reduce((a, b) => a + b, 0)
  const displayTenths = [...floored]
  scaledTenths
    .map((v, i) => ({ i, frac: v - floored[i] }))
    .sort((a, b) => b.frac - a.frac)
    .slice(0, extra)
    .forEach(({ i }) => displayTenths[i]++)

  return (
    <div className="flex flex-col items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {paths}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {slices.map((s, i) => s.pct > 0 ? (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-muted-foreground">{s.label} {(displayTenths[i] / 10).toFixed(1)}%</span>
          </div>
        ) : null)}
      </div>
    </div>
  )
}

// ── Health Score Ring ─────────────────────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
  const r = 54
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#f59e0b" : "#ef4444"
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" width="144" height="144">
        <circle cx="72" cy="72" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/30" />
        <circle cx="72" cy="72" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="text-center">
        <div className="text-3xl font-bold text-foreground">{Math.round(score)}</div>
        <div className="text-xs text-muted-foreground">/ 100</div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PlanPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [plan, setPlan] = useState<WealthPlan | null>(null)
  const [status, setStatus] = useState<"connecting" | "streaming" | "done" | "error">("connecting")
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [savedReportId, setSavedReportId] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("wealthProfile")
      if (raw) setProfile(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
    const es = new EventSource(`${API}/api/plan/${id}/stream`)

    const handleStageEvent = (stage: string, raw: string) => {
      try {
        const payload = JSON.parse(raw)
        if (stage === "done") {
          setPlan(payload as WealthPlan)
          setStatus("done")
          es.close()
          return
        }
        if (stage === "error") {
          setError((payload as { message?: string }).message ?? "Stream error")
          setStatus("error")
          es.close()
          return
        }
        if (stage === "report_saved") {
          setSavedReportId(String((payload as { report_id?: string }).report_id ?? ""))
          return
        }

        setStatus("streaming")
        setEvents((prev) => [...prev, { stage, payload }])
        if (stage === "risk_final") {
          setWarnings((payload as { warnings?: string[] }).warnings ?? [])
        }
      } catch {
        // ignore non-JSON keepalive frames
      }
    }

    const stageNames = [
      ...Object.keys(AGENT_META),
      "report_saved",
      "done",
      "error",
    ]

    const listeners: Array<{ stage: string; fn: (e: MessageEvent) => void }> = stageNames.map((stage) => {
      const fn = (e: MessageEvent) => handleStageEvent(stage, e.data)
      es.addEventListener(stage, fn)
      return { stage, fn }
    })

    es.onerror = () => {
      setError("Stream connection lost.")
      setStatus("error")
      es.close()
    }

    return () => {
      listeners.forEach(({ stage, fn }) => es.removeEventListener(stage, fn))
      es.close()
    }
  }, [id])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [events])

  useEffect(() => {
    if (status === "done") {
      window.scrollTo({ top: 0, behavior: "auto" })
    }
  }, [status])

  const completedStages = new Set(events.map((e) => e.stage))
  const progress = Math.round((completedStages.size / TOTAL_STAGES) * 100)
  const debateEvents = events.filter(
    (e) =>
      e.stage.startsWith("bull_round_") ||
      e.stage.startsWith("bear_round_") ||
      e.stage === "debate_verdict"
  )
  const debateStarted = debateEvents.some((e) => e.stage.startsWith("bull_round_") || e.stage.startsWith("bear_round_"))

  // ── Error ────────────────────────────────────────────────────────────────────
  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-card border border-destructive/40 rounded-2xl p-8 max-w-md text-center">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
          <p className="text-muted-foreground text-sm mb-6">{error}</p>
          <button
            onClick={() => router.push("/#intake-section")}
            className="px-5 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            Back to form
          </button>
        </div>
      </div>
    )
  }

  // ── Streaming ────────────────────────────────────────────────────────────────
  if (status !== "done") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Sticky header with progress */}
        <div className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-4">
          <div className="max-w-2xl mx-auto">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => router.push("/#intake-section")}
                className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to form
              </button>
              <button
                type="button"
                onClick={() => router.push("/history")}
                className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <History className="h-4 w-4" />
                History
              </button>
            </div>
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-base font-semibold text-foreground">Building your wealth plan</h1>
              <span className="text-xs text-muted-foreground">{progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            {status === "connecting" && (
              <p className="text-xs text-muted-foreground mt-1.5">Connecting to agents...</p>
            )}
          </div>
        </div>

        {/* Conversation feed */}
        <div className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-1">
          <div className="mb-6 rounded-2xl border border-border bg-card/60 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <h2 className="text-sm font-semibold text-foreground">Layer 2 Live Debate</h2>
              <span className="text-[11px] text-muted-foreground">Bull vs Bear + Facilitator</span>
            </div>

            {!debateStarted ? (
              <p className="text-xs text-muted-foreground">
                Analysts are finishing context. Debate starts as soon as Layer 1 reports are complete.
              </p>
            ) : (
              <div className="space-y-2">
                {debateEvents.map((ev, i) => {
                  const isBull = ev.stage.startsWith("bull_round_")
                  const isBear = ev.stage.startsWith("bear_round_")
                  const isVerdict = ev.stage === "debate_verdict"

                  if (!isBull && !isBear && !isVerdict) return null

                  if (isVerdict) {
                    return (
                      <div key={`debate-${i}`} className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5">
                        <p className="text-[11px] font-semibold text-primary mb-1">Facilitator Verdict</p>
                        <p className="text-xs text-foreground/90 leading-relaxed">{extractMessage(ev.stage, ev.payload)}</p>
                      </div>
                    )
                  }

                  const round = ev.stage.split("_").pop()
                  const confidence = typeof ev.payload.confidence === "number"
                    ? `${Math.round(Number(ev.payload.confidence) * 100)}%`
                    : null

                  return (
                    <div
                      key={`debate-${i}`}
                      className={cn(
                        "rounded-xl border px-3 py-2.5",
                        isBull
                          ? "border-emerald-900/60 bg-emerald-950/25"
                          : "border-red-900/60 bg-red-950/25"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <p className={cn("text-[11px] font-semibold", isBull ? "text-emerald-400" : "text-red-400")}>
                          {isBull ? "Bull Agent" : "Bear Agent"} · Round {round}
                        </p>
                        {confidence && <span className="text-[10px] text-muted-foreground">{confidence}</span>}
                      </div>
                      <p className="text-xs text-foreground/90 leading-relaxed">
                        {summarizeText(String(ev.payload.argument ?? ""), 95)}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {events.map((ev, i) => {
            const meta = AGENT_META[ev.stage]
            if (!meta) return null
            const msg = extractMessage(ev.stage, ev.payload)
            if (!msg) return null

            const isRight = meta.align === "right"
            const roundMatch = ev.stage.match(/^bull_round_(\d+)$/)
            const showDivider = roundMatch && Number(roundMatch[1]) >= 1 &&
              (i === 0 || !events[i - 1]?.stage.startsWith("bull_round_") && !events[i - 1]?.stage.startsWith("bear_round_"))

            return (
              <div key={i}>
                {showDivider && <RoundDivider round={Number(roundMatch![1])} />}
                <div className={cn("flex mb-3", isRight ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] rounded-2xl border px-4 py-3 text-sm",
                    isRight ? "rounded-tr-sm" : "rounded-tl-sm",
                    meta.bubbleClass
                  )}>
                    <p className={cn("text-xs font-semibold mb-1.5", meta.nameColor)}>
                      {meta.name}
                    </p>
                    <p className="text-foreground/90 leading-relaxed">{msg}</p>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Typing indicator for active agent */}
          {status === "streaming" && (
            <div className="flex justify-start mb-3">
              <div className="border border-border/50 bg-muted/30 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1 items-center h-4">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    )
  }

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (!plan) return null
  const alloc = plan.final_allocation

  // Extract agent event payloads
  const retEvent    = events.find(e => e.stage === "retirement")?.payload ?? {}
  const invEvent    = events.find(e => e.stage === "investments")?.payload ?? {}
  const cfEvent     = events.find(e => e.stage === "cash_flow")?.payload ?? {}
  const houEvent    = events.find(e => e.stage === "housing")?.payload ?? {}
  const verdictEvt  = events.find(e => e.stage === "debate_verdict")?.payload ?? {}
  const allocEvt    = events.find(e => e.stage === "allocation_proposed")?.payload ?? {}
  const riskEvt     = events.find(e => e.stage === "risk_final")?.payload ?? {}

  // All debate/risk/summary data — read from plan.plan_insights (guaranteed in done payload)
  // Fall back to event-derived values for older cached plans
  const pi = plan.plan_insights
  const bullWinsOn     = pi?.bull_wins_on   ?? (Array.isArray(verdictEvt.bull_wins_on)  ? verdictEvt.bull_wins_on  as string[] : [])
  const bearWinsOn     = pi?.bear_wins_on   ?? (Array.isArray(verdictEvt.bear_wins_on)  ? verdictEvt.bear_wins_on  as string[] : [])
  const aggressionDial = pi?.aggression_dial  !== undefined ? pi.aggression_dial : (typeof verdictEvt.aggression_dial === "number" ? verdictEvt.aggression_dial as number : null)
  const riskScore      = pi?.risk_score       !== undefined ? pi.risk_score      : (typeof riskEvt.risk_score     === "number" ? riskEvt.risk_score     as number : null)
  const riskWarnings   = pi?.risk_warnings  ?? (Array.isArray(riskEvt.warnings)         ? riskEvt.warnings         as string[] : [])
  const verdictSummary = pi?.verdict_summary   || (verdictEvt.summary ? String(verdictEvt.summary) : null)
  const allocSummary   = pi?.allocator_summary || (allocEvt.summary   ? String(allocEvt.summary)   : null)
  const riskSummary    = pi?.risk_summary      || (riskEvt.summary    ? String(riskEvt.summary)    : null)
  const cfSummary      = (cfEvent.summary    ? String(cfEvent.summary)    : null)
  const retSummary     = (retEvent.summary   ? String(retEvent.summary)   : null)
  const houSummary     = (houEvent.summary   ? String(houEvent.summary)   : null)
  const invSummary     = (invEvent.summary   ? String(invEvent.summary)   : null)

  const salary      = profile?.annual_salary ?? 0
  const match       = profile?.employer_401k_match ?? 0
  const surplus     = (cfEvent.monthly_surplus as number) ?? 0
  const roth_elig   = (retEvent.roth_ira_eligible as boolean) ?? true
  const rec401kPct  = (retEvent.recommended_401k_pct as number) ?? 10
  const retirAmt    = alloc.monthly_amounts["retirement"] ?? 0
  const etfs        = (invEvent.recommended_etfs as string[]) ?? ["VTI","VXUS","BND"]
  const equityPct   = (invEvent.equity_pct as number) ?? 70
  const bondPct     = (invEvent.bond_pct as number) ?? 30
  const investAmt    = alloc.monthly_amounts["investing"] ?? 0
  const houseFundAmt = alloc.monthly_amounts["house_fund"] ?? 0
  const specAmt      = alloc.monthly_amounts["speculative"] ?? 0

  // 401k vs Roth split: up to 401k limit first (match capture), rest to Roth if eligible
  const monthly401k    = Math.min(retirAmt, salary * rec401kPct / 100 / 12)
  const monthlyRoth    = roth_elig ? Math.max(0, retirAmt - monthly401k) : 0
  const annualRoth     = monthlyRoth * 12

  // ETF split within investing bucket (equity/bond split)
  const equityAmt  = investAmt * equityPct / 100
  const bondAmt    = investAmt * bondPct / 100
  const bondETFs   = etfs.filter(t => t === "BND" || t === "SCHD")
  const equityETFs = etfs.filter(t => t !== "BND" && t !== "SCHD")

  // Career trajectory
  // Use plan monthly_amounts sum as effective surplus (always reliable since 100% surplus is allocated)
  const totalAllocated = Object.values(alloc.monthly_amounts as Record<string, number>).reduce((s, v) => s + v, 0)
  const effectiveSurplus = surplus > 0 ? surplus : totalAllocated
  const { rate: growthRate, basis: growthBasis } = getCareerGrowthRate(profile?.occupation, profile?.industry)
  const careerYears = [0, 1, 2, 3, 5]
  const careerData = careerYears.map(yr => {
    const mult         = Math.pow(1 + growthRate, yr)
    const projSalary   = salary * mult
    const projSurplus  = effectiveSurplus * mult
    const projInvest   = investAmt * mult
    const projRetire   = retirAmt * mult
    return { yr, salary: projSalary, surplus: projSurplus, invest: projInvest, retire: projRetire }
  })
  const pieSlices: PieSlice[] = [
    { pct: alloc.cash_emergency_pct, color: "#3b82f6", label: "Emergency" },
    { pct: alloc.retirement_pct,     color: "#8b5cf6", label: "Retirement" },
    { pct: alloc.investing_pct,      color: "#10b981", label: "Investing" },
    { pct: alloc.house_fund_pct,     color: "#f59e0b", label: "House Fund" },
    { pct: alloc.speculative_pct,    color: "#ef4444", label: "Speculative" },
  ]

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/#intake-section")}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Form
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              Home
            </button>
            <button
              type="button"
              onClick={() => router.push("/#intake-section")}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              New plan
            </button>
          </div>
          <button
            type="button"
            onClick={() => router.push(savedReportId ? `/history/${savedReportId}` : "/history")}
            className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <History className="h-4 w-4" />
            {savedReportId ? "Saved report" : "History"}
          </button>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">

        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 bg-card border border-border rounded-2xl p-8 shadow-sm">
          <HealthRing score={plan.health_score} />
          <div className="flex-1">
            <p className="text-xs font-medium text-primary uppercase tracking-widest mb-1">Financial Health Score</p>
            <h1 className="text-xl md:text-2xl font-semibold text-foreground leading-snug">{plan.headline}</h1>
            {profile && (
              <p className="text-xs text-muted-foreground mt-2">
                {profile.name} · {profile.age}yo {profile.occupation} · ${profile.annual_salary.toLocaleString()}/yr
              </p>
            )}
            {savedReportId && (
              <button
                type="button"
                onClick={() => router.push(`/history/${savedReportId}`)}
                className="mt-4 inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-xs font-medium text-foreground transition-colors hover:border-primary/50 hover:text-primary"
              >
                <History className="h-4 w-4" />
                View saved report
              </button>
            )}
          </div>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h2 className="font-semibold text-foreground">Risk Warnings</h2>
            </div>
            {warnings.map((w, i) => (
              <p key={i} className="text-sm text-foreground/80 flex gap-2">
                <span className="text-amber-500 shrink-0">•</span> {w}
              </p>
            ))}
          </div>
        )}

        {/* Debate transcript (persist after loading) */}
        {debateEvents.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-4">Layer 2 Debate Transcript</h2>
            <div className="space-y-3">
              {debateEvents.map((ev, i) => {
                const isBull = ev.stage.startsWith("bull_round_")
                const isBear = ev.stage.startsWith("bear_round_")
                const isVerdict = ev.stage === "debate_verdict"

                if (!isBull && !isBear && !isVerdict) return null

                if (isVerdict) {
                  return (
                    <div key={`done-debate-${i}`} className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3">
                      <p className="text-xs font-semibold text-primary mb-1">Facilitator Verdict</p>
                      <p className="text-sm text-foreground/90 leading-relaxed">
                      {summarizeText(String(ev.payload.summary ?? extractMessage(ev.stage, ev.payload)), 110)}
                      </p>
                    </div>
                  )
                }

                const round = ev.stage.split("_").pop()
                const confidence = typeof ev.payload.confidence === "number"
                  ? `${Math.round(Number(ev.payload.confidence) * 100)}%`
                  : null

                return (
                  <div
                    key={`done-debate-${i}`}
                    className={cn(
                      "rounded-xl border px-4 py-3",
                      isBull ? "border-emerald-900/60 bg-emerald-950/25" : "border-red-900/60 bg-red-950/25"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className={cn("text-xs font-semibold", isBull ? "text-emerald-400" : "text-red-400")}>
                        {isBull ? "Bull Agent" : "Bear Agent"} · Round {round}
                      </p>
                      {confidence && <span className="text-[11px] text-muted-foreground">{confidence}</span>}
                    </div>
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {summarizeText(String(ev.payload.argument ?? extractMessage(ev.stage, ev.payload)), 110)}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Allocation — centered big pie + rows below */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-5">
          <h2 className="font-semibold text-foreground">Monthly Allocation</h2>
          <div className="flex justify-center">
            <PieChart slices={pieSlices} size={220} />
          </div>
          <div className="space-y-3">
            {(() => {
              const rawBucketTotal = BUCKETS.reduce((s, { key }) => s + Math.max(0, alloc[key as keyof AllocationPlan] as number), 0)
              const bScale = rawBucketTotal > 0 ? 100 / rawBucketTotal : 1
              const bRaw     = BUCKETS.map(({ key }) => Math.max(0, alloc[key as keyof AllocationPlan] as number) * bScale * 10)
              const bFloor   = bRaw.map(v => Math.floor(v))
              const bExtra   = 1000 - bFloor.reduce((a, b) => a + b, 0)
              const bDisplay = [...bFloor]
              bRaw.map((v, i) => ({ i, frac: v - bFloor[i] }))
                  .sort((a, b) => b.frac - a.frac)
                  .slice(0, bExtra)
                  .forEach(({ i }) => bDisplay[i]++)
              return BUCKETS.map(({ key, amountKey, label, icon: Icon, color }, bi) => {
                const pct = bDisplay[bi] / 10
                const amt = alloc.monthly_amounts[amountKey] ?? 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground whitespace-nowrap shrink-0">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        {label}
                      </div>
                      <div className="text-sm whitespace-nowrap shrink-0 text-right">
                        <span className="font-semibold text-foreground">{pct.toFixed(1)}%</span>
                        <span className="text-muted-foreground"> · <span className="text-foreground font-medium">${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>/mo</span>
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })
            })()}
          </div>
          {/* Agent reasoning — debate insights + allocation + risk */}
          {(bullWinsOn.length > 0 || bearWinsOn.length > 0 || aggressionDial !== null || allocSummary || riskSummary || verdictSummary) && (
          <div className="pt-3 border-t border-border/50 space-y-3">

            {/* Debate bull/bear breakdown */}
            {(bullWinsOn.length > 0 || bearWinsOn.length > 0 || aggressionDial !== null) && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {bullWinsOn.length > 0 && (
                  <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                    <div className="text-[10px] font-semibold text-green-400 uppercase tracking-wide mb-2">Bull agent won on</div>
                    <ul className="space-y-1">
                      {bullWinsOn.map((pt, i) => (
                        <li key={i} className="text-xs text-foreground/80 flex gap-1.5"><span className="text-green-400 shrink-0">+</span>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {bearWinsOn.length > 0 && (
                  <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                    <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wide mb-2">Bear agent won on</div>
                    <ul className="space-y-1">
                      {bearWinsOn.map((pt, i) => (
                        <li key={i} className="text-xs text-foreground/80 flex gap-1.5"><span className="text-red-400 shrink-0">−</span>{pt}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="bg-muted/20 border border-border/40 rounded-xl p-3 space-y-3">
                  {aggressionDial !== null && (
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                        Aggression dial — {aggressionDial <= 0.33 ? "Conservative" : aggressionDial <= 0.66 ? "Moderate" : "Aggressive"}
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={cn(
                          "h-full rounded-full",
                          aggressionDial <= 0.33 ? "bg-blue-500" : aggressionDial <= 0.66 ? "bg-amber-500" : "bg-rose-500"
                        )} style={{ width: `${aggressionDial * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                        <span>Conservative</span><span>Aggressive</span>
                      </div>
                    </div>
                  )}
                  {riskScore !== null && (
                    <div>
                      <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                        Risk score: <span className={riskScore >= 7 ? "text-rose-400" : riskScore >= 4 ? "text-amber-400" : "text-emerald-400"}>{riskScore.toFixed(1)} / 10</span>
                      </div>
                      {riskWarnings.length > 0 && (
                        <ul className="space-y-0.5 mt-1">
                          {riskWarnings.map((w, i) => <li key={i} className="text-[10px] text-amber-300/70">⚠ {w}</li>)}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Allocator + risk manager summaries */}
            {(allocSummary || riskSummary) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {allocSummary && (
                <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-3">
                  <div className="text-[10px] font-semibold text-cyan-400 uppercase tracking-wide mb-1">Allocator reasoning</div>
                  <p className="text-xs text-foreground/80">{allocSummary}</p>
                </div>
              )}
              {riskSummary && (
                <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-3">
                  <div className="text-[10px] font-semibold text-rose-400 uppercase tracking-wide mb-1">Risk manager decision</div>
                  <p className="text-xs text-foreground/80">{riskSummary}</p>
                </div>
              )}
            </div>
            )}

            {verdictSummary && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
                <div className="text-[10px] font-semibold text-primary uppercase tracking-wide mb-1">Facilitator final verdict</div>
                <p className="text-xs text-foreground/80">{verdictSummary}</p>
              </div>
            )}
          </div>
          )}
        </div>

        {/* Specific Portfolio Breakdown */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="font-semibold text-foreground">Specific Portfolio Instructions</h2>

          {/* Retirement sub-breakdown */}
          <div>
            <h3 className="text-sm font-medium text-violet-400 flex items-center gap-2 mb-2">
              <Briefcase className="w-4 h-4" /> Retirement — ${retirAmt.toLocaleString(undefined,{maximumFractionDigits:0})}/mo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-xl p-4 border border-violet-500/20">
                <div className="text-xs text-muted-foreground mb-1">401(k) contribution</div>
                <div className="text-xl font-bold text-foreground">${monthly401k.toLocaleString(undefined,{maximumFractionDigits:0})}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <div className="text-xs text-muted-foreground mt-1">
                  {rec401kPct.toFixed(0)}% of salary · {match > 0 ? `captures ${match}% employer match` : "full pre-tax benefit"}
                </div>
                {match > 0 && (
                  <div className="text-xs text-emerald-400 mt-1">+${(salary * match / 100 / 12).toLocaleString(undefined,{maximumFractionDigits:0})}/mo free from employer</div>
                )}
              </div>
              {roth_elig && annualRoth > 0 ? (
                <div className="bg-muted/30 rounded-xl p-4 border border-violet-500/20">
                  <div className="text-xs text-muted-foreground mb-1">Roth IRA</div>
                  <div className="text-xl font-bold text-foreground">${monthlyRoth.toLocaleString(undefined,{maximumFractionDigits:0})}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <div className="text-xs text-muted-foreground mt-1">${Math.min(annualRoth, 7000).toLocaleString(undefined,{maximumFractionDigits:0})}/yr · tax-free growth · 2025 limit $7,000</div>
                </div>
              ) : !roth_elig ? (
                <div className="bg-muted/30 rounded-xl p-4 border border-amber-500/20">
                  <div className="text-xs text-amber-400 mb-1">Roth IRA — income too high</div>
                  <div className="text-xs text-muted-foreground">Consider a backdoor Roth or traditional IRA. Max pre-tax 401k first.</div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Investing sub-breakdown */}
          <div>
            <h3 className="text-sm font-medium text-emerald-400 flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4" /> Taxable Investing — ${investAmt.toLocaleString(undefined,{maximumFractionDigits:0})}/mo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {equityETFs.map((ticker) => {
                const share = equityAmt / (equityETFs.length || 1)
                return (
                  <div key={ticker} className="bg-muted/30 rounded-xl p-4 border border-emerald-500/20">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-bold text-emerald-400">{ticker}</span>
                      <span className="text-xs text-muted-foreground">Equity</span>
                    </div>
                    <div className="text-xl font-bold text-foreground">${share.toLocaleString(undefined,{maximumFractionDigits:0})}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {ticker === "VTI" && "US total market"}
                      {ticker === "VXUS" && "International ex-US"}
                      {ticker === "QQQ" && "Nasdaq 100 tech growth"}
                      {ticker === "SCHD" && "Dividend growth"}
                      {!["VTI","VXUS","QQQ","SCHD"].includes(ticker) && "Equity ETF"}
                    </div>
                  </div>
                )
              })}
              {bondETFs.map(ticker => (
                <div key={ticker} className="bg-muted/30 rounded-xl p-4 border border-sky-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-sky-400">{ticker}</span>
                    <span className="text-xs text-muted-foreground">Bonds</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">${bondAmt.toLocaleString(undefined,{maximumFractionDigits:0})}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {ticker === "BND" ? "US total bond market" : "Dividend / income ETF"}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">Use Fidelity, Schwab, or Vanguard — set auto-invest on payday.</p>
          </div>

          {/* House Fund sub-breakdown */}
          {houseFundAmt > 0 && (
            <div>
              <h3 className="text-sm font-medium text-amber-400 flex items-center gap-2 mb-2">
                <Home className="w-4 h-4" /> House Fund — ${houseFundAmt.toLocaleString(undefined,{maximumFractionDigits:0})}/mo
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-muted/30 rounded-xl p-4 border border-amber-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-amber-400">HYSA</span>
                    <span className="text-xs text-muted-foreground">Primary</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">${Math.round(houseFundAmt * 0.8).toLocaleString(undefined,{maximumFractionDigits:0})}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <div className="text-xs text-muted-foreground mt-1">High-yield savings · liquid · ~4.5% APY. Use Marcus, Ally, or SoFi.</div>
                </div>
                <div className="bg-muted/30 rounded-xl p-4 border border-amber-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-amber-400">SCHO / I-Bond</span>
                    <span className="text-xs text-muted-foreground">Buffer</span>
                  </div>
                  <div className="text-xl font-bold text-foreground">${Math.round(houseFundAmt * 0.2).toLocaleString(undefined,{maximumFractionDigits:0})}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <div className="text-xs text-muted-foreground mt-1">Short-term Treasury ETF or I-Bond if buying in 2+ yrs.</div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Keep this account separate and labeled “Down Payment” — don’t mix with emergency fund.</p>
            </div>
          )}

          {/* Speculative sub-breakdown */}
          {specAmt > 0 && (() => {
            const isAggressive  = (aggressionDial ?? 0.5) > 0.66
            const isConservative = (aggressionDial ?? 0.5) <= 0.33
            const specItems = isConservative
              ? [
                  { ticker: "QQQM", label: "Nasdaq 100 (low-cost)",  pct: 0.6 },
                  { ticker: "VBK",  label: "Small-cap growth",       pct: 0.4 },
                ]
              : isAggressive
              ? [
                  { ticker: "QQQM",  label: "Nasdaq 100 growth",     pct: 0.35 },
                  { ticker: "SOXX",  label: "Semiconductor sector",  pct: 0.25 },
                  { ticker: "IBIT",  label: "Bitcoin ETF (BlackRock)",pct: 0.25 },
                  { ticker: "Stocks",label: "1–3 conviction stocks",  pct: 0.15 },
                ]
              : [
                  { ticker: "QQQM", label: "Nasdaq 100 growth",      pct: 0.5 },
                  { ticker: "ARKK", label: "Disruptive innovation",  pct: 0.25 },
                  { ticker: "VBK",  label: "Small-cap growth",       pct: 0.25 },
                ]
            return (
              <div>
                <h3 className="text-sm font-medium text-rose-400 flex items-center gap-2 mb-2">
                  <Zap className="w-4 h-4" /> Speculative — ${specAmt.toLocaleString(undefined,{maximumFractionDigits:0})}/mo
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {specItems.map(({ ticker, label, pct }) => (
                    <div key={ticker} className="bg-muted/30 rounded-xl p-4 border border-rose-500/20">
                      <div className="text-xs text-muted-foreground mb-1">{label}</div>
                      <div className="text-base font-bold text-foreground">${Math.round(specAmt * pct).toLocaleString(undefined,{maximumFractionDigits:0})}<span className="text-xs font-normal text-muted-foreground">/mo</span></div>
                      <div className="text-xs font-semibold text-rose-400 mt-1">{ticker}</div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  {isConservative ? "Conservative speculative play — high-quality growth ETFs with no individual stock risk."
                   : isAggressive ? "High-risk bucket — only invest what you can lose 100% of. Dollar-cost average monthly, don’t chase pumps."
                   : "Moderate speculative bucket — growth ETFs only. Avoid YOLO trades. Max 1-3 individual stocks if any."}
                </p>
              </div>
            )
          })()}

          {/* Agent Reports — plan.analyst_reports with event fallback */}
          {(() => {
            const r = plan.analyst_reports
            const cf  = r?.cash_flow   || cfSummary
            const ret = r?.retirement  || retSummary
            const hou = r?.housing     || houSummary
            const inv = r?.investment  || invSummary
            if (!cf && !ret && !hou && !inv) return null
            return (
              <div className="pt-4 border-t border-border/50">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide mb-3">Analyst Reports</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cf && (
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-1.5">Cash Flow Analyst</div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{cf}</p>
                    </div>
                  )}
                  {ret && (
                    <div className="bg-violet-500/5 border border-violet-500/20 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-violet-400 uppercase tracking-wide mb-1.5">Retirement Analyst</div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{ret}</p>
                    </div>
                  )}
                  {hou && (
                    <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide mb-1.5">Housing Analyst</div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{hou}</p>
                    </div>
                  )}
                  {inv && (
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide mb-1.5">Investment Analyst</div>
                      <p className="text-xs text-foreground/80 leading-relaxed">{inv}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </div>

        {/* Career Trajectory */}
        {salary > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-1">Career Trajectory</h2>
            <div className="mb-5 space-y-1">
              <p className="text-xs text-muted-foreground">
                <span className="text-foreground font-medium">{(growthRate * 100).toFixed(0)}% annual growth</span>
                {profile?.occupation && <span> estimated for <span className="text-foreground">{profile.occupation}</span></span>}
                {profile?.industry && <span> in <span className="text-foreground">{profile.industry}</span></span>}.
              </p>
              <p className="text-xs text-muted-foreground/70 italic">{growthBasis}.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {careerData.map(({ yr, salary: s, invest: inv, retire: ret, surplus: sur }) => {
                const isNow = yr === 0
                const extraInvest = inv - careerData[0].invest
                return (
                  <div key={yr} className={cn(
                    "rounded-xl p-4 border flex flex-col gap-2",
                    isNow ? "border-primary/40 bg-primary/5" : "border-border/60 bg-muted/20"
                  )}>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                        {isNow ? "Today" : `+${yr} yr${yr > 1 ? "s" : ""}`}
                      </span>
                      {isNow && <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-semibold">Baseline</span>}
                    </div>

                    <div>
                      <div className="text-[10px] text-muted-foreground">Salary</div>
                      <div className="text-base font-bold text-foreground">${s.toLocaleString(undefined,{maximumFractionDigits:0})}</div>
                    </div>

                    <div>
                      <div className="text-[10px] text-muted-foreground">Monthly surplus</div>
                      <div className="text-sm font-semibold text-foreground">${sur.toLocaleString(undefined,{maximumFractionDigits:0})}/mo</div>
                    </div>

                    <div className="pt-1 border-t border-border/40 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-emerald-400 font-medium">Investing</span>
                        <span className="text-xs font-bold text-emerald-400">${inv.toLocaleString(undefined,{maximumFractionDigits:0})}/mo</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-violet-400 font-medium">Retirement</span>
                        <span className="text-xs font-bold text-violet-400">${ret.toLocaleString(undefined,{maximumFractionDigits:0})}/mo</span>
                      </div>
                    </div>

                    {!isNow && extraInvest > 0 && (
                      <div className="text-[10px] text-emerald-300/70 mt-1">
                        +${extraInvest.toLocaleString(undefined,{maximumFractionDigits:0})}/mo more than today
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-muted-foreground mt-4 border-t border-border/40 pt-4">
              <span className="text-amber-400 font-medium">Raise rule:</span> When your salary increases, keep expenses flat and redirect the extra take-home — split it 60% investing, 30% retirement, 10% house fund.
            </p>
          </div>
        )}

        {/* Next $1,000 */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-foreground mb-1">Your Next $1,000</h2>
          <p className="text-xs text-muted-foreground mb-5">Exact split for your next $1,000 of monthly surplus.</p>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {NEXT_K.map(({ key, label, color }) => {
              const amt = plan.next_thousand[key as keyof NextThousand]
              return (
                <div key={key} className="bg-muted/40 rounded-xl p-4 text-center">
                  <div className={cn("w-2 h-2 rounded-full mx-auto mb-2", color)} />
                  <div className="text-lg font-bold text-foreground">${amt.toFixed(0)}</div>
                  <div className="text-xs text-muted-foreground mt-1">{label}</div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 12-month roadmap */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-foreground mb-1">12-Month Roadmap</h2>
          <p className="text-xs text-muted-foreground mb-6">Month-by-month action plan with specific steps and career growth checkpoints.</p>
          <div className="relative pl-6 border-l-2 border-primary/30 space-y-5">
            {plan.milestones_12mo.map((m, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[1.85rem] w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <div className="bg-muted/20 border border-border/60 rounded-xl p-4 hover:border-primary/30 transition-colors">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                      {m.month ? `Month ${m.month}` : `Step ${i + 1}`}
                    </span>
                    {m.target_metric && (
                      <span className="text-xs font-semibold text-emerald-400">{m.target_metric}</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground">{m.label}</p>
                  {m.action && (
                    <div className="mt-2 flex gap-2 items-start">
                      <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide shrink-0 mt-0.5">Action</span>
                      <p className="text-xs text-foreground/80">{m.action}</p>
                    </div>
                  )}
                  {m.career_note && (
                    <div className="mt-2 flex gap-2 items-start">
                      <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wide shrink-0 mt-0.5">Career</span>
                      <p className="text-xs text-amber-300/80">{m.career_note}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5-year vision */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-foreground mb-5">5-Year Vision</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plan.milestones_5yr.map((m, i) => (
              <div key={i} className="bg-muted/30 rounded-xl p-4 border border-violet-500/20 hover:border-violet-500/40 transition-colors">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">
                    {m.year ? `Year ${m.year}` : `Goal ${i + 1}`}
                  </span>
                  {m.target_metric && (
                    <span className="text-xs font-semibold text-emerald-400">{m.target_metric}</span>
                  )}
                </div>
                <p className="text-sm font-semibold text-foreground">{m.label}</p>
                {m.action && (
                  <div className="mt-2 flex gap-2 items-start">
                    <span className="text-[10px] font-bold text-sky-400 uppercase tracking-wide shrink-0 mt-0.5">How</span>
                    <p className="text-xs text-foreground/80">{m.action}</p>
                  </div>
                )}
                {m.career_note && (
                  <p className="text-xs text-amber-300/70 mt-2 italic">{m.career_note}</p>
                )}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
