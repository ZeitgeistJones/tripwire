"use client";

/**
 * Tab-level identity strip for ClawdWire — name and tagline only.
 * Pulse age, sync, and Trip live in the panel command rail.
 */
export default function ClawdWireBanner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "6px 14px",
        borderLeft: "3px solid var(--clawd-row-border)",
        borderBottom: "1px solid var(--border)",
        padding: "7px 0 8px 11px",
        marginBottom: "14px",
      }}
    >
      <span
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.11em",
          textTransform: "uppercase",
          color: "var(--clawd-row-border)",
        }}
      >
        ClawdWire
      </span>
      <span style={{ fontSize: "11.5px", color: "var(--text-faint)" }}>
        Live on-chain pulse for CLAWD on Base
      </span>
    </div>
  );
}
