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

function fmtPrice(n) {
  if (n == null) return "—";
  return `$${n.toPrecision(4)}`;
}

function pctColor(n) {
  if (n == null) return "var(--text-faint)";
  if (n > 0) return "var(--gate-ok-text)";
  if (n < 0) return "var(--gate-fail-text)";
  return "var(--text-muted)";
}

function StrategyCard({ p, rank, windowDays }) {
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
          <div style={{ fontSize: "11px", color: "var(--text-faint)" }}>This window</div>
          <div style={{ fontSize: "22px", fontWeight: 800, color: pctColor(p.openReturnPct) }}>
            {fmtPct(p.openReturnPct)}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", fontSize: "12px" }}>
        <div>
          <div style={{ color: "var(--text-faint)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Paper $</div>
          <div style={{ fontWeight: 700, color: "var(--text)" }}>
            ${p.cumulativeValue?.toFixed?.(2) ?? "100.00"}
          </div>
          <div style={{ color: pctColor(p.cumulativeReturnPct), fontSize: "11px" }}>
            {fmtPct(p.cumulativeReturnPct)} all-time
          </div>
        </div>
        <div>
          <div style={{ color: "var(--text-faint)", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Avg window</div>
          <div style={{ fontWeight: 700, color: pctColor(p.avgReturnPct) }}>{fmtPct(p.avgReturnPct)}</div>
          <div style={{ color: "var(--text-faint)", fontSize: "11px" }}>
            {p.windows || 0} graded
          </div>
        </div>
      </div>

      <div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
          Holdings ({p.currentHoldings?.length || 0}) · equal weight · {windowDays}d window
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {(p.currentHoldings || []).map((h) => (
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
                {h.changePct != null ? fmtPct(h.changePct) : fmtPrice(h.priceAtEntry)}
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
    openSnapshot,
    resolvedSnapshots = [],
    kvOk,
    windowDays = 7,
    holdingsCount = 10,
    startingValue = 100,
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
          Four paper portfolios race each other. Three run different formulas; the fourth just holds
          the top {holdingsCount} market caps as a baseline. Equal-weight, rebalanced every {windowDays} days.
          Starting value ${startingValue} each. Formulas are placeholders — swap anytime.
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
          <strong style={{ color: "var(--text)" }}>How paper investing works:</strong>{" "}
          When a window opens, each strategy “buys” its top {holdingsCount} picks at that moment’s prices
          (equal weight, no real money). As live prices move, holdings and “This window” update.
          After {windowDays} days the window locks, returns are graded, paper $ compounds, then a new
          set of holdings is picked. <strong style={{ color: "var(--text)" }}>0.0% right now</strong> just
          means the window just opened — entry price ≈ current price until the market moves.
        </div>
        <ExperimentDisclaimer style={{ marginTop: "14px", maxWidth: "720px" }} />
      </div>

      {!kvOk && (
        <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--gate-fail-text)" }}>
          Storage unavailable — showing live picks only; window tracking paused this load.
        </div>
      )}

      {openSnapshot && (
        <div style={{ marginTop: "16px", fontSize: "12px", color: "var(--text-faint)" }}>
          Open window started <strong style={{ color: "var(--text-muted)" }}>{openSnapshot.date}</strong>
          {" "}· marks to market live · locks in {windowDays} days
        </div>
      )}

      {/* 4 portfolio cards */}
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
          <StrategyCard key={p.id} p={p} rank={i + 1} windowDays={windowDays} />
        ))}
      </div>

      {/* Graded windows */}
      {resolvedSnapshots.length > 0 && (
        <div style={{ marginTop: "36px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: "12px" }}>
            Graded windows
          </div>
          {resolvedSnapshots.map((s) => {
            const sorted = [...(s.portfolios || [])].sort(
              (a, b) => (b.returnPct ?? -Infinity) - (a.returnPct ?? -Infinity)
            );
            return (
              <div
                key={s.date}
                style={{
                  background: "var(--card-bg)",
                  border: "1px solid var(--border)",
                  borderRadius: "12px",
                  padding: "14px 18px",
                  marginBottom: "12px",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)", marginBottom: "10px" }}>
                  {s.date}
                  {s.resolvedAt ? (
                    <span style={{ fontWeight: 400, color: "var(--text-faint)", marginLeft: "8px" }}>
                      resolved {s.resolvedAt}
                    </span>
                  ) : null}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px" }} className="forecast-grid">
                  {sorted.map((p) => (
                    <div key={p.id} style={{ fontSize: "13px" }}>
                      <div style={{ color: "var(--text-faint)", fontSize: "11px" }}>
                        {p.name}{p.isBaseline ? " · baseline" : ""}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: "18px", color: pctColor(p.returnPct) }}>
                        {fmtPct(p.returnPct)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Formula cards */}
      <div style={{ marginTop: "36px", paddingBottom: "24px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: "8px" }}>
          The formulas (swappable)
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-faint)", marginBottom: "12px", maxWidth: "720px", lineHeight: 1.5 }}>
          Defined in <code style={{ color: "var(--text-muted)" }}>lib/predictions.js</code> as{" "}
          <code style={{ color: "var(--text-muted)" }}>STRATEGIES</code>. Replace any{" "}
          <code style={{ color: "var(--text-muted)" }}>scoreFn</code> later (including Fable ones) —
          keep the same <code style={{ color: "var(--text-muted)" }}>id</code> if you want history to stay attached.
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
