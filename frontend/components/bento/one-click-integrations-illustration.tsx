import type React from "react"

interface AccountAnalysisProps {
  className?: string
}

const AccountAnalysis: React.FC<AccountAnalysisProps> = ({ className = "" }) => {
  const themeVars = {
    "--oci-primary-color": "hsl(var(--primary))",
    "--oci-background-color": "hsl(var(--background))",
    "--oci-foreground-color": "hsl(var(--foreground))",
    "--oci-muted-foreground-color": "hsl(var(--muted-foreground))",
    "--oci-border-color": "hsl(var(--border))",
    "--oci-shadow-color": "rgba(0, 0, 0, 0.12)",
  } as React.CSSProperties

  const accounts = [
    { name: "Checking",  balance: "$12,450",  change: "+$2,100" },
    { name: "Savings",   balance: "$45,200",  change: "+$3,500" },
    { name: "Brokerage", balance: "$78,340",  change: "+$8,200" },
    { name: "401(k)",    balance: "$156,800", change: "+$12,400" },
    { name: "Roth IRA", balance: "$34,500",  change: "+$4,100" },
  ]

  return (
    <div
      className={`w-full h-full relative ${className}`}
      style={{ ...themeVars }}
      role="img"
      aria-label="One-click financial account analysis"
    >
      {/* Background radial gradient */}
      <div
        style={{
          width: "100%",
          height: "100%",
          position: "absolute",
          background: `radial-gradient(ellipse 80% 60% at 50% 20%, 
            hsl(var(--primary) / 0.15) 0%, 
            transparent 70%)`,
        }}
      />

      {/* Main content container */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "320px",
          height: "240px",
          background: "linear-gradient(180deg, var(--oci-background-color) 0%, transparent 100%)",
          backdropFilter: "blur(8px)",
          borderRadius: "10px",
          border: "1px solid var(--oci-border-color)",
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
          borderBottom: "1px solid var(--oci-border-color)",
        }}>
          <div style={{
            fontFamily: "'Geist', sans-serif",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--oci-foreground-color)",
          }}>
            Connected Accounts
          </div>
          <div style={{
            padding: "2px 6px",
            background: "#22C55E20",
            borderRadius: "4px",
            fontFamily: "'Geist', sans-serif",
            fontSize: "9px",
            fontWeight: 500,
            color: "#22C55E",
          }}>
            All Synced
          </div>
        </div>

        {/* Account List */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {accounts.map((account, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "6px 8px",
                background: "hsl(var(--foreground) / 0.04)",
                borderRadius: "6px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "10px",
                  fontWeight: 500,
                  color: "var(--oci-foreground-color)",
                }}>
                  {account.name}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: "10px",
                  fontWeight: 500,
                  color: "var(--oci-foreground-color)",
                }}>
                  {account.balance}
                </span>
                <span style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: "8px",
                  fontWeight: 500,
                  color: "#22C55E",
                }}>
                  {account.change}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AccountAnalysis
