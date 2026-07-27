"use client";
import React from "react";
import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";
import { buildAnalysisPrompt } from "../lib/clawdAnalysisPrompt";

Chart.register(...registerables);

const READ_TIER_COLORS = {
  teal:  { bg: "#9FE1CB", text: "#04342C" },
  amber: { bg: "#FAC775", text: "#412402" },
  coral: { bg: "#F5C4B3", text: "#4A1B0C" },
};

const READ_TIERS = {
  Beacon: "teal", "Low Hum": "teal", Undercurrent: "teal", "Quiet Beacon": "teal",
  Flare: "amber", "Low Signal": "amber", "Soft Ping": "amber", Afterglow: "amber", Standby: "amber", Mirage: "amber",
  Backdraft: "coral", Flashpoint: "coral", Overshoot: "coral", Bleed: "coral", "False Flare": "coral", Flatline: "coral",
};

const COMBO_EXPLANATIONS = {
  "Breakout|Confirmed Growth": "Strongest combo on the board: real usage growing, price agrees.",
  "Breakout|Absorbed": "Strong fundamentals, but volume isn't moving price yet. Possible accumulation or quiet selling pressure.",
  "Breakout|Thin Rally": "Strong fundamentals, price up on light volume. Price may be ahead of activity.",
  "Breakout|Cooling": "Strong fundamentals, market hasn't noticed yet. Possibly undiscovered.",
  "Quick Mover|Confirmed Growth": "Hot right now, but durability unproven. Could fade.",
  "Quick Mover|Absorbed": "Fast activity, price not rewarding it. Possible heavy selling into the move.",
  "Quick Mover|Thin Rally": "Classic pump pattern: real activity, price popping on thin volume.",
  "Quick Mover|Cooling": "Momentum likely fading along with price/volume.",
  "Slow Burner|Confirmed Growth": "Steady, sticky usage with price/volume finally agreeing.",
  "Slow Burner|Absorbed": "Durable usage, possibly undervalued relative to its retention strength.",
  "Slow Burner|Thin Rally": "Modest, low-risk price tick on a stable base.",
  "Slow Burner|Cooling": "Stable but quiet. A 'sleeper' — unexciting short-term.",
  "Cold|Confirmed Growth": "Price/volume rising despite weak fundamentals. Disconnect — possibly hype-driven.",
  "Cold|Absorbed": "Weak fundamentals, rising volume, falling price. Possible distribution — worth caution.",
  "Cold|Thin Rally": "Weakest, highest-risk combo: price popping on thin volume with no fundamentals behind it.",
  "Cold|Cooling": "Weak across the board. Lowest priority.",
};

function formatUsd(v) {
  if (v == null) return "—";
  return `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}
function formatPrice(v) {
  if (v == null) return "—";
  return `$${Number(v).toPrecision(4)}`;
}
function formatDateShort(d) {
  try { return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  catch { return String(d); }
}
function formatRowValue(val, format) {
  if (val == null || val === "") return "—";
  const n = Number(val);
  if (Number.isNaN(n)) return "—";
  if (format === "pct1") return `${n.toFixed(1)}%`;
  if (format === "int") return Math.round(n).toLocaleString();
  if (format === "dec1") return n.toFixed(1);
  if (format === "usd") return formatUsd(n);
  if (format === "usd2") return `$${n.toFixed(2)}`;
  if (format === "usdNet") return `${n < 0 ? "\u2212" : "+"}$${Math.abs(Math.round(n)).toLocaleString()}`;
  return n;
}

// Read CSS variable from document — fallbacks for SSR
function cssVar(name, fallback) {
  if (typeof window === "undefined") return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}

function Sparkline({ data, labels, color, formatY }) {
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;
    if (chartRef.current) chartRef.current.destroy();

    const gridColor = cssVar("--chart-grid", "rgba(136,135,128,0.15)");
    const tickColor = cssVar("--chart-tick", "#888");

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data, borderColor: color, backgroundColor: color,
          pointRadius: 2.5, borderWidth: 2, tension: 0.25,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { font: { size: 10 }, color: tickColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 6 },
            grid: { display: false },
          },
          y: {
            ticks: { font: { size: 10 }, color: tickColor, maxTicksLimit: 4, callback: formatY || ((v) => Math.round(v * 10) / 10) },
            grid: { color: gridColor },
          },
        },
      },
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), JSON.stringify(labels), color]);

  if (!data || data.length === 0) return <p style={{ color: "var(--text-faint)", fontSize: "13px" }}>No data yet.</p>;
  return (
    <div style={{ position: "relative", height: "90px", width: "100%" }}>
      <canvas ref={canvasRef} role="img" aria-label="Trend chart" />
    </div>
  );
}

function MiniSparkline({ data, color }) {
  const values = (data || []).filter((v) => v != null && !Number.isNaN(v));
  if (values.length < 2) return <div style={{ height: 22, width: 64 }} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 64, h = 22, pad = 2;
  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", flexShrink: 0 }}>
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function MetricCard({ label, sublabel, value, valueColor, rank, totalProjects, data, labels, color, formatY }) {
  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", background: "var(--card-bg)" }}>
      <div style={{ background: "var(--card-header-bg)", padding: "10px 16px" }}>
        <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text)" }}>{label}</div>
        <div style={{ fontSize: "12px", color: "var(--text-faint)" }}>{sublabel}</div>
      </div>
      <div style={{ padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "8px" }}>
          <span style={{ fontSize: "26px", fontWeight: 600, color: valueColor }}>{value ?? "—"}</span>
          {rank != null && totalProjects != null && (
            <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>Rank #{rank} of {totalProjects}</span>
          )}
        </div>
        <Sparkline data={data} labels={labels} color={color} formatY={formatY} />
      </div>
    </div>
  );
}

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-faint)", margin: "0 0 8px" }}>
      {children}
    </p>
  );
}

function CompactRow({ label, value, rank, totalProjects, lowerBetter, data, color }) {
  return (
    <div className="tw-compact-row" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", borderTop: "1px solid var(--border)" }}>
      <span style={{ width: 124, fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>{label}</span>
      <span style={{ width: 64, fontSize: 13, fontWeight: 600, flexShrink: 0, color: "var(--text)" }}>{value}</span>
      <span style={{ width: 110, fontSize: 11, color: "var(--text-faint)", flexShrink: 0 }}>
        {rank != null && totalProjects != null ? `#${rank} of ${totalProjects}` : "—"}
        {lowerBetter && <span style={{ display: "block" }}>(lower better)</span>}
      </span>
      <MiniSparkline data={data} color={color} />
    </div>
  );
}

const COMPACT_SECTIONS = [
  {
    title: "Growth rates", color: "#185FA5",
    rows: [
      { key: "Vol Grw %", label: "Vol Grw %", format: "pct1" },
      { key: "Tx Grw %", label: "Tx Grw %", format: "pct1" },
      { key: "User Grw %", label: "User Grw %", format: "pct1" },
    ],
  },
  {
    title: "Raw activity", color: "#D85A30",
    rows: [
      { key: "Txs 30d", label: "Txs 30d", format: "int" },
      { key: "Vol 30d", label: "Vol 30d", format: "usd" },
      { key: "Txs/User", label: "Txs/User", format: "dec1" },
      { key: "Traders", label: "Traders", format: "int" },
    ],
  },
  {
    title: "New, returning & retention", color: "#3B6D11",
    rows: [
      { key: "Retention %", label: "Retention %", format: "pct1" },
      { key: "New %", label: "New %", format: "pct1" },
      { key: "New Wallets", label: "New Wallets", format: "int" },
      { key: "Returning Wallets", label: "Returning Wallets", format: "int" },
      { key: "Non-Trade New 30d", label: "Non-Trade New", format: "int" },
    ],
  },
  {
    title: "Buyers & sellers", color: "#534AB7",
    rows: [
      { key: "Buyers 30d", label: "Buyers 30d", format: "int" },
      { key: "Buyers 7d", label: "Buyers 7d", format: "int" },
      { key: "1st Buyers 30d", label: "1st Buyers 30d", format: "int" },
      { key: "1st Buyers 7d", label: "1st Buyers 7d", format: "int" },
      { key: "1st Sellers 30d", label: "1st Sellers 30d", format: "int" },
      { key: "1st Sellers 7d", label: "1st Sellers 7d", format: "int" },
    ],
  },
  {
    title: "Quality & risk", color: "#993556",
    rows: [
      { key: "Qlty %", label: "Qlty %", format: "pct1" },
      { key: "Risk %", label: "Risk %", format: "pct1", lowerBetter: true },
      { key: "Top10 %", label: "Top10 %", format: "pct1", lowerBetter: true },
      { key: "Vol/Tx", label: "Vol/Tx", format: "usd2" },
    ],
  },
  {
    title: "Whales (7d)", color: "#0F6E56",
    rows: [
      { key: "Whale Net 7d", label: "Whale Net Flow", format: "usdNet" },
      { key: "Accum %", label: "Accum %", format: "pct1" },
      { key: "Whale Buyers 7d", label: "Whale Buyers", format: "int" },
      { key: "Whale Sellers 7d", label: "Whale Sellers", format: "int" },
      { key: "Hump Net 7d", label: "Humpback Net Flow", format: "usdNet" },
      { key: "Hump Buyers 7d", label: "Humpback Buyers", format: "int" },
      { key: "Hump Sellers 7d", label: "Humpback Sellers", format: "int" },
      { key: "Retail Net 7d", label: "Retail Net Flow", format: "usdNet" },
      { key: "Whale Vol %", label: "Whale Vol %", format: "pct1" },
      { key: "Divergence Bps", label: "W/R Divergence (bps)", format: "dec1" },
      { key: "Buy Vol %", label: "Buy Vol %", format: "pct1" },
      { key: "Whale Min $", label: "Whale Threshold", format: "usd" },
    ],
  }
];

function ProfileSignalBanner({ profile, signal, read }) {
  const readTier = read ? READ_TIERS[read] || "amber" : null;
  const readColor = readTier ? READ_TIER_COLORS[readTier] : null;
  const explanation = COMBO_EXPLANATIONS[`${profile}|${signal}`] || "Explanation not available for this combination.";
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px",
      background: "var(--bg-subtle)", border: "1px solid var(--border)",
      borderRadius: "8px", padding: "16px 20px", marginBottom: "20px", flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
        {read && (
          <span style={{ fontSize: "16px", padding: "6px 14px", borderRadius: "6px", background: readColor.bg, color: readColor.text, fontWeight: 700 }}>
            Read: {read}
          </span>
        )}
        <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", background: "var(--badge-neutral-bg)", color: "var(--badge-neutral-text)", fontWeight: 500 }}>
          Profile: {profile ?? "—"}
        </span>
        <span style={{ fontSize: "12px", padding: "4px 10px", borderRadius: "6px", background: "var(--badge-neutral-bg)", color: "var(--badge-neutral-text)", fontWeight: 500 }}>
          Signal: {signal ?? "—"}
        </span>
      </div>
      <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0, maxWidth: "420px", textAlign: "right" }}>
        {explanation}
      </p>
    </div>
  );
}

function buildShareText(d) {
  if (!d) return "";
  const f = (v, fmt) => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return "—";
    if (fmt === "usd") {
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
      return "$" + Math.round(n).toLocaleString();
    }
    if (fmt === "usdSign") return (n < 0 ? "\u2212" : "+") + "$" + Math.abs(Math.round(n)).toLocaleString();
    if (fmt === "price") return "$" + n.toPrecision(4);
    if (fmt === "pct") return n.toFixed(1) + "%";
    if (fmt === "dec") return n.toFixed(1);
    if (fmt === "int") return Math.round(n).toLocaleString();
    return String(n);
  };

  const signal = d.signal || "—";
  const note = d.signalNote ? " \u00b7 " + d.signalNote : "";
  const prof = d.Prof || "—";
  const read = d.read || "—";

  const lines = [
    "\ud83d\udd17 $CLAWD \u2014 Under the Hood",
    "",
    "\ud83d\udcb0 " + f(d.priceUsd, "price") + " | MCap " + f(d.marketCapUsd, "usd"),
    "\ud83d\udcca Opp " + f(d.Opp, "dec") + " | Mom " + f(d.Mom, "dec") + " | Sus " + f(d.Sus, "dec"),
    "",
    "\ud83d\udc33 Whale Flow (7d)",
    "  Net: " + f(d["Whale Net 7d"], "usdSign") + " | Accum: " + f(d["Accum %"], "pct") + " | Buyers: " + f(d["Whale Buyers 7d"], "int") + " / Sellers: " + f(d["Whale Sellers 7d"], "int"),
    "  Humpback Net: " + f(d["Hump Net 7d"], "usdSign") + " | Buyers: " + f(d["Hump Buyers 7d"], "int") + " / Sellers: " + f(d["Hump Sellers 7d"], "int"),
    "  Retail Net: " + f(d["Retail Net 7d"], "usdSign") + " | Whale Vol: " + f(d["Whale Vol %"], "pct"),
    "  W/R Divergence: " + f(d["Divergence Bps"], "dec") + " bps",
    "",
    "\ud83d\udcc8 Activity (7d)",
    "  Txs: " + f(d["Txs 7d"], "int") + " | Wallets: " + f(d["Wallets 7d"], "int"),
    "  Retention: " + f(d["Retention %"], "pct") + " | New: " + f(d["New %"], "pct"),
    "  Vol: " + f(d["Vol 30d"], "usd") + " (30d) | Vol Grw: " + f(d["Vol Grw %"], "pct"),
    "",
    "Signal: " + signal + note,
    "Profile: " + prof + " | Read: " + read,
    "",
    "tripwire.vercel.app",
  ];
  return lines.join("\n");
}

function buildObjectiveText(d) {
  if (!d) return "";
  const f = (v, fmt) => {
    if (v == null || v === "") return "\u2014";
    const n = Number(v);
    if (Number.isNaN(n)) return "\u2014";
    if (fmt === "usd") {
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
      return "$" + Math.round(n).toLocaleString();
    }
    if (fmt === "usdSign") return (n < 0 ? "\u2212" : "+") + "$" + Math.abs(Math.round(n)).toLocaleString();
    if (fmt === "price") return "$" + n.toPrecision(4);
    if (fmt === "pct") return n.toFixed(1) + "%";
    if (fmt === "int") return Math.round(n).toLocaleString();
    return String(n);
  };

  const asOf = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

  const lines = [
    "$CLAWD \u2014 On-Chain Data (Base)",
    "As of " + asOf + " \u00b7 source: Dune + CoinGecko/DexScreener",
    "",
    "PRICE & SIZE",
    "  Price: " + f(d.priceUsd, "price"),
    "  Market cap: " + f(d.marketCapUsd, "usd"),
    "  30d DEX volume: " + f(d["Vol 30d"], "usd"),
    "  30d volume change (WoW): " + f(d["Vol Grw %"], "pct"),
    "",
    "ACTIVITY (7d)",
    "  Transactions: " + f(d["Txs 7d"], "int"),
    "  Active wallets: " + f(d["Wallets 7d"], "int"),
    "  Unique DEX traders (30d): " + f(d["Traders"], "int"),
    "  Buyers: " + f(d["Buyers 7d"], "int") + " | Buy/Sell ratio (wallets): " + f(d["Buy/Sell Ratio"], "int"),
    "  Buyer $ share of volume: " + f(d["Buy Vol %"], "pct"),
    "",
    "WALLET RETENTION (7d vs prior week)",
    "  Retention: " + f(d["Retention %"], "pct") + " of last week's wallets returned",
    "  New wallet share (30d): " + f(d["New %"], "pct"),
    "",
    "LARGE-TRADE FLOW (7d, DEX only)",
    "  Whale threshold for this token: " + f(d["Whale Min $"], "usd") + "+ per trade",
    "  Whale net flow: " + f(d["Whale Net 7d"], "usdSign") + " (" + f(d["Whale Buyers 7d"], "int") + " buyers / " + f(d["Whale Sellers 7d"], "int") + " sellers)",
    "  Mega-trade (top 1%) net flow: " + f(d["Hump Net 7d"], "usdSign") + " (" + f(d["Hump Buyers 7d"], "int") + " buyers / " + f(d["Hump Sellers 7d"], "int") + " sellers)",
    "  Non-large-trade net flow: " + f(d["Retail Net 7d"], "usdSign"),
    "  Large trades as % of 7d volume: " + f(d["Whale Vol %"], "pct"),
    "",
    "Contract: " + (d.Address || "\u2014"),
    "Verify independently: basescan.org / dexscreener.com",
  ];
  return lines.join("\n");
}

function buildCondensedText(d) {
  if (!d) return "";
  const f = (v, fmt) => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return "—";
    if (fmt === "usd") {
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
      return "$" + Math.round(n).toLocaleString();
    }
    if (fmt === "usdSign") return (n < 0 ? "\u2212" : "+") + "$" + Math.abs(Math.round(n)).toLocaleString();
    if (fmt === "price") return "$" + n.toPrecision(4);
    if (fmt === "pct") return n.toFixed(1) + "%";
    if (fmt === "dec") return n.toFixed(1);
    return String(n);
  };

  const signal = d.signal || "—";
  const note = d.signalNote ? " \u00b7 " + d.signalNote : "";

  return [
    "$CLAWD " + f(d.priceUsd, "price") + " | " + (d.Prof || "") + " | " + signal + note,
    "\ud83d\udc33 Whale net " + f(d["Whale Net 7d"], "usdSign") + " | Accum " + f(d["Accum %"], "pct") + " | Retail " + f(d["Retail Net 7d"], "usdSign"),
    "\ud83d\udcc8 " + f(d["Wallets 7d"], "int") + " wallets | " + f(d["Retention %"], "pct") + " retention | Vol " + f(d["Vol Grw %"], "pct"),
    "tripwire.vercel.app",
  ].join("\n");
}

function ReportSection() {
  const [report, setReport] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [secret, setSecret] = useState("");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState(null);

  useEffect(() => {
    fetch("/api/clawd-report")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.report?.text) setReport(j.report); })
      .catch(() => {});
    fetch("/api/clawd-analysis")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (j?.analysis?.text) setAnalysis(j.analysis); })
      .catch(() => {});
  }, []);

  const post = async () => {
    setStatus("posting");
    try {
      const res = await fetch("/api/clawd-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ text: draft }),
      });
      if (!res.ok) throw new Error(res.status === 401 ? "wrong secret" : "failed");
      const j = await res.json();
      setReport(j.report);
      setDraft("");
      setStatus("posted");
      setTimeout(() => setStatus(null), 2000);
    } catch (e) {
      setStatus(String(e.message || "failed"));
    }
  };

  const generate = async (force = false) => {
    setStatus(force ? "forcing" : "generating");
    try {
      const res = await fetch("/api/clawd-analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ force }),
      });
      const j = await res.json().catch(() => ({}));
      if (res.status === 429) {
        if (j.analysis?.text) setAnalysis(j.analysis);
        throw new Error(
          j.error === "cooldown"
            ? `cooldown — try again in ~${j.retryAfterHours || "?"}h (or use force after 15m)`
            : j.error === "force_cooldown"
              ? "wait 15 minutes between force regenerations"
              : j.error === "generation_in_progress"
                ? "already generating"
                : "rate limited"
        );
      }
      if (!res.ok) throw new Error(j.error || (res.status === 401 ? "wrong secret" : "failed"));
      if (j.analysis?.text) setAnalysis(j.analysis);
      setStatus(j.cached ? "cached" : "generated");
      setTimeout(() => setStatus(null), 2500);
    } catch (e) {
      setStatus(String(e.message || "failed"));
    }
  };

  const displayed = analysis?.text
    ? { kind: "ai", text: analysis.text, at: analysis.generatedAt, model: analysis.model }
    : report?.text
      ? { kind: "manual", text: report.text, at: report.postedAt }
      : null;

  return (
    <div style={{ marginTop: "16px" }}>
      {displayed && (
        <div style={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: "12px", padding: "16px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "10px", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ fontSize: "13px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-muted)" }}>
              {displayed.kind === "ai" ? "AI Analyst Report" : "Analyst Report"}
            </div>
            <div style={{ fontSize: "11px", color: "var(--text-faint)" }}>
              {displayed.kind === "ai" ? "Generated" : "Posted"}{" "}
              {displayed.at ? new Date(displayed.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : ""}
              {displayed.model ? ` · ${displayed.model}` : ""}
            </div>
          </div>
          <div style={{ whiteSpace: "pre-wrap", fontSize: "13.5px", lineHeight: 1.65, color: "var(--text)" }}>
            {displayed.text}
          </div>
        </div>
      )}
      <div style={{ marginTop: "8px" }}>
        <button
          onClick={() => setShowAdmin(!showAdmin)}
          style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: "11px", cursor: "pointer", padding: 0 }}
        >
          {showAdmin ? "hide" : "admin: generate / post report"}
        </button>
        {showAdmin && (
          <div style={{ marginTop: "8px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <input
              type="password"
              placeholder="admin secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)", fontSize: "12px", maxWidth: "240px" }}
            />
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                onClick={() => generate(false)}
                disabled={!secret || status === "generating" || status === "forcing"}
                style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid var(--btn-active-bg)", background: "var(--btn-active-bg)", color: "var(--btn-active-text)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                {status === "generating" ? "Generating…" : "Generate with Gemini"}
              </button>
              <button
                onClick={() => generate(true)}
                disabled={!secret || status === "generating" || status === "forcing"}
                title="Bypass fingerprint/12h cooldown (still 15m floor)"
                style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                {status === "forcing" ? "Forcing…" : "Force regenerate"}
              </button>
              <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>
                Cached until scores change · max ~1 Gemini call / 12h
              </span>
            </div>
            <textarea
              placeholder="or paste a manual report…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              style={{ padding: "10px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text)", fontSize: "12.5px", fontFamily: "inherit", resize: "vertical" }}
            />
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                onClick={post}
                disabled={!secret || !draft || status === "posting"}
                style={{ padding: "8px 14px", borderRadius: "6px", border: "1px solid var(--border)", background: "var(--bg-subtle)", color: "var(--text-muted)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
              >
                {status === "posting" ? "Posting..." : "Publish manual report"}
              </button>
              {status && !["posting", "generating", "forcing"].includes(status) && (
                <span style={{ fontSize: "12px", color: ["posted", "generated", "cached"].includes(status) ? "var(--gate-ok-text)" : "var(--gate-fail-text)" }}>
                  {status === "posted" ? "\u2713 Manual live"
                    : status === "generated" ? "\u2713 Gemini live"
                    : status === "cached" ? "\u2713 Already up to date (no API call)"
                    : status}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ShareButtons({ clawdRow, history }) {
  const [copied, setCopied] = React.useState(null);
  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };
  const btnStyle = {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid var(--border)",
    background: "var(--bg-subtle)",
    color: "var(--text-muted)",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: 600,
  };
  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", margin: "0 0 20px" }}>
      <button
        style={btnStyle}
        onClick={() => copy(buildShareText(clawdRow), "full")}
      >
        {copied === "full" ? "\u2713 Copied!" : "Copy full stats"}
      </button>
      <button
        style={btnStyle}
        onClick={() => copy(buildCondensedText(clawdRow), "short")}
      >
        {copied === "short" ? "\u2713 Copied!" : "Copy short version"}
      </button>
      <button
        style={btnStyle}
        onClick={() => copy(buildObjectiveText(clawdRow), "objective")}
      >
        {copied === "objective" ? "\u2713 Copied!" : "Copy objective data only"}
      </button>
      <button
        style={btnStyle}
        onClick={() => copy(buildAnalysisPrompt(clawdRow, history), "prompt")}
      >
        {copied === "prompt" ? "\u2713 Copied!" : "Copy analysis prompt"}
      </button>
      <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>
        Paste into Discord / Twitter / Farcaster / Telegram
      </span>
    </div>
  );
}

export default function ClawdPanel({ clawdRow, totalProjects, opportunityRank, momentumRank, sustainabilityRank, marketCapRank, walletsRank, ranks = {} }) {
  const [status, setStatus] = useState("loading");
  const [behavioralHistory, setBehavioralHistory] = useState([]);
  const [priceHistory, setPriceHistory] = useState({ prices: [], market_caps: [] });
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/clawd-history");
        const json = await res.json();
        if (cancelled) return;
        if (json.error) { setErrorMsg(json.error); setStatus("error"); return; }
        setBehavioralHistory(json.behavioralHistory || []);
        setPriceHistory(json.priceHistory || { prices: [], market_caps: [] });
        setStatus("done");
      } catch (err) {
        if (!cancelled) { setErrorMsg(String(err)); setStatus("error"); }
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  function thinSeries(rawPairs, targetPoints = 30) {
    if (!rawPairs || rawPairs.length === 0) return [];
    const step = Math.max(1, Math.floor(rawPairs.length / targetPoints));
    return rawPairs.filter((_, i) => i % step === 0).map(([ts, val]) => ({ x: formatDateShort(ts), y: val }));
  }

  const weekLabels  = behavioralHistory.map((r) => formatDateShort(r["Snapshot Date"]));
  const oppData     = behavioralHistory.map((r) => Number(r["Opp"]));
  const momData     = behavioralHistory.map((r) => Number(r["Mom"]));
  const susData     = behavioralHistory.map((r) => Number(r["Sus"]));
  const walletsData = behavioralHistory.map((r) => Number(r["Wallets 30d"]));
  const mcapThinned = thinSeries(priceHistory.market_caps);
  const priceThinned = thinSeries(priceHistory.prices);

  return (
    <div>
      <h2 style={{ marginTop: 0, color: "var(--text)" }}>CLAWD — Health Check</h2>

      <ProfileSignalBanner profile={clawdRow?.["Prof"]} signal={clawdRow?.signal} read={clawdRow?.read} />
      <ShareButtons clawdRow={clawdRow} history={behavioralHistory} />
      <ReportSection />

      {status === "loading" && <p style={{ color: "var(--text-muted)" }}>Loading history…</p>}
      {status === "error"   && <p style={{ color: "#c0392b" }}>Couldn't load history: {errorMsg}</p>}
      {priceHistory.error   && <p style={{ fontSize: "12px", color: "#c0392b", marginBottom: "8px" }}>Price/market cap history failed to load: {priceHistory.error}</p>}

      {status === "done" && (
        <>
          <SectionLabel>Behavioral</SectionLabel>
          <div className="tw-clawd-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
            <MetricCard label="Opportunity" sublabel="Score & trend (8w)" value={clawdRow?.["Opp"]} valueColor="#3B6D11" rank={opportunityRank} totalProjects={totalProjects} data={oppData} labels={weekLabels} color="#3B6D11" />
            <MetricCard label="Momentum" sublabel="Score & trend (8w)" value={clawdRow?.["Mom"]} valueColor="#185FA5" rank={momentumRank} totalProjects={totalProjects} data={momData} labels={weekLabels} color="#185FA5" />
            <MetricCard label="Sustainability" sublabel="Score & trend (8w)" value={clawdRow?.["Sus"]} valueColor="#854F0B" rank={sustainabilityRank} totalProjects={totalProjects} data={susData} labels={weekLabels} color="#854F0B" />
          </div>

          <SectionLabel>Market</SectionLabel>
          <div className="tw-clawd-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px", marginBottom: "24px" }}>
            <MetricCard label="Wallets" sublabel="30d active, trend (8w)" value={clawdRow?.["Wallets 30d"]} valueColor="#3a6ea5" rank={walletsRank} totalProjects={totalProjects} data={walletsData} labels={weekLabels} color="#3a6ea5" formatY={(v) => Math.round(v)} />
            <MetricCard label="Market Cap" sublabel="USD, trend (60d)" value={clawdRow?.marketCapUsd != null ? formatUsd(clawdRow.marketCapUsd) : "—"} valueColor="#534AB7" rank={marketCapRank} totalProjects={totalProjects} data={mcapThinned.map((p) => p.y)} labels={mcapThinned.map((p) => p.x)} color="#534AB7" formatY={formatUsd} />
            <MetricCard label="Price" sublabel="USD, trend (60d)" value={clawdRow?.priceUsd != null ? formatPrice(clawdRow.priceUsd) : "—"} valueColor="#0F6E56" rank={null} totalProjects={totalProjects} data={priceThinned.map((p) => p.y)} labels={priceThinned.map((p) => p.x)} color="#0F6E56" formatY={formatPrice} />
          </div>

          <SectionLabel>Full breakdown</SectionLabel>
          <div className="tw-clawd-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "16px" }}>
            {COMPACT_SECTIONS.map((section, idx) => (
              <div key={section.title} style={{
                border: "1px solid var(--border)", borderRadius: "8px",
                background: "var(--card-bg)", padding: "10px 16px",
                gridColumn: idx === COMPACT_SECTIONS.length - 1 ? "span 2" : undefined,
              }}>
                <p style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 4px", color: section.color }}>{section.title}</p>
                {section.rows.map((row) => (
                  <CompactRow
                    key={row.key}
                    label={row.label}
                    value={formatRowValue(clawdRow?.[row.key], row.format)}
                    rank={ranks[row.key] ?? null}
                    totalProjects={totalProjects}
                    lowerBetter={row.lowerBetter}
                    data={behavioralHistory.map((r) => Number(r[row.key]))}
                    color={section.color}
                  />
                ))}
              </div>
            ))}
          </div>
        </>
      )}

      <p style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "20px" }}>
        Behavioral history is a true backtest — recomputed from on-chain activity as of each past date,
        including full cohort context, not just CLAWD in isolation. Refreshed roughly weekly, not live.
        Price/Market Cap history comes from CoinGecko.
      </p>
    </div>
  );
}