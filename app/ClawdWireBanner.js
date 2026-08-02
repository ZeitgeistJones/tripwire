"use client";

/**
 * Tab-level identity strip for ClawdWire.
 *
 * The pulse clock, sync state and controls all live in the panel's command
 * rail now, so this is deliberately a single quiet line: it says which
 * instrument you are looking at and nothing that competes with the cockpit
 * directly below it.
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
      <span style={{ flex: "1 1 12px" }} />
      <span
        style={{
          fontSize: "13px",
          fontWeight: 700,
          color: "var(--text)",
          fontVariantNumeric: "tabular-nums",
          whiteSpace: "nowrap",
        }}
      >
        {syncing ? "syncing… · " : ""}
        last pulse {formatted}
      </span>
    </div>
  );
}
