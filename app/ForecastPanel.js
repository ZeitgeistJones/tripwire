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

function fmtPrice(n) {
  if (n == null) return "—";
  return `$${n.toPrecision(4)}`;
}

const CALL_STYLE = {
  Up: { bg: "var(--read-teal-bg)", text: "var(--read-teal-text)" },
  Flat: { bg: "var(--badge-neutral-bg)", text: "var(--badge-neutral-text)" },
  Down: { bg: "var(--read-coral-bg)", text: "var(--read-coral-text)" },
};

function CallChip({ call }) {
  const s = CALL_STYLE[call] || CALL_STYLE.Flat;
  return (
    <span
      style={{
        fontSize: "11px",
        fontWeight: 700,
        padding: "3px 10px",
        borderRadius: "999px",
        background: s.bg,
        color: s.text,
        textTransform: "uppercase",
        letterSpacing: "0.5px",
      }}
    >
      {call}
    </span>
  );
}

function Bar({ label, value }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
      <div style={{ fontSize: "10px", color: "var(--text-faint)", width: "62px", flexShrink: 0 }}>{label}</div>
      <div style={{ flex: 1, height: "5px", background: "var(--bg-muted)", borderRadius: "3px", overflow: "hidden" }}>
        <div
          style={{
            width: `${Math.max(0, Math.min(100, value))}%`,
            height: "100%",
            background: "var(--btn-active-bg)",
            borderRadius: "3px",
          }}
        />
      </div>
      <div style={{ fontSize: "10px", color: "var(--text-muted)", width: "26px", textAlign: "right" }}>{value}</div>
    </div>
  );
}

function LiveCard({ f }) {
  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>{f.project}</span>
          <span style={{ fontSize: "11px", color: "var(--text-faint)", marginLeft: "6px" }}>{f.symbol}</span>
        </div>
        <CallChip call={f.call} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--text-muted)" }}>
        <span>
          Forecast <strong style={{ color: "var(--text)" }}>{f.score}</strong>
          {f.opp != null && (
            <span style={{ marginLeft: "8px", color: "var(--text-faint)" }}>Opp {f.opp}</span>
          )}
        </span>
        <span>{fmtPrice(f.priceAtCall)}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Bar label="Signal" value={f.components.signal} />
        <Bar label="Whales" value={f.components.accum} />
        <Bar label="Growth" value={f.components.growth} />
        <Bar label="Retention" value={f.components.retention} />
        <Bar label="Quality" value={f.components.quality} />
      </div>
      <div style={{ fontSize: "10px", color: "var(--text-faint)", fontFamily: "monospace", lineHeight: 1.5 }}>
        0.30×{f.components.signal} + 0.25×{f.components.accum} + 0.20×{f.components.growth} + 0.15×{f.components.retention} + 0.10×{f.components.quality} = {f.rawScore}
        <br />
        {f.rawScore} × (1 − {f.riskPct}/200 risk) = <strong style={{ color: "var(--text-muted)" }}>{f.score}</strong>
      </div>
    </div>
  );
}

export default function ForecastPanel({ state }) {
  const { live, openSnapshot, resolvedSnapshots, accuracy, kvOk, windowDays, thresholds } = state;

  const topLive = live.slice(0, 9);

  return (
    <div>
      <TabBar />

      {/* header */}
      <div style={{ marginBottom: "8px" }}>
        <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--text)", letterSpacing: "-0.5px" }}>
          Forecast
        </div>
        <div style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px", maxWidth: "640px", lineHeight: 1.5 }}>
          A transparent formula makes a {windowDays}-day call on every priced token — Up, Flat, or Down —
          then grades itself when the window closes. Every call and every miss stays on the record.
        </div>
        <ExperimentDisclaimer style={{ marginTop: "14px", maxWidth: "680px" }} />
      </div>

      {/* accuracy record */}
      <div
        style={{
          marginTop: "20px",
          background: "var(--card-bg)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "16px 20px",
          display: "flex",
          gap: "32px",
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontSize: "11px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "1px" }}>Track record</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "var(--text)", marginTop: "2px" }}>
            {accuracy.pct != null ? `${accuracy.pct}%` : "—"}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-faint)" }}>
            {accuracy.totalScored > 0
              ? `${accuracy.totalHits} / ${accuracy.totalScored} calls correct`
              : "No calls have matured yet — first grades land in " + windowDays + " days"}
          </div>
        </div>
        {["Up", "Flat", "Down"].map((c) => (
          <div key={c}>
            <div style={{ fontSize: "11px", color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: "1px" }}>{c} calls</div>
            <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", marginTop: "2px" }}>
              {accuracy.byCall[c].total > 0
                ? `${Math.round((accuracy.byCall[c].hits / accuracy.byCall[c].total) * 100)}%`
                : "—"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-faint)" }}>
              {accuracy.byCall[c].hits}/{accuracy.byCall[c].total}
            </div>
          </div>
        ))}
      </div>

      {!kvOk && (
        <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--gate-fail-text)" }}>
          Storage unavailable — showing live forecasts only; snapshot tracking paused this load.
        </div>
      )}

      {/* live calls */}
      <div style={{ marginTop: "28px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: "4px" }}>
          Strongest forecasts right now
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-faint)", marginBottom: "12px" }}>
          Score ≥ {thresholds.up} calls Up · ≤ {thresholds.down} calls Down · in between calls Flat.
          A call is correct if price moves {thresholds.resolveUpPct}%+ (Up), {thresholds.resolveDownPct}% or worse (Down), or stays between (Flat) over {windowDays} days.
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "14px" }}>
          {topLive.map((f) => (
            <LiveCard key={f.project} f={f} />
          ))}
        </div>
      </div>

      {/* open snapshot */}
      {openSnapshot && (
        <div style={{ marginTop: "36px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: "12px" }}>
            On the record — resolves {windowDays} days after {openSnapshot.date}
          </div>
          <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "8px 16px" }}>
            {openSnapshot.calls
              .filter((c) => c.call !== "Flat")
              .slice(0, 20)
              .map((c) => (
                <div
                  key={c.project}
                  style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border)", fontSize: "13px" }}
                >
                  <span style={{ color: "var(--text)" }}>{c.project}</span>
                  <span style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <span style={{ color: "var(--text-faint)", fontSize: "12px" }}>{fmtPrice(c.priceAtCall)} at call</span>
                    <CallChip call={c.call} />
                  </span>
                </div>
              ))}
            <div style={{ padding: "8px 0", fontSize: "11px", color: "var(--text-faint)" }}>
              Flat calls tracked too, just not listed here. {openSnapshot.calls.length} total calls in this window.
            </div>
          </div>
        </div>
      )}

      {/* resolved history */}
      {resolvedSnapshots.length > 0 && (
        <div style={{ marginTop: "36px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: "12px" }}>
            Graded windows
          </div>
          {resolvedSnapshots.map((s) => (
            <div key={s.date} style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "14px 18px", marginBottom: "12px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--text)" }}>{s.date}</span>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  {s.hits}/{s.scored} correct
                </span>
              </div>
              {s.calls
                .filter((c) => c.outcome !== "unscored" && (c.call !== "Flat" || !c.hit))
                .slice(0, 15)
                .map((c) => (
                  <div key={c.project} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "4px 0", color: "var(--text-muted)" }}>
                    <span>
                      {c.project} — called <strong>{c.call}</strong>, went <strong>{c.actual}</strong> ({c.changePct > 0 ? "+" : ""}{c.changePct}%)
                    </span>
                    <span style={{ color: c.hit ? "var(--gate-ok-text)" : "var(--gate-fail-text)", fontWeight: 700 }}>
                      {c.hit ? "✓" : "✗"}
                    </span>
                  </div>
                ))}
            </div>
          ))}
        </div>
      )}

      {/* formula disclosure */}
      <div style={{ marginTop: "36px", paddingBottom: "40px", fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.7 }}>
        <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)", marginBottom: "8px" }}>
          The formula (nothing hidden)
        </div>
        <div style={{ fontFamily: "monospace", background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "8px", padding: "12px 14px", marginBottom: "10px", fontSize: "11.5px", color: "var(--text-muted)", lineHeight: 1.8, overflowX: "auto" }}>
          signal    = (clip(signalScore, −50, +50) + 50)          → 0–100<br />
          whales    = Accum % (whale buys ÷ all whale volume, 7d) → 0–100, 50 if unknown<br />
          growth    = (avg(clip(VolGrw, UserGrw, TxGrw, −100..200)) + 100) ÷ 3 → 0–100<br />
          retention = min(Retention %, 100)<br />
          quality   = Qlty %<br />
          <br />
          raw   = 0.30·signal + 0.25·whales + 0.20·growth + 0.15·retention + 0.10·quality<br />
          score = raw × (1 − Risk % ÷ 200)<br />
          <br />
          call: score ≥ 60 → Up &nbsp;·&nbsp; score ≤ 35 → Down &nbsp;·&nbsp; else Flat<br />
          graded after 7 days: price +10%+ = Up · −10%− = Down · between = Flat
        </div>
        Each card above shows this exact arithmetic with that token&apos;s real numbers — you can
        recompute any score by hand. <strong>Relationship to Opp:</strong> the Opp score shown for
        comparison is the dashboard&apos;s existing opportunity ranking, built from overlapping
        ingredients (momentum, sustainability, quality, risk) but without price signal or whale flow.
        Forecast is intentionally computed independently so the track record can eventually answer
        whether it predicts any better than Opp does. It only uses on-chain behavior — no social
        sentiment, no narratives. This page exists to be graded, including when it&apos;s wrong.
      </div>
    </div>
  );
}
