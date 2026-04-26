import type React from "react"

interface SpecializedAgentsProps {
  className?: string
}

const SpecializedAgents: React.FC<SpecializedAgentsProps> = ({ className = "" }) => {
  const themeVars = {
    "--pca-background-color": "hsl(var(--background))",
    "--pca-background-glass": "hsl(var(--card) / 0.2)",
    "--pca-background-gradient-start": "hsl(var(--card) / 0.2)",
    "--pca-background-gradient-end": "transparent",
    "--pca-text-primary": "hsl(var(--foreground))",
    "--pca-text-secondary": "hsl(var(--muted-foreground))",
    "--pca-border-color": "hsl(var(--border))",
    "--pca-shadow-color": "rgba(0, 0, 0, 0.12)",
    "--pca-container-gradient-start": "hsl(var(--card) / 0.4)",
    "--pca-container-gradient-end": "transparent",
  }

  const agents = [
    { icon: "💰", title: "Cash Flow Analyst", desc: "Income, expenses, surplus analysis" },
    { icon: "🏦", title: "Retirement Analyst", desc: "401k, IRA, pension optimization" },
    { icon: "🏠", title: "Housing Analyst", desc: "Affordability, timeline, mortgage" },
    { icon: "📊", title: "Investment Analyst", desc: "Asset allocation, diversification" },
    { icon: "📈", title: "Bull Agent", desc: "Aggressive growth strategies" },
    { icon: "📉", title: "Bear Agent", desc: "Risk mitigation, safety nets" },
  ]

  return (
    <div
      className={className}
      style={
        {
          width: "100%",
          height: "100%",
          position: "relative",
          background: `linear-gradient(180deg, var(--pca-container-gradient-start) 0%, var(--pca-container-gradient-end) 100%)`,
          backdropFilter: "blur(8.372px)",
          borderRadius: "10.047px",
          boxSizing: "border-box",
          flexShrink: 0,
          margin: "0 auto",
          ...themeVars,
        } as React.CSSProperties
      }
      role="img"
      aria-label="12 specialized AI agents for wealth management"
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "8px",
          padding: "16px",
          height: "100%",
          width: "calc(100% - 32px)",
          background: "linear-gradient(180deg, hsl(var(--primary) / 0.05) 0%, transparent 100%)",
          backdropFilter: "blur(16px)",
          borderRadius: "9.628px",
          border: "0.802px solid hsl(var(--border))",
          overflow: "hidden",
          boxSizing: "border-box",
          margin: "16px",
        }}
      >
        {agents.map((agent, index) => (
          <div
            key={index}
            style={{
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              gap: "6px",
              padding: "8px",
              background: `linear-gradient(180deg, var(--pca-background-gradient-start) 0%, var(--pca-background-gradient-end) 100%)`,
              backdropFilter: "blur(19.481px)",
              borderRadius: "8px",
              boxShadow: `0px 1px 2px 0px var(--pca-shadow-color)`,
              border: "0.5px solid var(--pca-border-color)",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <div style={{ fontSize: "16px", flexShrink: 0 }}>
              {agent.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 500,
                  fontSize: "9px",
                  lineHeight: "1.3",
                  color: "var(--pca-text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {agent.title}
              </div>
              <div
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: 400,
                  fontSize: "7px",
                  lineHeight: "1.3",
                  color: "var(--pca-text-secondary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {agent.desc}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SpecializedAgents
