"use client";

/**
 * Lab banner for ClawdWire — distinct from scores + The Wire.
 */
export default function ClawdWireBanner() {
  return (
    <div
      style={{
        background: "var(--bg-subtle)",
        border: "1px solid var(--border-strong)",
        borderLeft: "3px solid var(--read-amber-text)",
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
            color: "var(--read-amber-text)",
            marginBottom: "4px",
          }}
        >
          ClawdWire
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
          CLAWD-only lab pulse
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
          One token — wallets/txs plus 1h/6h buy &amp; sell USD. Cheap place to test Wire features before rolling them out to all projects.
        </div>
      </div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--read-amber-text)",
          background: "var(--read-amber-bg)",
          border: "1px solid var(--read-amber-text)",
          borderRadius: "6px",
          padding: "6px 10px",
          whiteSpace: "nowrap",
          alignSelf: "center",
        }}
      >
        Lab
      </div>
    </div>
  );
}
