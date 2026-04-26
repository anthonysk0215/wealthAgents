"use client"

import React, { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { AlertTriangle, TrendingUp, Home, Shield, Briefcase, Zap } from "lucide-react"
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
}

interface WealthPlan {
  headline: string
  health_score: number
  final_allocation: AllocationPlan
  next_thousand: NextThousand
  milestones_12mo: Milestone[]
  milestones_5yr: Milestone[]
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

function PieChart({ slices }: { slices: PieSlice[] }) {
  const cx = 80; const cy = 80; const r = 70
  let startAngle = -Math.PI / 2
  const paths: React.ReactElement[] = []
  slices.forEach((s, i) => {
    if (s.pct <= 0) return
    const angle = (s.pct / 100) * 2 * Math.PI
    const end = startAngle + angle
    const x1 = cx + r * Math.cos(startAngle); const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(end);         const y2 = cy + r * Math.sin(end)
    const large = angle > Math.PI ? 1 : 0
    paths.push(
      <path key={i}
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
        fill={s.color} stroke="hsl(var(--background))" strokeWidth="2"
      />
    )
    startAngle = end
  })
  return (
    <div className="flex flex-col items-center gap-4">
      <svg width="160" height="160" viewBox="0 0 160 160">{paths}</svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {slices.filter(s => s.pct > 0).map((s, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: s.color }} />
            <span className="text-xs text-muted-foreground">{s.label} {s.pct.toFixed(1)}%</span>
          </div>
        ))}
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

  // Extract Layer 1 data from events for specific portfolio breakdown
  const retEvent = events.find(e => e.stage === "retirement")?.payload ?? {}
  const invEvent  = events.find(e => e.stage === "investments")?.payload ?? {}
  const cfEvent   = events.find(e => e.stage === "cash_flow")?.payload ?? {}

  const salary      = profile?.annual_salary ?? 0
  const match       = profile?.employer_401k_match ?? 0
  const surplus     = (cfEvent.monthly_surplus as number) ?? 0
  const roth_elig   = (retEvent.roth_ira_eligible as boolean) ?? true
  const rec401kPct  = (retEvent.recommended_401k_pct as number) ?? 10
  const retirAmt    = alloc.monthly_amounts["retirement"] ?? 0
  const etfs        = (invEvent.recommended_etfs as string[]) ?? ["VTI","VXUS","BND"]
  const equityPct   = (invEvent.equity_pct as number) ?? 70
  const bondPct     = (invEvent.bond_pct as number) ?? 30
  const investAmt   = alloc.monthly_amounts["investing"] ?? 0

  // 401k vs Roth split: up to 401k limit first (match capture), rest to Roth if eligible
  const monthly401k    = Math.min(retirAmt, salary * rec401kPct / 100 / 12)
  const monthlyRoth    = roth_elig ? Math.max(0, retirAmt - monthly401k) : 0
  const annualRoth     = monthlyRoth * 12

  // ETF split within investing bucket (equity/bond split)
  const equityAmt  = investAmt * equityPct / 100
  const bondAmt    = investAmt * bondPct / 100
  const bondETFs   = etfs.filter(t => t === "BND" || t === "SCHD")
  const equityETFs = etfs.filter(t => t !== "BND" && t !== "SCHD")

  // Career trajectory — typical annual salary growth by risk tolerance / industry
  const growthRate = { conservative: 0.03, moderate: 0.04, moderate_aggressive: 0.05, aggressive: 0.06 }[profile?.risk_tolerance ?? "moderate"] ?? 0.04
  const careerYears = [0, 1, 2, 3, 5]
  const careerData = careerYears.map(yr => {
    const projSalary  = salary * Math.pow(1 + growthRate, yr)
    const projSurplus = surplus * Math.pow(1 + growthRate, yr)
    const projInvest  = projSurplus * (alloc.investing_pct / 100)
    return { yr, salary: projSalary, surplus: projSurplus, invest: projInvest }
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

        {/* Allocation — pie chart + breakdown side by side */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-foreground mb-5">Monthly Allocation</h2>
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="shrink-0 mx-auto md:mx-0">
              <PieChart slices={pieSlices} />
            </div>
            <div className="flex-1 space-y-4 w-full">
              {BUCKETS.map(({ key, amountKey, label, icon: Icon, color }) => {
                const pct = alloc[key as keyof AllocationPlan] as number
                const amt = alloc.monthly_amounts[amountKey] ?? 0
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        {label}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground">{pct.toFixed(1)}%</span>
                        {" "}· ${amt.toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo
                      </div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-700", color)} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-5">{alloc.summary}</p>
        </div>

        {/* Specific Portfolio Breakdown */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm space-y-6">
          <h2 className="font-semibold text-foreground">Specific Portfolio Instructions</h2>

          {/* Retirement sub-breakdown */}
          <div>
            <h3 className="text-sm font-medium text-violet-400 mb-3 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> Retirement — ${retirAmt.toLocaleString(undefined,{maximumFractionDigits:0})}/mo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="bg-muted/30 rounded-xl p-4 border border-violet-500/20">
                <div className="text-xs text-muted-foreground mb-1">401(k) contribution</div>
                <div className="text-xl font-bold text-foreground">${monthly401k.toLocaleString(undefined,{maximumFractionDigits:0})}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                <div className="text-xs text-muted-foreground mt-1">
                  {rec401kPct.toFixed(0)}% of salary · captures {match > 0 ? `${match}% employer match` : "full pre-tax benefit"}
                </div>
                {match > 0 && (
                  <div className="text-xs text-emerald-400 mt-1">+${(salary * match / 100 / 12).toLocaleString(undefined,{maximumFractionDigits:0})}/mo free from employer</div>
                )}
              </div>
              {roth_elig && annualRoth > 0 && (
                <div className="bg-muted/30 rounded-xl p-4 border border-violet-500/20">
                  <div className="text-xs text-muted-foreground mb-1">Roth IRA</div>
                  <div className="text-xl font-bold text-foreground">${monthlyRoth.toLocaleString(undefined,{maximumFractionDigits:0})}<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
                  <div className="text-xs text-muted-foreground mt-1">${Math.min(annualRoth, 7000).toLocaleString(undefined,{maximumFractionDigits:0})}/yr · tax-free growth · 2025 limit $7,000</div>
                </div>
              )}
              {!roth_elig && (
                <div className="bg-muted/30 rounded-xl p-4 border border-amber-500/20">
                  <div className="text-xs text-amber-400 mb-1">Roth IRA — income too high</div>
                  <div className="text-sm text-muted-foreground">Consider a backdoor Roth or traditional IRA instead. Max pre-tax 401k contributions first.</div>
                </div>
              )}
            </div>
          </div>

          {/* Investing sub-breakdown */}
          <div>
            <h3 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> Taxable Investing — ${investAmt.toLocaleString(undefined,{maximumFractionDigits:0})}/mo
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {equityETFs.map((ticker, i) => {
                const share = equityAmt / equityETFs.length
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
            <p className="text-xs text-muted-foreground mt-3">Use a brokerage like Fidelity, Schwab, or Vanguard. Set up auto-invest on payday.</p>
          </div>
        </div>

        {/* Career Trajectory */}
        {salary > 0 && (
          <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
            <h2 className="font-semibold text-foreground mb-1">Career Trajectory</h2>
            <p className="text-xs text-muted-foreground mb-6">
              Projected at {(growthRate * 100).toFixed(0)}% annual salary growth based on your risk profile.
              As income grows, here&apos;s what you can invest more of.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-muted-foreground border-b border-border">
                    <th className="text-left pb-3 font-medium">Year</th>
                    <th className="text-right pb-3 font-medium">Est. Salary</th>
                    <th className="text-right pb-3 font-medium">Monthly Surplus</th>
                    <th className="text-right pb-3 font-medium">Investing Budget</th>
                    <th className="text-right pb-3 font-medium">vs Today</th>
                  </tr>
                </thead>
                <tbody>
                  {careerData.map(({ yr, salary: s, surplus: sur, invest: inv }) => (
                    <tr key={yr} className={cn("border-b border-border/40", yr === 0 && "bg-primary/5")}>
                      <td className="py-3 font-medium text-foreground">
                        {yr === 0 ? "Now" : `+${yr} yr${yr > 1 ? "s" : ""}`}
                        {yr === 0 && <span className="ml-2 text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded">Today</span>}
                      </td>
                      <td className="py-3 text-right text-foreground">${s.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                      <td className="py-3 text-right text-foreground">${sur.toLocaleString(undefined,{maximumFractionDigits:0})}/mo</td>
                      <td className="py-3 text-right text-emerald-400 font-semibold">${inv.toLocaleString(undefined,{maximumFractionDigits:0})}/mo</td>
                      <td className="py-3 text-right text-muted-foreground">
                        {yr === 0 ? "—" : <span className="text-emerald-400">+${(inv - careerData[0].invest).toLocaleString(undefined,{maximumFractionDigits:0})}/mo</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Visual bar chart */}
            <div className="mt-6 space-y-2">
              {careerData.map(({ yr, invest: inv }) => (
                <div key={yr} className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground w-14 shrink-0">{yr === 0 ? "Now" : `+${yr}yr`}</div>
                  <div className="flex-1 h-6 bg-muted rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 rounded-lg flex items-center px-2 transition-all duration-700"
                      style={{ width: `${(inv / (careerData[careerData.length-1].invest || 1)) * 100}%` }}
                    >
                      {inv > 100 && <span className="text-xs text-white font-medium">${inv.toLocaleString(undefined,{maximumFractionDigits:0})}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
          <h2 className="font-semibold text-foreground mb-5">12-Month Roadmap</h2>
          <div className="relative pl-6 border-l-2 border-primary/30 space-y-6">
            {plan.milestones_12mo.map((m, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-[1.85rem] w-4 h-4 rounded-full bg-primary/20 border-2 border-primary flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                </div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold text-primary">{m.month ? `Month ${m.month}` : `Step ${i + 1}`}</span>
                </div>
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                {m.target_metric && <p className="text-xs text-muted-foreground mt-0.5">{m.target_metric}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* 5-year vision */}
        <div className="bg-card border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="font-semibold text-foreground mb-5">5-Year Vision</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {plan.milestones_5yr.map((m, i) => (
              <div key={i} className="bg-muted/30 rounded-xl p-4 border border-violet-500/20">
                <div className="text-xs font-bold text-violet-400 mb-1">{m.year ? `Year ${m.year}` : `Goal ${i + 1}`}</div>
                <p className="text-sm font-medium text-foreground">{m.label}</p>
                {m.target_metric && <p className="text-xs text-muted-foreground mt-1">{m.target_metric}</p>}
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
