import type React from "react"

interface RiskCalibrationProps {
  className?: string
}

const RiskCalibration: React.FC<RiskCalibrationProps> = ({ className = "" }) => {
  const riskPersonas = [
    { 
      name: "Aggressive", 
      icon: "🚀", 
      adjustment: "+3 investing, -3 cash",
      color: "#22C55E",
      active: false
    },
    { 
      name: "Neutral", 
      icon: "⚖️", 
      adjustment: "No change",
      color: "#F59E0B",
      active: true
    },
    { 
      name: "Conservative", 
      icon: "🛡️", 
      adjustment: "+5 cash, -3 speculative",
      color: "#3B82F6",
      active: false
    },
  ]

  const allocationBars = [
    { label: "Emergency", percent: 22, color: "#22C55E" },
    { label: "Retirement", percent: 25, color: "#3B82F6" },
    { label: "Taxable", percent: 33, color: "#8B5CF6" },
    { label: "Housing", percent: 15, color: "#F59E0B" },
    { label: "Speculative", percent: 5, color: "#EF4444" },
  ]

  return (
    <div
      className={`w-full h-full flex items-center justify-center p-4 relative ${className}`}
      role="img"
      aria-label="Risk calibration with three AI personas"
    >
      {/* Main Panel */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, calc(-50% + 16px))",
          width: "340px",
          height: "250px",
          background: "linear-gradient(180deg, hsl(var(--background)) 0%, transparent 100%)",
          backdropFilter: "blur(16px)",
          borderRadius: "10px",
          border: "1px solid hsl(var(--border))",
          overflow: "hidden",
          padding: "12px",
          boxSizing: "border-box",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px",
          paddingBottom: "8px",
          borderBottom: "1px solid hsl(var(--border))",
        }}>
          <div style={{
            fontFamily: "'Geist', sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            color: "hsl(var(--foreground))",
          }}>
            Risk Team Calibration
          </div>
          <div style={{
            padding: "2px 6px",
            background: "hsl(var(--primary) / 0.1)",
            borderRadius: "4px",
            fontFamily: "'Geist Mono', monospace",
            fontSize: "9px",
            fontWeight: 500,
            color: "hsl(var(--primary))",
          }}>
            Score: 4.2/10
          </div>
        </div>

        {/* Risk Personas */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "14px" }}>
          {riskPersonas.map((persona, index) => (
            <div
              key={index}
              style={{
                flex: 1,
                padding: "8px",
                background: persona.active ? `${persona.color}15` : "hsl(var(--foreground) / 0.04)",
                borderRadius: "6px",
                border: persona.active ? `1px solid ${persona.color}40` : "1px solid transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "4px" }}>
                <span style={{ fontSize: "12px" }}>{persona.icon}</span>
                <span style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "9px",
                  fontWeight: 600,
                  color: persona.active ? persona.color : "hsl(var(--foreground))",
                }}>
                  {persona.name}
                </span>
              </div>
              <div style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: "7px",
                color: "hsl(var(--muted-foreground))",
              }}>
                {persona.adjustment}
              </div>
            </div>
          ))}
        </div>

        {/* Final Allocation */}
        <div style={{
          fontFamily: "'Geist', sans-serif",
          fontSize: "10px",
          fontWeight: 500,
          color: "hsl(var(--foreground))",
          marginBottom: "8px",
        }}>
          Final Allocation
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {allocationBars.map((item, index) => (
            <div key={index} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{
                fontFamily: "'Geist', sans-serif",
                fontSize: "8px",
                color: "hsl(var(--muted-foreground))",
                width: "55px",
              }}>
                {item.label}
              </div>
              <div style={{
                flex: 1,
                height: "8px",
                background: "hsl(var(--muted) / 0.3)",
                borderRadius: "4px",
                overflow: "hidden",
              }}>
                <div style={{
                  width: `${item.percent}%`,
                  height: "100%",
                  background: item.color,
                  borderRadius: "4px",
                }} />
              </div>
              <div style={{
                fontFamily: "'Geist Mono', monospace",
                fontSize: "8px",
                color: "hsl(var(--muted-foreground))",
                width: "24px",
                textAlign: "right",
              }}>
                {item.percent}%
              </div>
            </div>
          ))}
        </div>

        {/* Warning */}
        <div style={{
          marginTop: "10px",
          padding: "6px 8px",
          background: "#F59E0B15",
          borderRadius: "4px",
          borderLeft: "2px solid #F59E0B",
        }}>
          <div style={{
            fontFamily: "'Geist', sans-serif",
            fontSize: "8px",
            color: "#F59E0B",
          }}>
            Warning: Emergency fund won&apos;t reach 6mo until month 11
          </div>
        </div>
      </div>
    </div>
  )
}

export default RiskCalibration
