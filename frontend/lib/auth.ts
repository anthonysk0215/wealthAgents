export const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export type AuthUser = {
  id: string
  email: string
  name: string
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("wealthToken")
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem("wealthUser")
  if (!raw) return null
  try {
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

export function saveAuth(token: string, user: AuthUser) {
  localStorage.setItem("wealthToken", token)
  localStorage.setItem("wealthUser", JSON.stringify(user))
}

export function clearAuth() {
  localStorage.removeItem("wealthToken")
  localStorage.removeItem("wealthUser")
}

export function authHeaders(): HeadersInit {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
