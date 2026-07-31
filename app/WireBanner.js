"use client";

/**
 * Replaces the scores StatusBanner on The Wire tab —
 * makes it obvious this surface is live on-demand, not the cached dashboard.
 */
export default function WireBanner() {
  return (
    <div
      style={{
        background: "var(--bg-subtle)",
        border: "1px solid var(--border-strong)",
        borderLeft: "3px solid var(--read-teal-text)",
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
            color: "var(--read-teal-text)",
            marginBottom: "4px",
          }}
        >
          The Wire
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
          Live on-demand pulse
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
          Fresh Dune run each trip — wallets and txs for 15m / 1h / 6h / 24h. Not the scored dashboard cache.
        </div>
      </div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "var(--read-teal-text)",
          background: "var(--read-teal-bg)",
          border: "1px solid var(--read-teal-text)",
          borderRadius: "6px",
          padding: "6px 10px",
          whiteSpace: "nowrap",
          alignSelf: "center",
        }}
      >
        On demand
      </div>
    </div>
  );
}
