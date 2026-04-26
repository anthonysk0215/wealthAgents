"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { History, LogIn, LogOut, Menu, UserCircle } from "lucide-react"
import Link from "next/link"
import { clearAuth, getStoredUser } from "@/lib/auth"
import { useEffect, useRef, useState } from "react"

export function Header() {
  const [userName, setUserName] = useState<string | null>(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setUserName(getStoredUser()?.name ?? null)
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const navItems = [
    { name: "How It Works", href: "#features-section" },
    { name: "FAQ", href: "#faq-section" },
  ]

  const handleScroll = (e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault()
    const targetId = href.substring(1) // Remove '#' from href
    const targetElement = document.getElementById(targetId)
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: "smooth" })
    }
  }

  return (
    <header className="w-full py-4 px-6">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <span className="text-foreground text-xl font-semibold">WealthAgents</span>
          </div>
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={(e) => handleScroll(e, item.href)} // Add onClick handler
                className="text-[#888888] hover:text-foreground px-4 py-2 rounded-full font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {userName ? (
            <>
              <Link href="/history" className="hidden md:block">
                <Button variant="ghost" className="rounded-full gap-2">
                  <History className="h-4 w-4" />
                  History
                </Button>
              </Link>
              <div ref={dropdownRef} className="relative hidden md:block">
                <Button
                  variant="ghost"
                  className="rounded-full gap-2"
                  onClick={() => setDropdownOpen(o => !o)}
                >
                  <UserCircle className="h-4 w-4" />
                  {userName}
                </Button>
                {dropdownOpen && (
                  <div className="absolute right-0 mt-1 w-44 rounded-xl border border-border bg-card shadow-lg py-1 z-50">
                    <div className="px-3 py-2 text-xs text-muted-foreground truncate border-b border-border mb-1">{userName}</div>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-muted/40 transition-colors"
                      onClick={() => { clearAuth(); setUserName(null); setDropdownOpen(false) }}
                    >
                      <LogOut className="h-4 w-4" />
                      Log out
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/login" className="hidden md:block">
              <Button variant="ghost" className="rounded-full gap-2">
                <LogIn className="h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
          <Link href="#intake-section" className="hidden md:block">
            <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6 py-2 rounded-full font-medium shadow-sm">
              Build My Plan
            </Button>
          </Link>
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="text-foreground">
                <Menu className="h-7 w-7" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-background border-t border-border text-foreground">
              <SheetHeader>
                <SheetTitle className="text-left text-xl font-semibold text-foreground">Navigation</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={(e) => handleScroll(e, item.href)} // Add onClick handler
                    className="text-[#888888] hover:text-foreground justify-start text-lg py-2"
                  >
                    {item.name}
                  </Link>
                ))}
                {userName ? (
                  <>
                    <Link href="/history" className="text-[#888888] hover:text-foreground justify-start text-lg py-2">
                      History
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        clearAuth()
                        setUserName(null)
                      }}
                      className="text-left text-[#888888] hover:text-foreground justify-start text-lg py-2"
                    >
                      Sign out {userName}
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="text-[#888888] hover:text-foreground justify-start text-lg py-2">
                    Login
                  </Link>
                )}
                <Link href="#intake-section" className="w-full mt-4">
                  <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-6 py-2 rounded-full font-medium shadow-sm">
                    Build My Plan
                  </Button>
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
