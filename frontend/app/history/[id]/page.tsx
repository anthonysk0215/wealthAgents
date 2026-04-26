"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"

import { API_URL, authHeaders, getToken } from "@/lib/auth"

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
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
        sessionStorage.setItem("wealthSavedReport", JSON.stringify(payload))
        router.replace(`/plan/${payload.plan_id || payload.id}?saved=true&report_id=${payload.id}`)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load report")
      })
  }, [id, router])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">
          {error ? "Could not open report" : "Opening saved report"}
        </h1>
        <p className={error ? "mt-3 text-sm text-destructive" : "mt-3 text-sm text-muted-foreground"}>
          {error || "Loading the exact generated report view..."}
        </p>
      </div>
    </main>
  )
}
