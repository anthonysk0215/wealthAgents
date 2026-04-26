"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

import { API_URL, saveAuth } from "@/lib/auth"
import { supabase } from "@/lib/supabase"

function AuthCallbackContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function finishLogin() {
      if (!supabase) {
        setError("Supabase Auth is not configured")
        return
      }

      const { data, error: sessionError } = await supabase.auth.getSession()
      if (sessionError || !data.session?.access_token) {
        setError(sessionError?.message || "Supabase session was not created")
        return
      }

      const res = await fetch(`${API_URL}/api/auth/supabase`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: data.session.access_token }),
      })
      const payload = await res.json()
      if (!res.ok) {
        setError(payload.detail || "Could not create app session")
        return
      }

      saveAuth(payload.token, payload.user)
      router.replace(searchParams.get("next") || "/history")
    }

    finishLogin().catch((err) => {
      setError(err instanceof Error ? err.message : "Could not finish Google sign-in")
    })
  }, [router, searchParams])

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-foreground">
          {error ? "Sign-in failed" : "Finishing sign-in"}
        </h1>
        <p className={error ? "mt-3 text-sm text-destructive" : "mt-3 text-sm text-muted-foreground"}>
          {error || "Connecting your Supabase account to WealthAgents..."}
        </p>
      </div>
    </main>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-background px-4">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-foreground">Finishing sign-in</h1>
            <p className="mt-3 text-sm text-muted-foreground">Connecting your Supabase account to WealthAgents...</p>
          </div>
        </main>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}
