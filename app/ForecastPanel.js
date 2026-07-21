import Link from "next/link";
import ExperimentDisclaimer from "./ExperimentDisclaimer";

const DASH_TABS = [
  "Overview",
  "Activity",
  "Wallets",
  "Buyers",
  "Whales & Risk",
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

function Stat({ label, value, color }) {
  return (
    <div>
      <div style={{ fontSize: "10px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </div>
      <div style={{ fontSize: "13px", fontWeight: 700, color: color || "var(--text-muted)", marginTop: "1px" }}>
        {value}
      </div>
    </div>
  );
}

const TRADE_COLORS = {
  buy: "var(--gate-ok-text)",
  sell: "var(--gate-fail-text)",
  resize: "var(--text-muted)",
  fee: "var(--text-faint)",
};

function StrategyCard({ p, rank }) {
  const latestEra = p.eras?.length ? p.eras[p.eras.length - 1] : null;
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
            #{rank}{p.isBaseline ? " · baseline" : ""} · formula v{p.version}
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

      <div style={{ display: "flex", gap: "18px", flexWrap: "wrap" }}>
        {!p.isBaseline && (
          <Stat label="Vs baseline" value={fmtPct(p.spreadVsBaselinePct)} color={pctColor(p.spreadVsBaselinePct)} />
        )}
        <Stat label="Max drawdown" value={p.maxDrawdownPct != null ? `−${p.maxDrawdownPct}%` : "—"} />
        <Stat label="Turnover 30d" value={p.turnover30Pct != null ? `${p.turnover30Pct}%` : "—"} />
        <Stat label="Fees paid" value={`$${(p.totalFees ?? 0).toFixed(2)}`} />
        <Stat label="Trades" value={p.tradeCount ?? 0} />
      </div>

      <div>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
          Holdings ({p.holdings?.length || 0}) · {p.isBaseline ? "equal weight" : "score-weighted, 5–20% caps"} · live
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          {(p.holdings || []).map((h) => (
            <div
              key={h.project}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12.5px", gap: "8px" }}
            >
              <span style={{ color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {h.project}
                <span style={{ color: "var(--text-faint)", marginLeft: "6px", fontSize: "11px" }}>
                  {h.weightPct != null ? `${h.weightPct}%` : ""}
                </span>
              </span>
              <span style={{ display: "flex", gap: "10px", alignItems: "baseline", flexShrink: 0 }}>
                <span style={{ color: "var(--text-muted)" }}>${h.valueNow?.toFixed?.(2) ?? "—"}</span>
                <span style={{ color: pctColor(h.changePct), fontWeight: 600, minWidth: "52px", textAlign: "right" }}>
                  {fmtPct(h.changePct)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {p.tradeLog?.length > 0 && (
        <div>
          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "6px" }}>
            Recent trades
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {p.tradeLog.map((t, i) => (
              <div key={i} style={{ fontSize: "11.5px", color: "var(--text-faint)", display: "flex", gap: "6px" }}>
                <span style={{ color: TRADE_COLORS[t.action] || "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", fontSize: "10px", minWidth: "42px" }}>
                  {t.action}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {t.project ? `${t.project} — ` : ""}{t.reason}
                </span>
                <span style={{ marginLeft: "auto", flexShrink: 0 }}>{t.date}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {latestEra && p.eras.length > 1 && (
        <div style={{ fontSize: "10.5px", color: "var(--text-faint)" }}>
          Formula updated to v{latestEra.version} on {latestEra.from} — history before that ran on the previous version.
        </div>
      )}
    </div>
  );
}

export default function ForecastPanel({ state }) {
  const {
    leaderboard = [],
    history = [],
    startedAt,
    lastRebalanceAt,
    kvOk,
    kvError,
    holdingsCount = 10,
    startingValue = 100,
    feePct = 1,
    minVol30d = 25000,
    backstopHours = 72,
  } = state || {};

  return (
    <div>
      <TabBar />
      <div style={{ maxWidth: "1080px", margin: "0 auto" }}>
      <div style={{ padding: "8px 0" }}>
        <div style={{ fontSize: "26px", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px" }}>
          Forecast — the portfolio race
        </div>
        <div style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px", maxWidth: "680px", lineHeight: 1.5 }}>
          Four paper portfolios, no real money. Three formulas pick and size their own holdings from
          on-chain behavior; the fourth just equal-weights the {holdingsCount} biggest market caps.
          Every portfolio starts at ${startingValue}, stays fully invested, pays {feePct}% on every
          trade, and rebalances when the behavioral data refreshes. Winner is whoever's worth the
          most — including against the do-nothing baseline.
        </div>
      </div>

      <ExperimentDisclaimer />

      {!kvOk && (
        <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--gate-fail-text)" }}>
          Storage unavailable — showing a fresh simulation preview; nothing is being recorded this load.
          {kvError ? <> Details: {kvError}</> : null}
        </div>
      )}

      <div style={{ marginTop: "14px", display: "flex", gap: "18px", flexWrap: "wrap", fontSize: "12px", color: "var(--text-faint)" }}>
        <span>Race started <strong style={{ color: "var(--text-muted)" }}>{startedAt || "—"}</strong></span>
        <span>Last rebalance <strong style={{ color: "var(--text-muted)" }}>{fmtWhen(lastRebalanceAt)}</strong></span>
        <span>Trades when data refreshes (≤{backstopHours}h backstop)</span>
        <span>Prices mark to market hourly</span>
      </div>

      <div style={{ marginTop: "20px", display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: "14px" }}>
        {leaderboard.map((p, i) => (
          <StrategyCard key={p.id} p={p} rank={i + 1} />
        ))}
      </div>

      {history.length > 1 && (
        <div style={{ marginTop: "32px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: "10px" }}>
            Value history
          </div>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "8px 16px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12.5px" }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left", padding: "6px 8px", color: "var(--text-faint)", fontWeight: 600 }}>Date</th>
                  {leaderboard.map((p) => (
                    <th key={p.id} style={{ textAlign: "right", padding: "6px 8px", color: "var(--text-faint)", fontWeight: 600 }}>
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...history].reverse().slice(0, 21).map((row) => (
                  <tr key={row.date} style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "6px 8px", color: "var(--text-muted)" }}>{row.date}</td>
                    {leaderboard.map((p) => (
                      <td key={p.id} style={{ padding: "6px 8px", textAlign: "right", color: "var(--text)" }}>
                        {row.values?.[p.id] != null ? `$${row.values[p.id].toFixed(2)}` : "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ marginTop: "32px", paddingBottom: "40px", fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.7 }}>
        <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: "8px" }}>
          The rules (nothing hidden)
        </div>
        <strong>Eligibility:</strong> a token needs a live price and at least ${(minVol30d / 1000).toFixed(0)}k
        of 30-day DEX volume — no paper-buying things that don&apos;t really trade.{" "}
        <strong>Sizing:</strong> formula portfolios weight by score (capped 20%, floored 5%); the
        baseline stays pure equal weight.{" "}
        <strong>Trading:</strong> a holding is only sold if it falls below rank {holdingsCount + 5} in
        its formula or fails a gate; kept positions only resize when more than 3 points off their
        target weight. Every traded dollar pays {feePct}% — churn costs money here like it does in
        real life, baseline included.{" "}
        <strong>Rebalances</strong> happen when the underlying Dune data refreshes (with a{" "}
        {backstopHours}h backstop), not on a clock — trading on stale data is just noise.{" "}
        <strong>Formulas are versioned:</strong> when one changes, the history keeps flowing and the
        card marks the era boundary, so a strategy can&apos;t quietly launder its past. This is a v1
        beta experiment with fake money — not financial advice, not a recommendation, and the
        formulas will sometimes be confidently wrong. That&apos;s what the race is for.
      </div>
      </div>
    </div>
  );
}
