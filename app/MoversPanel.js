import Link from "next/link";

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

function StatusBanner({ lastUpdated }) {
  const formatted = lastUpdated
    ? new Date(lastUpdated).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";
  return (
    <div style={{
      background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "8px",
      padding: "12px 16px", marginBottom: "16px",
    }}>
      <div style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "2px" }}>Scores last updated</div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>{formatted}</div>
    </div>
  );
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
        borderRadius: "12px",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>
            {t.Project}
          </div>
          <div style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "2px" }}>
            {t.Symbol} · {fmtUsd(t.marketCapUsd)} mcap
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>
            {fmtPrice(t.priceUsd)}
            {t.priceSource === "dexscreener" && (
              <span style={{ opacity: 0.5, fontSize: "12px" }}>*</span>
            )}
          </div>
          <div style={{ fontSize: "13px", fontWeight: 600, color: pxColor }}>
            {fmtPct(px)} <span style={{ fontWeight: 400, color: "var(--text-faint)" }}>24h</span>
          </div>
        </div>
      </div>

      {(signalText || profText) && (
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {signalText && (
            <span
              style={{
                fontSize: "11px",
                padding: "3px 8px",
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
                fontSize: "11px",
                padding: "3px 8px",
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
        <ul style={{ margin: 0, padding: "0 0 0 18px", display: "flex", flexDirection: "column", gap: "5px" }}>
          {reasons.map((r, i) => (
            <li key={i} style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.45 }}>
              {r}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: "13px", color: "var(--text-faint)" }}>
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
    .slice(0, 6);

  const heatingNames = new Set(heating.map((t) => t.Project));
  const cooling = [...withData]
    .filter((t) => !heatingNames.has(t.Project))
    .sort((a, b) => (a.signalScore ?? 999) - (b.signalScore ?? 999))
    .slice(0, 3);

  return (
    <div>
      <StatusBanner lastUpdated={lastUpdated} />
      <TabBar />

      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "15px", color: "var(--text-muted)", maxWidth: "640px", lineHeight: 1.5 }}>
          Which Base AI coins are actually moving right now — and why. Read straight
          from on-chain activity: real volume, real wallets, real whale flows. No hype feeds.
        </div>
      </div>

      {/* heating up */}
      <div>
        <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--gate-ok-text)", marginBottom: "12px" }}>
          Heating up
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: "14px",
          }}
        >
          {heating.map((t) => (
            <MoverCard key={t.Project} t={t} />
          ))}
        </div>
      </div>

      {/* cooling off */}
      {cooling.length > 0 && (
        <div style={{ marginTop: "36px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--gate-fail-text)", marginBottom: "12px" }}>
            Cooling off
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "14px",
            }}
          >
            {cooling.map((t) => (
              <MoverCard key={t.Project} t={t} cooling />
            ))}
          </div>
        </div>
      )}

      {/* footer note */}
      <div style={{ marginTop: "32px", fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.6, paddingBottom: "40px" }}>
        Everything above is computed from on-chain data (Dune) plus live prices
        (CoinGecko, * = DexScreener). Behavioral scores refresh with the data pipeline;
        prices update hourly. Not financial advice — DYOR.
      </div>
    </div>
  );
}
