"use client"

import type React from "react"

const AgentTrace: React.FC = () => {
  const themeVars = {
    "--ai-primary-color": "hsl(var(--primary))",
    "--ai-background-color": "hsl(var(--background))",
    "--ai-text-color": "hsl(var(--foreground))",
    "--ai-text-dark": "hsl(var(--primary-foreground))",
    "--ai-border-color": "hsl(var(--border))",
    "--ai-border-main": "hsl(var(--foreground) / 0.1)",
    "--ai-highlight-primary": "hsl(var(--primary) / 0.12)",
    "--ai-highlight-header": "hsl(var(--accent) / 0.2)",
  }

  const agentEvents = [
    { agent: "Cash Flow Analyst", status: "complete", message: "35% savings rate, $4,400/mo surplus" },
    { agent: "Retirement Analyst", status: "complete", message: "Max Roth IRA, capture full match" },
    { agent: "Housing Analyst", status: "complete", message: "$1M home: STRETCH, 8 years out" },
    { agent: "Investment Analyst", status: "active", message: "90/10 equity/bonds, VTI + VXUS" },
    { agent: "Bull Agent", status: "pending", message: "Awaiting analysis..." },
    { agent: "Bear Agent", status: "pending", message: "Awaiting analysis..." },
  ]

  return (
    <div
      style={
        {
          width: "100%",
          height: "100%",
          position: "relative",
          background: "transparent",
          ...themeVars,
        } as React.CSSProperties
      }
      role="img"
      aria-label="Live agent trace showing 12 AI agents analyzing financial data"
    >
      {/* Main Panel */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          width: "340px",
          height: "240px",
          background: "var(--ai-background-color)",
          backdropFilter: "blur(16px)",
          borderRadius: "9.488px",
          border: "1px solid var(--ai-border-main)",
          overflow: "hidden",
        }}
      >
        <div
          className="bg-card border border-border"
          style={{
            padding: "12px",
            height: "100%",
            boxSizing: "border-box",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "8px", 
            marginBottom: "12px",
            paddingBottom: "8px",
            borderBottom: "1px solid var(--ai-border-color)"
          }}>
            <div style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#22C55E",
              animation: "pulse 2s infinite"
            }} />
            <span style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: "11px",
              fontWeight: 500,
              color: "var(--ai-text-color)",
            }}>
              Analyst Team Convening...
            </span>
          </div>

          {/* Agent Events */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {agentEvents.map((event, index) => (
              <div 
                key={index}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "8px",
                  padding: "6px 8px",
                  background: event.status === "active" ? "var(--ai-highlight-primary)" : "transparent",
                  borderRadius: "6px",
                  borderLeft: event.status === "complete" ? "2px solid #22C55E" : 
                             event.status === "active" ? "2px solid var(--ai-primary-color)" : 
                             "2px solid hsl(var(--muted-foreground) / 0.3)",
                }}
              >
                <div style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  marginTop: "5px",
                  background: event.status === "complete" ? "#22C55E" : 
                             event.status === "active" ? "var(--ai-primary-color)" : 
                             "hsl(var(--muted-foreground) / 0.3)",
                }} />
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: "9px",
                    fontWeight: 500,
                    color: "var(--ai-text-color)",
                    opacity: event.status === "pending" ? 0.5 : 1,
                  }}>
                    {event.agent}
                  </div>
                  <div style={{
                    fontFamily: "'Geist Mono', monospace",
                    fontSize: "8px",
                    color: "hsl(var(--muted-foreground))",
                    opacity: event.status === "pending" ? 0.4 : 0.8,
                  }}>
                    {event.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}

export default AgentTrace
