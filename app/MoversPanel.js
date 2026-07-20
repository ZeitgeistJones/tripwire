import Link from "next/link";
import StatusBanner from "./StatusBanner";

// ── formatting ────────────────────────────────────────────────
function fmtPrice(n) {
  if (n == null) return "—";
  return `$${n.toPrecision(4)}`;
}
function fmtUsd(n) {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}
function fmtPct(n) {
  if (n == null) return "—";
  return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
}

// ── plain-english translations ────────────────────────────────
const PROF_NORMIE = {
  Breakout: "Momentum with staying power",
  "Quick Mover": "Fast spike — could fade",
  "Slow Burner": "Quietly building",
  Cold: "Sleepy right now",
};

const SIGNAL_NORMIE = {
  "Confirmed Growth": "Price rising with real volume behind it",
  Absorbed: "Heavy buying — price hasn't caught up yet",
  "Thin Rally": "Price up, but on thin volume",
  Cooling: "Activity fading",
};

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

// Build up to 3 plain-english reasons a token is moving
function getReasons(t) {
  const reasons = [];
  const vol = t["Vol Grw %"];
  const usr = t["User Grw %"];
  const txg = t["Tx Grw %"];
  const ret = t["Retention %"];
  const acc = t["Accum %"];
  const wNet = t["Whale Net 7d"];
  const wBuyers = t["Whale Buyers 7d"];
  const px = t.priceChange7d;

  if (vol != null && vol >= 100)
    reasons.push({ w: vol, text: `Trading volume ${vol >= 200 ? `${Math.round(vol / 100) + 1}x'd` : "more than doubled"} this week` });
  else if (vol != null && vol >= 30)
    reasons.push({ w: vol, text: `Volume up ${Math.round(vol)}% week over week` });

  if (acc != null && acc >= 65 && wNet != null && wNet > 0)
    reasons.push({ w: 90 + acc, text: `Whales are net buyers — ${fmtUsd(wNet)} flowed in${wBuyers ? ` from ${wBuyers} big wallets` : ""}` });

  if (px != null && px >= 10)
    reasons.push({ w: 60 + px, text: `Price up ${Math.round(px)}% in the last 24h` });

  if (usr != null && usr >= 50)
    reasons.push({ w: usr, text: `Active wallets up ${Math.round(usr)}% this week` });

  if (ret != null && ret >= 40)
    reasons.push({ w: ret, text: `${Math.round(ret)}% of last week's holders came back` });

  if (txg != null && txg >= 75)
    reasons.push({ w: txg * 0.8, text: `Transactions up ${Math.round(txg)}% this week` });

  reasons.sort((a, b) => b.w - a.w);
  return reasons.slice(0, 3).map((r) => r.text);
}

function getCoolingReasons(t) {
  const reasons = [];
  const vol = t["Vol Grw %"];
  const usr = t["User Grw %"];
  const acc = t["Accum %"];
  const wNet = t["Whale Net 7d"];
  const px = t.priceChange7d;

  if (acc != null && acc <= 35 && wNet != null && wNet < 0)
    reasons.push({ w: 100, text: `Whales are selling — ${fmtUsd(Math.abs(wNet))} flowed out` });
  if (px != null && px <= -10)
    reasons.push({ w: 60 + Math.abs(px), text: `Price down ${Math.round(Math.abs(px))}% in the last 24h` });
  if (vol != null && vol <= -30)
    reasons.push({ w: Math.abs(vol), text: `Volume down ${Math.round(Math.abs(vol))}% week over week` });
  if (usr != null && usr <= -30)
    reasons.push({ w: Math.abs(usr), text: `Active wallets down ${Math.round(Math.abs(usr))}% this week` });

  reasons.sort((a, b) => b.w - a.w);
  return reasons.slice(0, 3).map((r) => r.text);
}

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
      <span style={tabStyle(true)}>Movers</span>
      {DASH_TABS.map((tab) => (
        <Link key={tab} href="/dashboard" style={tabStyle(false)}>
          {tab}
        </Link>
      ))}
    </div>
  );
}

// ── card ──────────────────────────────────────────────────────
function MoverCard({ t, cooling }) {
  const reasons = cooling ? getCoolingReasons(t) : getReasons(t);
  const px = t.priceChange7d;
  const pxColor =
    px == null ? "var(--text-faint)" : px >= 0 ? "var(--gate-ok-text)" : "var(--gate-fail-text)";
  const signalText = SIGNAL_NORMIE[t.signal] || null;
  const profText = PROF_NORMIE[t.Prof] || null;

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "14px 16px",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        minWidth: 0,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t.Project}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "2px" }}>
            {t.Symbol} · {fmtUsd(t.marketCapUsd)} mcap
          </div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)" }}>
            {fmtPrice(t.priceUsd)}
            {t.priceSource === "dexscreener" && (
              <span style={{ opacity: 0.5, fontSize: "11px" }}>*</span>
            )}
          </div>
          <div style={{ fontSize: "12px", fontWeight: 600, color: pxColor }}>
            {fmtPct(px)} <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>24h</span>
          </div>
        </div>
      </div>

      {(signalText || profText) && (
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {signalText && (
            <span
              style={{
                fontSize: "10px",
                padding: "2px 7px",
                borderRadius: "999px",
                background: cooling ? "var(--read-coral-bg)" : "var(--read-teal-bg)",
                color: cooling ? "var(--read-coral-text)" : "var(--read-teal-text)",
              }}
            >
              {signalText}
            </span>
          )}
          {profText && (
            <span
              style={{
                fontSize: "10px",
                padding: "2px 7px",
                borderRadius: "999px",
                background: "var(--badge-neutral-bg)",
                color: "var(--badge-neutral-text)",
              }}
            >
              {profText}
            </span>
          )}
        </div>
      )}

      {reasons.length > 0 ? (
        <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: "3px" }}>
          {reasons.map((r, i) => (
            <li key={i} style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.4 }}>
              {r}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: "12px", color: "var(--text-faint)" }}>
          {cooling ? "Activity quietly winding down." : "Steady on-chain activity — nothing flashy, nothing broken."}
        </div>
      )}
    </div>
  );
}

// ── panel ─────────────────────────────────────────────────────
export default function MoversPanel({ data, lastUpdated }) {
  const withData = data.filter(
    (t) => t.signalScore != null && t.priceUsd != null && t.Opp != null
  );

  const heating = [...withData]
    .sort((a, b) => (b.signalScore ?? -999) - (a.signalScore ?? -999) || (b.Opp ?? 0) - (a.Opp ?? 0))
    .slice(0, 4);

  const heatingNames = new Set(heating.map((t) => t.Project));
  const cooling = [...withData]
    .filter((t) => !heatingNames.has(t.Project))
    .sort((a, b) => (a.signalScore ?? 999) - (b.signalScore ?? 999))
    .slice(0, 4);

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "12px",
  };

  return (
    <div>
      <StatusBanner lastUpdated={lastUpdated} />
      <TabBar />

      <div style={{ marginBottom: "14px" }}>
        <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5 }}>
          Which Base AI coins are actually moving right now — and why. Read straight
          from on-chain activity: real volume, real wallets, real whale flows. No hype feeds.
        </div>
      </div>

      <div>
        <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--gate-ok-text)", marginBottom: "10px" }}>
          Heating up
        </div>
        <div className="movers-grid" style={gridStyle}>
          {heating.map((t) => (
            <MoverCard key={t.Project} t={t} />
          ))}
        </div>
      </div>

      {cooling.length > 0 && (
        <div style={{ marginTop: "22px" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--gate-fail-text)", marginBottom: "10px" }}>
            Cooling off
          </div>
          <div className="movers-grid" style={gridStyle}>
            {cooling.map((t) => (
              <MoverCard key={t.Project} t={t} cooling />
            ))}
          </div>
        </div>
      )}

      <div style={{
        marginTop: "28px",
        padding: "14px 16px",
        borderRadius: "8px",
        border: "1px solid var(--border)",
        background: "var(--bg-subtle)",
        fontSize: "13px",
        color: "var(--text-muted)",
        lineHeight: 1.55,
      }}>
        <strong style={{ color: "var(--text)" }}>Disclaimer:</strong> Not financial advice.
        Information may not be accurate or complete. This is an experiment — scores and signals
        are best-effort, not guaranteed. Always DYOR.
      </div>

      <style>{`
        @media (max-width: 1100px) {
          .movers-grid { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
        }
        @media (max-width: 640px) {
          .movers-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
