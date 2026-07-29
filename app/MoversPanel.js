import Link from "next/link";
import StatusBanner from "./StatusBanner";
import { LinkMobileNav } from "./MobileTabNav";

// ── formatting ────────────────────────────────────────────────
function fmtUsd(n) {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

/** Core dashboard tabs; Forecast sits late (before About). */
const DASH_TABS = [
  "Overview",
  "Activity",
  "Wallets",
  "Buyers",
  "Growth",
  "Whales & Risk",
  "Discover",
  "Watchlist",
  "CLAWD",
  "The Wire",
  "Forecast",
  "About",
];

function toneColor(tone) {
  if (tone === "up") return "var(--gate-ok-text)";
  if (tone === "down") return "var(--gate-fail-text)";
  return "var(--text-muted)";
}

/** Plain-English on-chain facts — no price calls, no bullish/bearish spin. */
function getNotableFacts(t) {
  const facts = [];
  const vol = t["Vol Grw %"];
  const usr = t["User Grw %"];
  const txg = t["Tx Grw %"];
  const ret = t["Retention %"];
  const acc = t["Accum %"];
  const wNet = t["Whale Net 7d"];
  const wBuyers = t["Whale Buyers 7d"];
  const wSellers = t["Whale Sellers 7d"];
  const whaleVol = t["Whale Vol %"];
  const rNet = t["Retail Net 7d"];

  if (vol != null && Math.abs(vol) >= 30) {
    const abs = Math.round(Math.abs(vol));
    const tone = vol >= 0 ? "up" : "down";
    if (vol >= 200) facts.push({ w: abs, tone, text: `DEX volume ~${Math.round(vol / 100) + 1}× vs prior week` });
    else if (vol >= 100) facts.push({ w: abs, tone, text: "DEX volume more than doubled vs prior week" });
    else if (vol >= 30) facts.push({ w: abs, tone, text: `DEX volume up ${abs}% vs prior week` });
    else facts.push({ w: abs, tone, text: `DEX volume down ${abs}% vs prior week` });
  }

  if (txg != null && Math.abs(txg) >= 40) {
    const abs = Math.round(Math.abs(txg));
    facts.push({
      w: abs * 0.85,
      tone: txg >= 0 ? "up" : "down",
      text: `Transactions ${txg >= 0 ? "up" : "down"} ${abs}% vs prior week`,
    });
  }

  if (usr != null && Math.abs(usr) >= 30) {
    const abs = Math.round(Math.abs(usr));
    facts.push({
      w: abs * 0.9,
      tone: usr >= 0 ? "up" : "down",
      text: `Active wallets ${usr >= 0 ? "up" : "down"} ${abs}% vs prior week`,
    });
  }

  if (ret != null && ret >= 45) {
    facts.push({ w: ret * 0.7, tone: "neutral", text: `${Math.round(ret)}% of last week's wallets returned` });
  }

  if (wNet != null && Math.abs(wNet) >= 2500) {
    const dir = wNet > 0 ? "in" : "out";
    const who = wNet > 0 ? wBuyers : wSellers;
    facts.push({
      w: 80 + Math.min(Math.abs(wNet) / 1000, 80),
      tone: wNet > 0 ? "up" : "down",
      text: `Whale net ${dir} ${fmtUsd(Math.abs(wNet))}${who ? ` · ${who} large wallets` : ""}`,
    });
  }

  if (acc != null && (acc >= 65 || acc <= 35) && wNet != null && Math.abs(wNet) >= 1000) {
    facts.push({
      w: 50 + Math.abs(acc - 50),
      tone: acc >= 65 ? "up" : "down",
      text: `Whale accum ${Math.round(acc)}% (buys share of whale volume)`,
    });
  }

  if (whaleVol != null && whaleVol >= 55) {
    facts.push({ w: whaleVol * 0.6, tone: "neutral", text: `Whales = ${Math.round(whaleVol)}% of 7d dollar volume` });
  }

  if (rNet != null && wNet != null && Math.sign(rNet) !== Math.sign(wNet) && Math.abs(wNet) >= 2500 && Math.abs(rNet) >= 2500) {
    facts.push({
      w: 70,
      tone: "neutral",
      text: wNet > 0
        ? `Whales buying while retail net sold ${fmtUsd(Math.abs(rNet))}`
        : `Whales selling while retail net bought ${fmtUsd(Math.abs(rNet))}`,
    });
  }

  facts.sort((a, b) => b.w - a.w);
  return facts.slice(0, 3).map(({ text, tone }) => ({ text, tone: tone || "neutral" }));
}

function activityNotability(t) {
  return (
    Math.abs(t["Vol Grw %"] ?? 0) +
    Math.abs(t["User Grw %"] ?? 0) * 0.9 +
    Math.abs(t["Tx Grw %"] ?? 0) * 0.7
  );
}

function whaleNotability(t) {
  const wNet = Math.abs(t["Whale Net 7d"] ?? 0);
  const mcap = t.marketCapUsd > 0 ? t.marketCapUsd : null;
  const bps = mcap ? (wNet / mcap) * 10000 : wNet / 100;
  return Math.min(bps, 250) + Math.min(wNet / 500, 80);
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
    <>
      <div className="tw-tab-strip tw-nav-desktop" style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
        <span style={tabStyle(true)}>Movers</span>
        {DASH_TABS.map((tab) =>
          tab === "Forecast" ? (
            <Link key={tab} href="/forecast" style={tabStyle(false)}>Forecast</Link>
          ) : (
            <Link key={tab} href={`/dashboard?tab=${encodeURIComponent(tab)}`} style={tabStyle(false)}>
              {tab}
            </Link>
          )
        )}
      </div>
      <LinkMobileNav currentPage="movers" />
    </>
  );
}

function StatCard({ t, tag }) {
  const facts = getNotableFacts(t);
  const read = t.read || null;
  const prof = t.Prof || null;

  return (
    <div
      style={{
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px 14px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        minWidth: 0,
        height: "fit-content",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "15px", fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {t.Project}
          </div>
          <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "2px" }}>
            {t.Symbol}
            {t.marketCapUsd != null ? ` · ${fmtUsd(t.marketCapUsd)} mcap` : ""}
          </div>
        </div>
        {tag ? (
          <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--text-faint)", flexShrink: 0, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {tag}
          </span>
        ) : null}
      </div>

      {(read || prof) && (
        <div style={{ display: "flex", gap: "5px", flexWrap: "wrap" }}>
          {read && (
            <span
              style={{
                fontSize: "10px",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "var(--badge-neutral-bg)",
                color: "var(--badge-neutral-text)",
              }}
            >
              {read}
            </span>
          )}
          {prof && (
            <span
              style={{
                fontSize: "10px",
                padding: "2px 7px",
                borderRadius: "4px",
                background: "var(--bg-subtle)",
                color: "var(--text-muted)",
              }}
            >
              {prof}
            </span>
          )}
        </div>
      )}

      {facts.length > 0 ? (
        <ul style={{ margin: 0, padding: "0 0 0 16px", display: "flex", flexDirection: "column", gap: "2px" }}>
          {facts.map((r, i) => (
            <li key={i} style={{ fontSize: "12px", color: toneColor(r.tone), lineHeight: 1.35 }}>
              {r.text}
            </li>
          ))}
        </ul>
      ) : (
        <div style={{ fontSize: "12px", color: "var(--text-faint)" }}>
          Quiet week on the usual WoW metrics — listed for context.
        </div>
      )}
    </div>
  );
}

function Section({ title, hint, children }) {
  return (
    <div style={{ marginBottom: "20px" }}>
      <div style={{ marginBottom: "8px" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text)" }}>
          {title}
        </div>
        {hint ? (
          <div style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "3px", lineHeight: 1.4 }}>
            {hint}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  );
}

// ── panel ─────────────────────────────────────────────────────
export default function MoversPanel({ data, lastUpdated }) {
  const withData = data.filter((t) => t.Opp != null && t.Project);

  const activityPool = [...withData]
    .filter((t) => activityNotability(t) >= 35)
    .sort((a, b) => activityNotability(b) - activityNotability(a));

  const whalePool = [...withData]
    .filter((t) => Math.abs(t["Whale Net 7d"] ?? 0) >= 2500)
    .sort((a, b) => whaleNotability(b) - whaleNotability(a));

  const activity = activityPool.slice(0, 6);
  const activityNames = new Set(activity.map((t) => t.Project));
  const whales = whalePool.filter((t) => !activityNames.has(t.Project)).slice(0, 6);
  const whaleCards = whales.length >= 3 ? whales : whalePool.slice(0, 6);

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "10px",
    alignItems: "start",
  };

  return (
    <div>
      <StatusBanner lastUpdated={lastUpdated} />
      <TabBar />

      <div style={{ marginBottom: "16px", maxWidth: "720px" }}>
        <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5 }}>
          Biggest on-chain swings this week — volume, wallets, whale flow. Not a price board.
          A spike can mean a dip bid, an exit, or noise (hack churn counts). Second look, not a call.
        </div>
      </div>

      <Section
        title="Activity swings"
        hint="Largest week-over-week moves in DEX volume, transactions, or active wallets — up or down."
      >
        <div className="movers-grid" style={gridStyle}>
          {activity.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--text-faint)" }}>No large activity swings in the latest scrape.</div>
          ) : (
            activity.map((t) => <StatCard key={t.Project} t={t} tag="activity" />)
          )}
        </div>
      </Section>

      <Section
        title="Whale flow"
        hint="Largest whale net flows over 7d. Size is relative to each token; direction alone isn’t a thesis."
      >
        <div className="movers-grid" style={gridStyle}>
          {whaleCards.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--text-faint)" }}>No large whale nets in the latest scrape.</div>
          ) : (
            whaleCards.map((t) => <StatCard key={`w-${t.Project}`} t={t} tag="whales" />)
          )}
        </div>
      </Section>

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
