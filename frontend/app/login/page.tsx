"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, LockKeyhole, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { API_URL, saveAuth } from "@/lib/auth"

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<"login" | "register">("login")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_URL}/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(mode === "register" ? { name, email, password } : { email, password }),
      })
      const payload = await res.json()
      if (!res.ok) throw new Error(payload.detail || "Authentication failed")
      saveAuth(payload.token, payload.user)
      const next = new URLSearchParams(window.location.search).get("next")
      router.push(next || "/history")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-5xl items-center justify-center">
        <div className="grid w-full gap-8 md:grid-cols-[1fr_420px] md:items-center">
          <section className="space-y-5">
            <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
              <span className="inline-flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                WealthAgents
              </span>
            </Link>
            <h1 className="max-w-xl text-4xl font-semibold tracking-normal text-foreground md:text-5xl">
              Save every wealth plan and compare your progress over time.
            </h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">
              Accounts keep your generated reports, agent summaries, allocations, and milestones tied to your profile.
            </p>
          </section>

          <form onSubmit={submit} className="rounded-lg border border-border bg-card p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                {mode === "login" ? <LockKeyhole className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {mode === "login" ? "Log in" : "Create account"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {mode === "login" ? "Access your report history." : "Start saving future reports."}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {mode === "register" && (
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {error && (
              <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" className="mt-6 w-full rounded-md" disabled={loading}>
              {loading ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}
            </Button>

            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="mt-4 w-full text-sm text-muted-foreground hover:text-foreground"
            >
              {mode === "login" ? "Need an account? Create one" : "Already have an account? Log in"}
            </button>
          </form>
        </div>
      </div>
    </main>
  )
}
