"use client"

import type React from "react"

const BullBearDebate: React.FC = () => {
  const themeVars = {
    "--realtime-primary-color": "hsl(var(--primary))",
    "--realtime-background-editor": "hsl(var(--background) / 0.8)",
    "--realtime-background-preview": "hsl(var(--background) / 0.8)",
    "--realtime-text-color": "hsl(var(--foreground))",
    "--realtime-text-editor": "hsl(var(--foreground))",
    "--realtime-text-preview": "hsl(var(--primary-foreground))",
    "--realtime-border-color": "hsl(var(--border))",
    "--realtime-border-main": "hsl(var(--border))",
  }

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
      aria-label="Bull vs Bear debate visualization"
    >
      {/* Left Panel - Bull */}
      <div
        style={{
          position: "absolute",
          top: "30px",
          left: "20px",
          width: "150px",
          height: "200px",
          background: "linear-gradient(180deg, var(--realtime-background-editor) 0%, transparent 100%)",
          backdropFilter: "blur(7.907px)",
          borderRadius: "9.488px",
          border: "1px solid var(--realtime-border-main)",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div style={{ padding: "12px", height: "100%", boxSizing: "border-box" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "6px", 
            marginBottom: "10px",
            paddingBottom: "8px",
            borderBottom: "1px solid var(--realtime-border-color)"
          }}>
            <span style={{ fontSize: "14px" }}>📈</span>
            <span style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              color: "#22C55E",
            }}>
              Bull Agent
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { round: 1, text: "Time horizon is your superpower. Buy sooner." },
              { round: 2, text: "SWE income recovery is 3 months at most." },
              { round: 3, text: "Equity exposure now compounds 40 years." },
            ].map((item, i) => (
              <div key={i} style={{
                padding: "6px",
                background: "hsl(142 76% 36% / 0.1)",
                borderRadius: "4px",
                borderLeft: "2px solid #22C55E",
              }}>
                <div style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: "7px",
                  color: "#22C55E",
                  marginBottom: "2px",
                }}>
                  Round {item.round}
                </div>
                <div style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "8px",
                  color: "var(--realtime-text-editor)",
                  lineHeight: "1.3",
                }}>
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Bear */}
      <div
        style={{
          position: "absolute",
          top: "30px",
          right: "20px",
          width: "150px",
          height: "200px",
          background: "linear-gradient(180deg, var(--realtime-background-preview) 0%, transparent 100%)",
          backdropFilter: "blur(7.907px)",
          borderRadius: "9.488px",
          border: "1px solid var(--realtime-border-main)",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div style={{ padding: "12px", height: "100%", boxSizing: "border-box" }}>
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            gap: "6px", 
            marginBottom: "10px",
            paddingBottom: "8px",
            borderBottom: "1px solid var(--realtime-border-color)"
          }}>
            <span style={{ fontSize: "14px" }}>📉</span>
            <span style={{
              fontFamily: "'Geist', sans-serif",
              fontSize: "11px",
              fontWeight: 600,
              color: "#EF4444",
            }}>
              Bear Agent
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {[
              { round: 1, text: "18k savings is one job loss from disaster." },
              { round: 2, text: "2008 says recovery isn't guaranteed." },
              { round: 3, text: "Cash buffer first, then equity." },
            ].map((item, i) => (
              <div key={i} style={{
                padding: "6px",
                background: "hsl(0 84% 60% / 0.1)",
                borderRadius: "4px",
                borderLeft: "2px solid #EF4444",
              }}>
                <div style={{
                  fontFamily: "'Geist Mono', monospace",
                  fontSize: "7px",
                  color: "#EF4444",
                  marginBottom: "2px",
                }}>
                  Round {item.round}
                </div>
                <div style={{
                  fontFamily: "'Geist', sans-serif",
                  fontSize: "8px",
                  color: "var(--realtime-text-editor)",
                  lineHeight: "1.3",
                }}>
                  {item.text}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* VS Badge */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "36px",
          height: "36px",
          borderRadius: "50%",
          background: "var(--realtime-primary-color)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          zIndex: 10,
        }}
      >
        <span style={{
          fontFamily: "'Geist', sans-serif",
          fontSize: "10px",
          fontWeight: 700,
          color: "var(--realtime-text-preview)",
        }}>
          VS
        </span>
      </div>
    </div>
  )
}

export default BullBearDebate
