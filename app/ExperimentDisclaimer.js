export default function ExperimentDisclaimer({ style }) {
  return (
    <div
      style={{
        marginTop: "28px",
        padding: "14px 16px",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        background: "var(--bg-subtle)",
        fontSize: "13px",
        color: "var(--text-muted)",
        lineHeight: 1.55,
        ...style,
      }}
    >
      <strong style={{ color: "var(--text)" }}>Disclaimer:</strong> Not financial advice.
      Information may not be accurate or complete. This is an experiment — scores and signals
      are best-effort, not guaranteed. Always DYOR.
    </div>
  );
}
