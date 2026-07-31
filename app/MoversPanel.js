"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import StatusBanner from "./StatusBanner";
import { LinkMobileNav } from "./MobileTabNav";
import { rankMovers } from "@/lib/moversRank";

// ── formatting ────────────────────────────────────────────────
function fmtUsd(n) {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.round(n).toLocaleString()}`;
}

/** Core dashboard tabs. */
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
  "About",
];

const PERIOD_VALUES = new Set(["24h", "7d", "30d"]);

function loadPeriod() {
  try {
    const v = localStorage.getItem("zdash-period");
    if (PERIOD_VALUES.has(v)) return v;
  } catch {}
  return "7d";
}

function savePeriod(period) {
  try { localStorage.setItem("zdash-period", period); } catch {}
}

function toneColor(tone) {
  if (tone === "up") return "var(--gate-ok-text)";
  if (tone === "down") return "var(--gate-fail-text)";
  return "var(--text-muted)";
}

function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      style={{ display: "inline-flex", borderRadius: "6px", border: "1px solid var(--btn-inactive-border)", overflow: "hidden", flexShrink: 0 }}
    >
      {options.map((opt, i) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "5px 12px",
              border: "none",
              borderRight: i === options.length - 1 ? "none" : "1px solid var(--btn-inactive-border)",
              background: active ? "var(--btn-active-bg)" : "var(--btn-inactive-bg)",
              color: active ? "var(--btn-active-text)" : "var(--btn-inactive-text)",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: active ? 600 : 400,
              whiteSpace: "nowrap",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/** Plain-English on-chain facts — kept local; ranking lives in lib/moversRank. */
function getNotableFacts(t, period) {
  const facts = [];
  const win = period === "24h" ? "24h" : "7d";
  const wNet = t[period === "24h" ? "Whale Net 24h" : "Whale Net 7d"];
  const wBuyers = t[period === "24h" ? "Whale Buyers 24h" : "Whale Buyers 7d"];
  const wSellers = t[period === "24h" ? "Whale Sellers 24h" : "Whale Sellers 7d"];
  const whaleVol = t[period === "24h" ? "Whale Vol % 24h" : "Whale Vol %"];
  const rNet = t[period === "24h" ? "Retail Net 24h" : "Retail Net 7d"];
  const acc = t[period === "24h" ? "Accum % 24h" : "Accum %"];
  const volKey = period === "24h" ? "Vol 24h" : period === "30d" ? "Vol 30d" : "Vol 7d";
  const txsKey = period === "24h" ? "Txs 24h" : period === "30d" ? "Txs 30d" : "Txs 7d";
  const walletsKey = period === "24h" ? "Wallets 24h" : period === "30d" ? "Wallets 30d" : "Wallets 7d";

  if (period === "7d") {
    const vol = t["Vol Grw %"];
    const usr = t["User Grw %"];
    const txg = t["Tx Grw %"];
    const ret = t["Retention %"];

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
  } else {
    const vol = t[volKey];
    const txs = t[txsKey];
    const wallets = t[walletsKey];
    if (vol != null && vol >= 5000) {
      facts.push({ w: Math.min(vol / 1000, 120), tone: "neutral", text: `DEX volume ${fmtUsd(vol)} (${period})` });
    }
    if (txs != null && txs >= 80) {
      facts.push({ w: Math.min(txs / 5, 100), tone: "neutral", text: `${Math.round(txs).toLocaleString()} txs (${period})` });
    }
    if (wallets != null && wallets >= 40) {
      facts.push({ w: Math.min(wallets / 3, 90), tone: "neutral", text: `${Math.round(wallets).toLocaleString()} wallets (${period})` });
    }
  }

  const whaleMin = period === "24h" ? 1500 : 2500;
  if (wNet != null && Math.abs(wNet) >= whaleMin) {
    const dir = wNet > 0 ? "in" : "out";
    const who = wNet > 0 ? wBuyers : wSellers;
    facts.push({
      w: 80 + Math.min(Math.abs(wNet) / 1000, 80),
      tone: wNet > 0 ? "up" : "down",
      text: `Whale net ${dir} ${fmtUsd(Math.abs(wNet))} (${win})${who ? ` · ${who} large wallets` : ""}`,
    });
  }

  if (acc != null && (acc >= 65 || acc <= 35) && wNet != null && Math.abs(wNet) >= 1000) {
    facts.push({
      w: 50 + Math.abs(acc - 50),
      tone: acc >= 65 ? "up" : "down",
      text: `Whale accum ${Math.round(acc)}% (buys share of whale volume, ${win})`,
    });
  }

  if (whaleVol != null && whaleVol >= 55) {
    facts.push({ w: whaleVol * 0.6, tone: "neutral", text: `Whales = ${Math.round(whaleVol)}% of ${win} dollar volume` });
  }

  if (rNet != null && wNet != null && Math.sign(rNet) !== Math.sign(wNet) && Math.abs(wNet) >= whaleMin && Math.abs(rNet) >= whaleMin) {
    facts.push({
      w: 70,
      tone: "neutral",
      text: wNet > 0
        ? `Whales buying while retail net sold ${fmtUsd(Math.abs(rNet))} (${win})`
        : `Whales selling while retail net bought ${fmtUsd(Math.abs(rNet))} (${win})`,
    });
  }

  facts.sort((a, b) => b.w - a.w);
  return facts.slice(0, 3).map(({ text, tone }) => ({ text, tone: tone || "neutral" }));
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
        {DASH_TABS.map((tab) => (
          <Link key={tab} href={`/dashboard?tab=${encodeURIComponent(tab)}`} style={tabStyle(false)}>
            {tab}
          </Link>
        ))}
      </div>
      <LinkMobileNav currentPage="movers" />
    </>
  );
}

function StatCard({ t, tag, period }) {
  const facts = getNotableFacts(t, period);
  const read = t.read || null;
  const prof = t.Prof || null;
  const quietLabel = period === "7d"
    ? "Quiet week on the usual WoW metrics — listed for context."
    : `Quiet on the usual ${period} metrics — listed for context.`;

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
            <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "4px", background: "var(--badge-neutral-bg)", color: "var(--badge-neutral-text)" }}>
              {read}
            </span>
          )}
          {prof && (
            <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: "4px", background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
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
        <div style={{ fontSize: "12px", color: "var(--text-faint)" }}>{quietLabel}</div>
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

export default function MoversPanel({ data, lastUpdated, snapshotBuiltAt = null }) {
  const [period, setPeriod] = useState(() => loadPeriod());
  const ranked = useMemo(() => rankMovers(data, period), [data, period]);
  const activity = ranked.activity;
  const whaleCards = ranked.whales;

  const gridStyle = {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "10px",
    alignItems: "start",
  };

  const activityHint = period === "7d"
    ? "Largest week-over-week moves in DEX volume, transactions, or active wallets — up or down."
    : `Busiest tokens by DEX volume, transactions, and wallets over ${period}. Absolute levels (no prior-${period} twin yet).`;

  const whaleHint = period === "30d"
    ? "Largest whale net flows over 7d (no 30d whale twin in Dune yet). Size is relative to each token; direction alone isn’t a thesis."
    : `Largest whale net flows over ${ranked.whaleFlowWindow}. Size is relative to each token; direction alone isn’t a thesis.`;

  const blurb = period === "7d"
    ? "Biggest on-chain swings this week — volume, wallets, whale flow. Not a price board. A spike can mean a dip bid, an exit, or noise (hack churn counts). Second look, not a call."
    : `Biggest on-chain activity and whale flow over ${period === "30d" ? "30d (whales use 7d)" : period}. Not a price board. Second look, not a call.`;

  return (
    <div>
      <StatusBanner lastUpdated={lastUpdated} snapshotBuiltAt={snapshotBuiltAt} />
      <TabBar />

      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
        <div style={{ fontSize: "14px", color: "var(--text-muted)", lineHeight: 1.5, maxWidth: "720px" }}>
          {blurb}
        </div>
        <SegmentedControl
          ariaLabel="Movers period window"
          value={period}
          onChange={(next) => { savePeriod(next); setPeriod(next); }}
          options={[
            { value: "24h", label: "24h" },
            { value: "7d", label: "7d" },
            { value: "30d", label: "30d" },
          ]}
        />
      </div>

      <Section title="Activity swings" hint={activityHint}>
        <div className="movers-grid" style={gridStyle}>
          {activity.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--text-faint)" }}>No large activity swings in the latest scrape.</div>
          ) : (
            activity.map((t) => <StatCard key={t.Project} t={t} tag="activity" period={period} />)
          )}
        </div>
      </Section>

      <Section title="Whale flow" hint={whaleHint}>
        <div className="movers-grid" style={gridStyle}>
          {whaleCards.length === 0 ? (
            <div style={{ fontSize: "13px", color: "var(--text-faint)" }}>No large whale nets in the latest scrape.</div>
          ) : (
            whaleCards.map((t) => <StatCard key={`w-${t.Project}`} t={t} tag="whales" period={period} />)
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
