import Link from "next/link";
import ExperimentDisclaimer from "./ExperimentDisclaimer";

const DASH_TABS = [
  "Overview",
  "Activity",
  "Wallets",
  "Buyers & Risk",
  "Discover",
  "Watchlist",
  "CLAWD",
  "The Wire",
  "About",
];

function TabBar() {
  const tabStyle = (active) => ({
    padding: "8px 16px",
    borderRadius: "6px",
    border: active ? "1px solid var(--btn-active-bg)" : "1px solid var(--btn-inactive-border)",
    background: active ? "var(--btn-active-bg)" : "var(--btn-inactive-bg)",
    color: active ? "var(--btn-active-text)" : "var(--btn-inactive-text)",
    fontWeight: active ? 600 : 400,
    textDecoration: "none",
    fontSize: "14px",
  });

  return (
    <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
      <Link href="/" style={tabStyle(false)}>Movers</Link>
      <span style={tabStyle(true)}>Forecast</span>
      {DASH_TABS.map((tab) => (
        <Link key={tab} href="/dashboard" style={tabStyle(false)}>
          {tab}
        </Link>
      ))}
    </div>
  );
}

function fmtPct(n) {
  if (n == null) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function fmtWhen(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function pctColor(n) {
  if (n == null) return "var(--text-faint)";
  if (n > 0) return "var(--gate-ok-text)";
  if (n < 0) return "var(--gate-fail-text)";
  return "var(--text-muted)";
}

function StrategyCard({ p, rank }) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: p.isBaseline ? "1px dashed var(--border-strong)" : "1px solid var(--border)",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "11px", color: "var(--text-faint)", fontWeight: 600 }}>
            #{rank}{p.isBaseline ? " · baseline" : ""}
          </div>
          <div style={{ fontSize: "17px", fontWeight: 800, color: "var(--text)", marginTop: "2px" }}>
            {p.name}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "4px", lineHeight: 1.4 }}>
            {p.blurb}
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "11px", color: "var(--text-faint)" }}>Paper value</div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)" }}>
            ${p.value?.toFixed?.(2) ?? "—"}
          </div>
          <div style={{ fontSize: "13px", fontWeight: 700, color: pctColor(p.returnPct) }}>
            {fmtPct(p.returnPct)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "12px", color: "var(--text-faint)" }}>
        <div>
          <span style={{ fontWeight: 600, color: "var(--text-muted)" }}>{p.tradeCount || 0}</span> buys/sells
        </div>
        {p.lastTrades && (p.lastTrades.bought.length > 0 || p.lastTrades.sold.length > 0) && (
          <div>
            last rebalance:{" "}
            <span style={{ color: "var(--gate-ok-text)" }}>+{p.lastTrades.bought.length}</span>
            {" / "}
            <span style={{ color: "var(--gate-fail-text)" }}>−{p.lastTrades.sold.length}</span>
          </div>
        )}
      </div>

      <div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
          Holdings ({p.holdings?.length || 0}) · equal weight · live
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {(p.holdings || []).map((h) => (
            <div
              key={h.project}
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "8px",
                fontSize: "12px",
                padding: "4px 0",
                borderTop: "1px solid var(--border)",
              }}
            >
              <span style={{ color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {h.project}
                <span style={{ color: "var(--text-faint)", marginLeft: "5px" }}>{h.symbol}</span>
              </span>
              <span style={{ flexShrink: 0, color: pctColor(h.changePct) }}>
                {fmtPct(h.changePct)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ForecastPanel({ state }) {
  const {
    leaderboard = [],
    history = [],
    startedAt,
    lastRebalanceAt,
    justRebalanced,
    kvOk,
    kvError,
    holdingsCount = 10,
    startingValue = 100,
    rebalanceHours = 24,
    strategies = [],
  } = state || {};

  return (
    <div>
      <TabBar />

      <div style={{ marginBottom: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px" }}>
            Forecast
          </div>
          <span style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "3px 8px",
            borderRadius: "999px",
            background: "var(--read-amber-bg)",
            color: "var(--read-amber-text)",
          }}>
            v1 beta
          </span>
        </div>
        <div style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px", maxWidth: "720px", lineHeight: 1.5 }}>
          Four ongoing paper portfolios. Three run different formulas; the fourth holds the top{" "}
          {holdingsCount} market caps. Each starts at ${startingValue}, stays fully invested, and
          rebalances about every {rebalanceHours}h — selling dropouts, buying new picks, reinvesting
          the full value. No lockups. Formulas are placeholders — swap anytime.
        </div>
        <div style={{
          marginTop: "12px",
          padding: "12px 14px",
          borderRadius: "8px",
          border: "1px solid var(--border)",
          background: "var(--bg-subtle)",
          fontSize: "13px",
          color: "var(--text-muted)",
          lineHeight: 1.55,
          maxWidth: "720px",
        }}>
          <strong style={{ color: "var(--text)" }}>How it works:</strong>{" "}
          Portfolios mark to market continuously. On rebalance, total paper value is recalculated,
          then redistributed equally into that formula&apos;s current top {holdingsCount}. Tokens that
          fall off are sold; new ones are bought. Holding % is vs average cost since last buy into
          that name. <strong style={{ color: "var(--text)" }}>0% early on</strong> is normal right
          after a fresh start or rebalance.
        </div>
        <ExperimentDisclaimer style={{ marginTop: "14px", maxWidth: "720px" }} />
      </div>

      {!kvOk && (
        <div style={{
          marginTop: "12px",
          padding: "10px 14px",
          borderRadius: "8px",
          background: "var(--gate-fail-bg)",
          color: "var(--gate-fail-text)",
          fontSize: "12px",
          lineHeight: 1.5,
        }}>
          Storage unavailable — portfolios won&apos;t persist between visits (not a cron issue;
          Forecast rebalances on page load via Vercel KV).
          {kvError ? <> Details: {kvError}</> : null}
        </div>
      )}

      <div style={{ marginTop: "14px", fontSize: "12px", color: "var(--text-faint)", display: "flex", gap: "16px", flexWrap: "wrap" }}>
        <span>Started <strong style={{ color: "var(--text-muted)" }}>{startedAt || "—"}</strong></span>
        <span>
          Last rebalance <strong style={{ color: "var(--text-muted)" }}>{fmtWhen(lastRebalanceAt)}</strong>
          {justRebalanced ? " · just ran" : ""}
        </span>
        <span>Next check ~every {rebalanceHours}h</span>
      </div>

      <div
        className="forecast-grid"
        style={{
          marginTop: "18px",
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: "12px",
        }}
      >
        {leaderboard.map((p, i) => (
          <StrategyCard key={p.id} p={p} rank={i + 1} />
        ))}
      </div>

      {history.length > 1 && (
        <div style={{ marginTop: "36px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: "12px" }}>
            Value history
          </div>
          <div style={{
            background: "var(--card-bg)",
            border: "1px solid var(--border)",
            borderRadius: "12px",
            padding: "12px 16px",
            overflowX: "auto",
          }}>
            <table style={{ borderCollapse: "collapse", width: "100%", fontSize: "12px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-faint)", fontWeight: 600 }}>Date</th>
                  {strategies.map((s) => (
                    <th key={s.id} style={{ textAlign: "right", padding: "6px 8px", color: "var(--text-faint)", fontWeight: 600 }}>
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().slice(0, 14).map((row) => (
                  <tr key={row.date}>
                    <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>{row.date}</td>
                    {strategies.map((s) => {
                      const v = row.values?.[s.id];
                      const ret = v != null ? Math.round(((v / startingValue - 1) * 1000)) / 10 : null;
                      return (
                        <td key={s.id} style={{ padding: "6px 8px", textAlign: "right", color: pctColor(ret), fontWeight: 600 }}>
                          {v != null ? `$${Number(v).toFixed(2)}` : "—"}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: "36px", paddingBottom: "24px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: "8px" }}>
          The formulas (swappable)
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-faint)", marginBottom: "12px", maxWidth: "720px", lineHeight: 1.5 }}>
          Defined in <code style={{ color: "var(--text-muted)" }}>lib/predictions.js</code> as{" "}
          <code style={{ color: "var(--text-muted)" }}>STRATEGIES</code>. Replace any{" "}
          <code style={{ color: "var(--text-muted)" }}>scoreFn</code> later — keep the same{" "}
          <code style={{ color: "var(--text-muted)" }}>id</code> to preserve portfolio history.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "10px" }}>
          {strategies.map((s) => (
            <div
              key={s.id}
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                padding: "12px 14px",
                fontSize: "12px",
                color: "var(--text-muted)",
                lineHeight: 1.45,
              }}
            >
              <div style={{ fontWeight: 700, color: "var(--text)", marginBottom: "4px" }}>
                {s.name}
                {s.isBaseline ? " (baseline)" : ""}
              </div>
              <div>{s.blurb}</div>
              <div style={{ marginTop: "6px", fontFamily: "monospace", fontSize: "11px", color: "var(--text-faint)" }}>
                id: {s.id}
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 1200px) {
          .forecast-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 640px) {
          .forecast-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
