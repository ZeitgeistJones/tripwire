"use client";
import { useEffect, useRef, useState } from "react";
import { Chart, registerables } from "chart.js";

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
  const hasData = Array.isArray(data) && data.length > 0;

  useEffect(() => {
    if (!canvasRef.current || !hasData) return;
    if (chartRef.current) chartRef.current.destroy();

    const gridColor = cssVar("--chart-grid", "rgba(136,135,128,0.15)");
    const tickColor = cssVar("--chart-tick", "#888");

    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: [{
          data, borderColor: color, backgroundColor: color,
          pointRadius: 1.5, borderWidth: 2, tension: 0.25,
        }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            ticks: { font: { size: 9 }, color: tickColor, maxRotation: 0, autoSkip: true, maxTicksLimit: 5 },
            grid: { display: false },
          },
          y: {
            ticks: { font: { size: 9 }, color: tickColor, maxTicksLimit: 3, callback: formatY || ((v) => Math.round(v * 10) / 10) },
            grid: { color: gridColor },
          },
        },
      },
    });
    return () => { if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null; } };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), JSON.stringify(labels), color]);

  if (!hasData) return null;
  return (
    <div style={{ position: "relative", height: "56px", width: "100%", marginTop: "4px" }}>
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
  const hasChart = Array.isArray(data) && data.length > 0;
  const rankLabel = rank != null && totalProjects != null ? `#${rank} / ${totalProjects}` : null;

  return (
    <div style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", background: "var(--card-bg)", height: "100%" }}>
      <div style={{ background: "var(--card-header-bg)", padding: "8px 12px" }}>
        <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--text)" }}>{label}</div>
        <div style={{ fontSize: "11px", color: "var(--text-faint)" }}>{sublabel}</div>
      </div>
      {hasChart ? (
        <div style={{ padding: "10px 12px 12px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "8px" }}>
            <span style={{ fontSize: "22px", fontWeight: 600, color: valueColor, lineHeight: 1.15 }}>{value ?? "—"}</span>
            {rankLabel && <span style={{ fontSize: "11px", color: "var(--text-faint)", flexShrink: 0 }}>{rankLabel}</span>}
          </div>
          <Sparkline data={data} labels={labels} color={color} formatY={formatY} />
        </div>
      ) : (
        <div style={{
          padding: "18px 12px 20px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          minHeight: "88px",
        }}>
          <span style={{ fontSize: "32px", fontWeight: 700, color: valueColor, lineHeight: 1.05, letterSpacing: "-0.02em" }}>
            {value ?? "—"}
          </span>
          {rankLabel && (
            <span style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "8px" }}>{rankLabel}</span>
          )}
        </div>
      )}
    </div>
  );
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

const CLAWD_PERIOD_VALUES = new Set(["24h", "7d", "30d", "all"]);
const CLAWD_PERIOD_ALWAYS = new Set(["WoW", "score", "30d thr"]);

function loadClawdPeriod() {
  try {
    const v = localStorage.getItem("zdash-clawd-period");
    if (CLAWD_PERIOD_VALUES.has(v)) return v;
  } catch {}
  return "7d";
}

function saveClawdPeriod(period) {
  try { localStorage.setItem("zdash-clawd-period", period); } catch {}
}

function rowMatchesClawdPeriod(row, period) {
  if (period === "all") return true;
  if (CLAWD_PERIOD_ALWAYS.has(row.window)) return true;
  return row.window === period;
}

function filterCompactSections(period) {
  return COMPACT_SECTIONS
    .map((section) => {
      const rows = section.rows.filter((row) => rowMatchesClawdPeriod(row, period));
      if (!rows.length) return null;
      let title = section.title;
      if (period !== "all" && title.startsWith("Whales")) title = "Whales";
      return { ...section, title, rows };
    })
    .filter(Boolean);
}

function SectionLabel({ children }) {
  return (
    <p style={{ fontSize: "12px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", color: "var(--text-faint)", margin: "0 0 8px" }}>
      {children}
    </p>
  );
}

function CompactRow({ label, window: win, value, rank, totalProjects, lowerBetter, data, color }) {
  return (
    <div className="tw-compact-row" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "7px 0", borderTop: "1px solid var(--border)" }}>
      <span style={{ width: 148, fontSize: 12, color: "var(--text-muted)", flexShrink: 0, lineHeight: 1.25 }}>
        {label}
        {win ? <span style={{ color: "var(--text-faint)", marginLeft: 4 }}>{win}</span> : null}
      </span>
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
    title: "Growth rates (WoW)", color: "#185FA5",
    rows: [
      { key: "Vol Grw %", label: "Vol Grw %", format: "pct1", window: "WoW" },
      { key: "Tx Grw %", label: "Tx Grw %", format: "pct1", window: "WoW" },
      { key: "User Grw %", label: "User Grw %", format: "pct1", window: "WoW" },
    ],
  },
  {
    title: "Raw activity", color: "#D85A30",
    rows: [
      { key: "Txs 30d", label: "Txs", format: "int", window: "30d" },
      { key: "Txs 7d", label: "Txs", format: "int", window: "7d" },
      { key: "Txs 24h", label: "Txs", format: "int", window: "24h" },
      { key: "Vol 30d", label: "Vol", format: "usd", window: "30d" },
      { key: "Vol 7d", label: "Vol", format: "usd", window: "7d" },
      { key: "Vol 24h", label: "Vol", format: "usd", window: "24h" },
      { key: "Txs/User", label: "Txs/User", format: "dec1", window: "30d" },
      { key: "Txs/User 7d", label: "Txs/User", format: "dec1", window: "7d" },
      { key: "Txs/User 24h", label: "Txs/User", format: "dec1", window: "24h" },
      { key: "Traders", label: "Traders", format: "int", window: "30d" },
      { key: "Wallets 30d", label: "Wallets", format: "int", window: "30d" },
      { key: "Wallets 7d", label: "Wallets", format: "int", window: "7d" },
      { key: "Wallets 24h", label: "Wallets", format: "int", window: "24h" },
    ],
  },
  {
    title: "New / returning (30d) & retention (WoW)", color: "#3B6D11",
    rows: [
      { key: "Retention %", label: "Retention %", format: "pct1", window: "WoW" },
      { key: "New %", label: "New %", format: "pct1", window: "30d" },
      { key: "New Wallets", label: "New Wallets", format: "int", window: "30d" },
      { key: "Returning Wallets", label: "Returning Wallets", format: "int", window: "30d" },
      { key: "Non-Trade New 30d", label: "Non-Trade New", format: "int", window: "30d" },
    ],
  },
  {
    title: "Buyers & sellers", color: "#534AB7",
    rows: [
      { key: "Buyers 30d", label: "Buyers", format: "int", window: "30d" },
      { key: "Buyers 7d", label: "Buyers", format: "int", window: "7d" },
      { key: "Buyers 24h", label: "Buyers", format: "int", window: "24h" },
      { key: "1st Buyers 30d", label: "1st Buyers", format: "int", window: "30d" },
      { key: "1st Buyers 7d", label: "1st Buyers", format: "int", window: "7d" },
      { key: "1st Buyers 24h", label: "1st Buyers", format: "int", window: "24h" },
      { key: "1st Sellers 30d", label: "1st Sellers", format: "int", window: "30d" },
      { key: "1st Sellers 7d", label: "1st Sellers", format: "int", window: "7d" },
      { key: "1st Sellers 24h", label: "1st Sellers", format: "int", window: "24h" },
    ],
  },
  {
    title: "Quality & risk", color: "#993556",
    rows: [
      { key: "Qlty %", label: "Qlty %", format: "pct1", window: "score" },
      { key: "Risk %", label: "Risk %", format: "pct1", window: "score", lowerBetter: true },
      { key: "Top10 %", label: "Top10 %", format: "pct1", window: "30d", lowerBetter: true },
      { key: "Vol/Tx", label: "Vol/Tx", format: "usd2", window: "30d" },
      { key: "Vol/Tx 7d", label: "Vol/Tx", format: "usd2", window: "7d" },
      { key: "Vol/Tx 24h", label: "Vol/Tx", format: "usd2", window: "24h" },
      { key: "Whale Min $", label: "Whale Threshold", format: "usd", window: "30d thr" },
      { key: "Hump Min $", label: "Mega Whale Threshold", format: "usd", window: "30d thr" },
    ],
  },
  {
    title: "Whales (7d)", color: "#0F6E56",
    rows: [
      { key: "Whale Net 7d", label: "Whale Net Flow", format: "usdNet", window: "7d" },
      { key: "Accum %", label: "Accum %", format: "pct1", window: "7d" },
      { key: "Whale Buyers 7d", label: "Whale Buyers", format: "int", window: "7d" },
      { key: "Whale Sellers 7d", label: "Whale Sellers", format: "int", window: "7d" },
      { key: "Hump Net 7d", label: "Mega Whale Net Flow", format: "usdNet", window: "7d" },
      { key: "Hump Buyers 7d", label: "Mega Whale Buyers", format: "int", window: "7d" },
      { key: "Hump Sellers 7d", label: "Mega Whale Sellers", format: "int", window: "7d" },
      { key: "Retail Net 7d", label: "Retail Net Flow", format: "usdNet", window: "7d" },
      { key: "Whale Vol %", label: "Whale Vol %", format: "pct1", window: "7d" },
      { key: "Divergence Bps", label: "W/R Divergence (bps)", format: "dec1", window: "7d" },
      { key: "Buy Vol %", label: "Buy Vol %", format: "pct1", window: "7d" },
    ],
  },
  {
    title: "Whales (24h)", color: "#0F6E56",
    rows: [
      { key: "Whale Net 24h", label: "Whale Net Flow", format: "usdNet", window: "24h" },
      { key: "Accum % 24h", label: "Accum %", format: "pct1", window: "24h" },
      { key: "Whale Buyers 24h", label: "Whale Buyers", format: "int", window: "24h" },
      { key: "Whale Sellers 24h", label: "Whale Sellers", format: "int", window: "24h" },
      { key: "Hump Net 24h", label: "Mega Whale Net Flow", format: "usdNet", window: "24h" },
      { key: "Hump Buyers 24h", label: "Mega Whale Buyers", format: "int", window: "24h" },
      { key: "Hump Sellers 24h", label: "Mega Whale Sellers", format: "int", window: "24h" },
      { key: "Retail Net 24h", label: "Retail Net Flow", format: "usdNet", window: "24h" },
      { key: "Whale Vol % 24h", label: "Whale Vol %", format: "pct1", window: "24h" },
      { key: "Divergence Bps 24h", label: "W/R Divergence (bps)", format: "dec1", window: "24h" },
      { key: "Buy Vol % 24h", label: "Buy Vol %", format: "pct1", window: "24h" },
    ],
  },
];

function ProfileSignalBanner({ profile, signal, read }) {
  const readTier = read ? READ_TIERS[read] || "amber" : null;
  const readColor = readTier ? READ_TIER_COLORS[readTier] : null;
  const explanation = COMBO_EXPLANATIONS[`${profile}|${signal}`] || "Explanation not available for this combination.";
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px",
      background: "var(--bg-subtle)", border: "1px solid var(--border)",
      borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", flexWrap: "wrap",
    }}>
      <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
        {read && (
          <span style={{ fontSize: "14px", padding: "4px 10px", borderRadius: "6px", background: readColor.bg, color: readColor.text, fontWeight: 700 }}>
            Read: {read}
          </span>
        )}
        <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "var(--badge-neutral-bg)", color: "var(--badge-neutral-text)", fontWeight: 500 }}>
          Profile: {profile ?? "—"}
        </span>
        <span style={{ fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "var(--badge-neutral-bg)", color: "var(--badge-neutral-text)", fontWeight: 500 }}>
          Signal: {signal ?? "—"}
        </span>
      </div>
      <p style={{ fontSize: "12px", color: "var(--text-muted)", margin: 0, maxWidth: "420px", textAlign: "right" }}>
        {explanation}
      </p>
    </div>
  );
}

export default function ClawdPanel({ clawdRow, totalProjects, opportunityRank, momentumRank, sustainabilityRank, marketCapRank, walletsRank, ranks = {} }) {
  const [status, setStatus] = useState("loading");
  const [behavioralHistory, setBehavioralHistory] = useState([]);
  const [priceHistory, setPriceHistory] = useState({ prices: [], market_caps: [] });
  const [errorMsg, setErrorMsg] = useState("");
  const [period, setPeriod] = useState(() => loadClawdPeriod());

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
  const sections = filterCompactSections(period);
  const hasBehHistory = behavioralHistory.length > 0;

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: "10px", color: "var(--text)", fontSize: "20px" }}>CLAWD — Health Check</h2>

      <ProfileSignalBanner profile={clawdRow?.["Prof"]} signal={clawdRow?.signal} read={clawdRow?.read} />

      {status === "loading" && <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>Loading history…</p>}
      {status === "error"   && <p style={{ color: "#c0392b", fontSize: "13px" }}>Couldn't load history: {errorMsg}</p>}
      {priceHistory.error   && <p style={{ fontSize: "12px", color: "#c0392b", marginBottom: "8px" }}>Price/market cap history failed to load: {priceHistory.error}</p>}

      {status === "done" && (
        <>
          <SectionLabel>Behavioral</SectionLabel>
          <div className="tw-clawd-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "14px" }}>
            <MetricCard label="Opportunity" sublabel={hasBehHistory ? "Score & 8w trend" : "Live score"} value={clawdRow?.["Opp"]} valueColor="#3B6D11" rank={opportunityRank} totalProjects={totalProjects} data={oppData} labels={weekLabels} color="#3B6D11" />
            <MetricCard label="Momentum" sublabel={hasBehHistory ? "Score & 8w trend" : "Live score"} value={clawdRow?.["Mom"]} valueColor="#185FA5" rank={momentumRank} totalProjects={totalProjects} data={momData} labels={weekLabels} color="#185FA5" />
            <MetricCard label="Sustainability" sublabel={hasBehHistory ? "Score & 8w trend" : "Live score"} value={clawdRow?.["Sus"]} valueColor="#854F0B" rank={sustainabilityRank} totalProjects={totalProjects} data={susData} labels={weekLabels} color="#854F0B" />
          </div>

          <SectionLabel>Market</SectionLabel>
          <div className="tw-clawd-grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "14px" }}>
            <MetricCard label="Wallets" sublabel={hasBehHistory ? "30d active · 8w trend" : "30d active"} value={clawdRow?.["Wallets 30d"]} valueColor="#3a6ea5" rank={walletsRank} totalProjects={totalProjects} data={walletsData} labels={weekLabels} color="#3a6ea5" formatY={(v) => Math.round(v)} />
            <MetricCard label="Market Cap" sublabel="USD · 60d trend" value={clawdRow?.marketCapUsd != null ? formatUsd(clawdRow.marketCapUsd) : "—"} valueColor="#534AB7" rank={marketCapRank} totalProjects={totalProjects} data={mcapThinned.map((p) => p.y)} labels={mcapThinned.map((p) => p.x)} color="#534AB7" formatY={formatUsd} />
            <MetricCard label="Price" sublabel="USD · 60d trend" value={clawdRow?.priceUsd != null ? formatPrice(clawdRow.priceUsd) : "—"} valueColor="#0F6E56" rank={null} totalProjects={totalProjects} data={priceThinned.map((p) => p.y)} labels={priceThinned.map((p) => p.x)} color="#0F6E56" formatY={formatPrice} />
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", marginBottom: "8px" }}>
            <SectionLabel>Full breakdown</SectionLabel>
            <SegmentedControl
              ariaLabel="CLAWD breakdown period"
              value={period}
              onChange={(next) => { saveClawdPeriod(next); setPeriod(next); }}
              options={[
                { value: "24h", label: "24h" },
                { value: "7d", label: "7d" },
                { value: "30d", label: "30d" },
                { value: "all", label: "All" },
              ]}
            />
          </div>
          <div className="tw-clawd-grid-2" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
            {sections.map((section, idx) => (
              <div key={`${section.title}-${idx}`} style={{
                border: "1px solid var(--border)", borderRadius: "8px",
                background: "var(--card-bg)", padding: "10px 16px",
                gridColumn: idx === sections.length - 1 && sections.length % 2 === 1 ? "span 2" : undefined,
              }}>
                <p style={{ fontSize: "13px", fontWeight: 600, margin: "0 0 4px", color: section.color }}>{section.title}</p>
                {section.rows.map((row) => (
                  <CompactRow
                    key={row.key}
                    label={row.label}
                    window={row.window}
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

      {!hasBehHistory && status === "done" && (
        <p style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "14px" }}>
          8w score trends need Dune history query 7767406. Live scores above are from the main scrape; Price/MCap trends are CoinGecko.
        </p>
      )}
      {hasBehHistory && (
        <p style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "14px" }}>
          Behavioral history is a weekly backtest from on-chain activity. Price/Market Cap history is CoinGecko.
        </p>
      )}
    </div>
  );
}