"use client";

/**
 * ClawdWire identity + live pulse clock (updated from ClawdWirePanel).
 */
export default function ClawdWireBanner({ lastRunAt = null, syncing = false }) {
  const formatted = lastRunAt
    ? new Date(lastRunAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";

  return (
    <div
      style={{
        background:
          "linear-gradient(135deg, rgba(122,184,74,0.12) 0%, var(--bg-subtle) 48%, var(--bg-muted) 100%)",
        border: "1px solid var(--clawd-row-border)",
        borderLeft: "3px solid var(--clawd-row-border)",
        borderRadius: "8px",
        padding: "12px 16px",
        marginBottom: "16px",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "16px",
        flexWrap: "wrap",
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--clawd-row-border)",
            marginBottom: "4px",
          }}
        >
          ClawdWire
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--text-faint)",
            marginBottom: "2px",
          }}
        >
          Pulse last run{syncing ? " · syncing…" : ""}
        </div>
        <div
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.01em",
            lineHeight: 1.25,
          }}
        >
          {formatted}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "var(--text-muted)",
            marginTop: "4px",
            lineHeight: 1.45,
            maxWidth: "520px",
          }}
        >
          Auto-loads when you run the Dune query — or trip below for a fresh execute.
        </div>
      </div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--clawd-row-border)",
          background: "var(--clawd-row-bg)",
          border: "1px solid var(--clawd-row-border)",
          borderRadius: "6px",
          padding: "6px 10px",
          whiteSpace: "nowrap",
          alignSelf: "center",
        }}
      >
        CLAWD
      </div>
    </div>
  );
}
