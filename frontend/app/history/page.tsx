"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, FileText, Home, Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { API_URL, authHeaders, clearAuth, getToken } from "@/lib/auth"

type ReportSummary = {
  id: string
  title: string
  created_at: string
  profile_name?: string
  primary_goal?: string
  headline?: string
  health_score?: number
}

export default function HistoryPage() {
  const router = useRouter()
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/history")
      return
    }

    fetch(`${API_URL}/api/reports`, { headers: authHeaders() })
      .then(async (res) => {
        const payload = await res.json()
        if (!res.ok) throw new Error(payload.detail || "Failed to load reports")
        setReports(payload.reports || [])
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load reports")
        if (String(err).includes("Invalid") || String(err).includes("401")) clearAuth()
      })
      .finally(() => setLoading(false))
  }, [router])

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col gap-4 border-b border-border pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              WealthAgents
            </Link>
            <h1 className="mt-3 text-3xl font-semibold text-foreground">Report History</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Saved plans from completed WealthAgents runs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/">
              <Button variant="ghost" className="rounded-md gap-2">
                <Home className="h-4 w-4" />
                Home
              </Button>
            </Link>
            <Link href="/#intake-section">
              <Button className="rounded-md gap-2">
                <Plus className="h-4 w-4" />
                New plan
              </Button>
            </Link>
          </div>
        </header>

        {loading && <p className="text-sm text-muted-foreground">Loading reports...</p>}
        {error && <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

        {!loading && !error && reports.length === 0 && (
          <section className="rounded-lg border border-border bg-card p-8 text-center">
            <FileText className="mx-auto h-10 w-10 text-muted-foreground" />
            <h2 className="mt-4 text-lg font-semibold text-foreground">No saved reports yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">Run your first plan while logged in and it will appear here.</p>
          </section>
        )}

        <div className="grid gap-4">
          {reports.map((report) => (
            <Link
              key={report.id}
              href={`/history/${report.id}`}
              className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {new Date(report.created_at).toLocaleString()}
                  </p>
                  <h2 className="mt-1 truncate text-lg font-semibold text-foreground">{report.title}</h2>
                  {report.headline && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{report.headline}</p>
                  )}
                  {report.primary_goal && (
                    <p className="mt-2 text-xs text-muted-foreground">Goal: {report.primary_goal}</p>
                  )}
                </div>
                <div className="flex items-center gap-4">
                  {typeof report.health_score === "number" && (
                    <div className="rounded-md border border-border px-3 py-2 text-center">
                      <p className="text-xs text-muted-foreground">Health</p>
                      <p className="text-lg font-semibold text-foreground">{Math.round(report.health_score)}</p>
                    </div>
                  )}
                  <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  )
}
