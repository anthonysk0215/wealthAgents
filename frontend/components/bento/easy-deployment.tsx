import type React from "react"

interface NextThousandProps {
  width?: number | string
  height?: number | string
  className?: string
}

const NextThousand: React.FC<NextThousandProps> = ({ width = "100%", height = "100%", className = "" }) => {
  const themeVars = {
    "--deploy-primary-color": "hsl(var(--primary))",
    "--deploy-background-color": "hsl(var(--background))",
    "--deploy-text-color": "hsl(var(--foreground))",
    "--deploy-text-secondary": "hsl(var(--muted-foreground))",
    "--deploy-border-color": "hsl(var(--border))",
  } as React.CSSProperties

  const allocations = [
    { label: "Emergency Fund", amount: 400, percent: 40, color: "#22C55E" },
    { label: "Roth IRA", amount: 300, percent: 30, color: "#3B82F6" },
    { label: "VTI (Taxable)", amount: 200, percent: 20, color: "#8B5CF6" },
    { label: "Discretionary", amount: 100, percent: 10, color: "#F59E0B" },
  ]

  return (
    <div
      className={`w-full h-full flex items-center justify-center p-4 relative ${className}`}
      style={{
        width,
        height,
        position: "relative",
        background: "transparent",
        ...themeVars,
      }}
      role="img"
      aria-label="Next $1000 allocation breakdown"
    >
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "320px",
          height: "220px",
          background: "linear-gradient(180deg, var(--deploy-background-color) 0%, transparent 100%)",
          backdropFilter: "blur(7.907px)",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: "2px",
            borderRadius: "8px",
            background: "hsl(var(--foreground) / 0.06)",
          }}
        />

        <div
          style={{
            position: "relative",
            padding: "16px",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          {/* Header */}
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "space-between",
            marginBottom: "16px",
            paddingBottom: "12px",
            borderBottom: "1px solid var(--deploy-border-color)"
          }}>
            <div>
              <div style={{
                fontFamily: "'Geist', sans-serif",
                fontSize: "14px",
                fontWeight: 600,
                color: "var(--deploy-text-color)",
              }}>
                Your Next $1,000
              </div>
              <div style={{
                fontFamily: "'Geist', sans-serif",
                fontSize: "10px",
                color: "var(--deploy-text-secondary)",
              }}>
                Optimized allocation
              </div>
            </div>
            <div style={{
              padding: "4px 8px",
              background: "var(--deploy-primary-color)",
              borderRadius: "4px",
              fontFamily: "'Geist', sans-serif",
              fontSize: "10px",
              fontWeight: 500,
              color: "hsl(var(--primary-foreground))",
            }}>
              Auto-split
            </div>
          </div>

          {/* Allocations */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {allocations.map((item, index) => (
              <div key={index} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "var(--deploy-text-color)",
                  width: "40px",
                  textAlign: "right",
                }}>
                  ${item.amount}
                </div>
                <div style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "10px",
                  color: "var(--deploy-text-secondary)",
                  width: "80px",
                }}>
                  {item.label}
                </div>
                <div style={{
                  flex: 1,
                  height: "12px",
                  background: "hsl(var(--muted) / 0.3)",
                  borderRadius: "6px",
                  overflow: "hidden",
                }}>
                  <div style={{
                    width: `${item.percent}%`,
                    height: "100%",
                    background: item.color,
                    borderRadius: "6px",
                  }} />
                </div>
                <div style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: "9px",
                  color: "var(--deploy-text-secondary)",
                  width: "28px",
                  textAlign: "right",
                }}>
                  {item.percent}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            inset: 0,
            border: "0.791px solid var(--deploy-border-color)",
            borderRadius: "10px",
            pointerEvents: "none",
          }}
        />
      </div>

      {/* Apply Button */}
      <button
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "6px",
          padding: "6px 14px",
          background: "var(--deploy-primary-color)",
          color: "hsl(var(--primary-foreground))",
          border: "none",
          cursor: "pointer",
          borderRadius: "8px",
          fontFamily: "'Geist', sans-serif",
          fontSize: "12px",
          fontWeight: 500,
          whiteSpace: "nowrap",
          boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.15)",
        }}
      >
        Apply this split
      </button>
    </div>
  )
}

export default NextThousand
