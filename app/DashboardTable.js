"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useAccount, useReadContract } from "wagmi";
import { base } from "wagmi/chains";
import AboutPanel from "./AboutPanel";
import ClawdPanel from "./ClawdPanel";
import WatchlistPanel from "./WatchlistPanel";
import TripwirePanel from "./TripwirePanel";
import ClawdWirePanel from "./ClawdWirePanel";
import StatusBanner from "./StatusBanner";
import WireBanner from "./WireBanner";
import ClawdWireBanner from "./ClawdWireBanner";
import DefSheet from "./DefSheet";
import { DashboardMobileNav, MoreMenu, SNAPSHOT_TABS } from "./MobileTabNav";
import AppearanceToggle from "./AppearanceToggle";
import { isWireTester } from "@/lib/wireAccess";

const SNAPSHOT_TAB_SET = new Set(SNAPSHOT_TABS);


// ── Custom delayed tooltip ────────────────────────────────────────────────────
const HEADER_TOOLTIP_DELAY = 1200;
const RANK_TOOLTIP_DELAY = 350;
const LOWER_IS_BETTER_KEYS = new Set(["Risk %", "Top10 %"]);

/** Competition rank among peers: 1 = best, total = worst. */
function peerRank(colKey, value, peers) {
  if (value == null || value === "" || Number.isNaN(Number(value))) return null;
  const val = Number(value);
  const asc = LOWER_IS_BETTER_KEYS.has(colKey);
  const values = peers
    .map((d) => d[colKey])
    .filter((v) => v != null && v !== "" && !Number.isNaN(Number(v)))
    .map(Number);
  if (values.length === 0) return null;
  const better = values.filter((v) => (asc ? v < val : v > val)).length;
  return { rank: better + 1, total: values.length };
}

function prefersTouchUi() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none), (max-width: 1023px)").matches;
}

function useDelayedTooltip() {
  const [tooltip, setTooltip] = useState(null);
  const timerRef = useRef(null);
  const pinnedRef = useRef(false);

  const show = useCallback((content, e, delay = HEADER_TOOLTIP_DELAY) => {
    clearTimeout(timerRef.current);
    if (!content) return;
    if (pinnedRef.current) return;
    const { clientX, clientY } = e;
    timerRef.current = setTimeout(() => {
      setTooltip({ content, x: clientX, y: clientY });
    }, delay);
  }, []);

  const move = useCallback((e) => {
    if (pinnedRef.current) return;
    setTooltip((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : prev);
  }, []);

  const hide = useCallback(() => {
    if (pinnedRef.current) return;
    clearTimeout(timerRef.current);
    setTooltip(null);
  }, []);

  const toggle = useCallback((content, e) => {
    clearTimeout(timerRef.current);
    if (!content) return;
    const { clientX, clientY } = e;
    setTooltip((prev) => {
      if (prev && pinnedRef.current) {
        pinnedRef.current = false;
        return null;
      }
      pinnedRef.current = true;
      return { content, x: clientX, y: clientY };
    });
  }, []);

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current);
    pinnedRef.current = false;
    setTooltip(null);
  }, []);

  useEffect(() => {
    const onDocPointer = () => {
      if (!pinnedRef.current) return;
      dismiss();
    };
    // Bubble phase: cells that toggle call stopPropagation on pointerdown.
    document.addEventListener("pointerdown", onDocPointer);
    return () => document.removeEventListener("pointerdown", onDocPointer);
  }, [dismiss]);

  return { tooltip, show, move, hide, toggle, dismiss };
}

function touchTooltipHandlers(content, { showTooltip, moveTooltip, hideTooltip, toggleTooltip, delay }) {
  if (!content) return {};
  return {
    onMouseEnter: (e) => showTooltip(content, e, delay),
    onMouseMove: moveTooltip,
    onMouseLeave: hideTooltip,
    onPointerDown: (e) => {
      if (prefersTouchUi()) e.stopPropagation();
    },
    onClick: (e) => {
      if (!prefersTouchUi()) return;
      e.stopPropagation();
      toggleTooltip(content, e);
    },
  };
}

function TooltipBox({ tooltip }) {
  if (!tooltip) return null;
  const { content, x, y } = tooltip;
  const maxW = 280;
  const pad = 12;
  let left = x + 14;
  let top = y + 14;
  if (typeof window !== "undefined") {
    left = Math.min(left, window.innerWidth - maxW - pad);
    left = Math.max(pad, left);
    top = Math.min(top, window.innerHeight - 120);
    top = Math.max(pad, top);
  }
  return (
    <div style={{
      position: "fixed", left, top, maxWidth: `${maxW}px`,
      background: "var(--bg-muted)", border: "1px solid var(--border-strong)",
      borderRadius: "6px", padding: "8px 12px", fontSize: "12px", color: "var(--text)",
      lineHeight: "1.5", zIndex: 9999, pointerEvents: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
    }}>
      {typeof content === "string" ? content : content}
    </div>
  );
}

function MobileTriageBlock({ clawdRow, peerRows, onOpenFullTable, onGoClawd }) {
  const peers = (peerRows || []).slice(0, 5);
  return (
    <div
      className="tw-mobile-triage"
      style={{
        marginBottom: "14px",
        padding: "14px",
        borderRadius: "10px",
        border: "1px solid var(--border)",
        background: "var(--card-bg)",
      }}
    >
      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "10px" }}>
        Triage
      </div>
      {clawdRow ? (
        <div
          style={{
            padding: "12px",
            borderRadius: "8px",
            background: "var(--clawd-row-bg)",
            borderLeft: "3px solid var(--clawd-row-border)",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "6px" }}>
            <strong style={{ fontSize: "16px", color: "var(--text)" }}>CLAWD</strong>
            {clawdRow.read ? <ReadBadge value={clawdRow.read} /> : null}
            <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>{clawdRow.signal || "—"}</span>
          </div>
          <div style={{ fontSize: "13px", color: "var(--text-muted)", lineHeight: 1.45 }}>
            {clawdRow.signalNote
              || (clawdRow.Prof ? `${clawdRow.Prof} · Opp ${formatValue(clawdRow.Opp, "dec1")}` : `Opp ${formatValue(clawdRow.Opp, "dec1")}`)}
          </div>
          <button
            type="button"
            onClick={onGoClawd}
            style={{
              marginTop: "10px",
              padding: "8px 12px",
              borderRadius: "6px",
              border: "1px solid var(--btn-active-bg)",
              background: "var(--btn-active-bg)",
              color: "var(--btn-active-text)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            CLAWD health check
          </button>
        </div>
      ) : (
        <p style={{ fontSize: "13px", color: "var(--text-muted)", marginBottom: "12px" }}>CLAWD row not in this snapshot.</p>
      )}
      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "6px" }}>
        Top Opportunity peers
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {peers.map((p) => (
          <div
            key={p.Address || p.Project}
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "8px",
              fontSize: "13px",
              padding: "6px 0",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span style={{ color: "var(--text)", fontWeight: 600 }}>{p.Project}</span>
            <span style={{ color: "var(--text-muted)", whiteSpace: "nowrap" }}>
              Opp {formatValue(p.Opp, "dec1")}
              {p.read ? ` · ${p.read}` : ""}
            </span>
          </div>
        ))}
        {peers.length === 0 && (
          <span style={{ fontSize: "12px", color: "var(--text-faint)" }}>No peer scores yet.</span>
        )}
      </div>
      <button
        type="button"
        onClick={onOpenFullTable}
        style={{
          marginTop: "12px",
          width: "100%",
          padding: "10px 12px",
          borderRadius: "6px",
          border: "1px solid var(--border)",
          background: "var(--bg-subtle)",
          color: "var(--text)",
          fontSize: "13px",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Open full Overview table
      </button>
    </div>
  );
}

// ── Pin state helpers ─────────────────────────────────────────────────────────
function loadPins() {
  try { return JSON.parse(localStorage.getItem("zdash-pins") || "[]"); }
  catch { return []; }
}
function savePins(pins) {
  try { localStorage.setItem("zdash-pins", JSON.stringify(pins)); }
  catch {}
}
function isNarrowViewport() {
  try {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 1023px)").matches;
  } catch {
    return false;
  }
}
function loadCompact() {
  try {
    // Mobile: comfort/readable by default; Compact is opt-in (separate key).
    // Desktop: Compact ON by default (drives 0.85 zoom via comfort-view).
    if (isNarrowViewport()) {
      const v = localStorage.getItem("zdash-compact-mobile");
      if (v === null) return false;
      return v === "1";
    }
    const v = localStorage.getItem("zdash-compact");
    if (v === null) return true;
    return v === "1";
  } catch {
    return !isNarrowViewport();
  }
}
function saveCompact(on) {
  try {
    if (isNarrowViewport()) localStorage.setItem("zdash-compact-mobile", on ? "1" : "0");
    else localStorage.setItem("zdash-compact", on ? "1" : "0");
  } catch {}
}
/** Has the user actually chosen a density, or are they still on the default? */
function hasCompactPreference() {
  try {
    const key = isNarrowViewport() ? "zdash-compact-mobile" : "zdash-compact";
    return localStorage.getItem(key) !== null;
  } catch {
    return false;
  }
}

/**
 * Activity, Wallets, Buyers and Growth were four tabs over one table — same
 * rows, same period toggle, same Project + Market Cap lead, differing only in
 * which handful of columns showed. Four thin tabs cannot have a hierarchy; one
 * tab with a family switch can, and nothing about the data changes.
 */
const FLOW_FAMILIES = [
  { key: "Money",   source: "Activity", label: "Money",   hint: "volume, transactions, size" },
  { key: "Wallets", source: "Wallets",  label: "Wallets", hint: "new vs returning" },
  { key: "Traders", source: "Buyers",   label: "Traders", hint: "buyers, sellers, first-timers" },
  { key: "Growth",  source: "Growth",   label: "Growth",  hint: "week over week" },
];
const FLOW_SOURCE = Object.fromEntries(FLOW_FAMILIES.map((f) => [f.key, f.source]));
/** Old links and bookmarks must keep working. */
const LEGACY_TAB_TO_FLOW = { Activity: "Money", Wallets: "Wallets", Buyers: "Traders", Growth: "Growth" };

/** Flow borrows whichever family's columns are showing; every other tab is itself. */
function columnSourceFor(tab, family) {
  return tab === "Flow" ? FLOW_SOURCE[family] || "Activity" : tab;
}

function loadFlowFamily() {
  try {
    const v = localStorage.getItem("zdash-flow-family");
    return FLOW_SOURCE[v] ? v : "Money";
  } catch {
    return "Money";
  }
}

const PERIOD_TABS = new Set(["Flow"]);
const PERIOD_ALWAYS = new Set([null, undefined, "live"]); // Project (no window) + Market Cap
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

function loadWhalesView() {
  try {
    const v = localStorage.getItem("zdash-whales-view");
    if (v === "flow" || v === "context") return v;
  } catch {}
  return "flow";
}

function saveWhalesView(view) {
  try { localStorage.setItem("zdash-whales-view", view); } catch {}
}

function flowPeriod(period) {
  return period === "24h" ? "24h" : "7d";
}

function filterColumnsForView(cols, { activeTab, period, whalesView }) {
  if (!cols?.length) return cols || [];
  if (PERIOD_TABS.has(activeTab)) {
    return cols.filter((c) => {
      if (c.key === "Project" || c.key === "name") return true;
      if (PERIOD_ALWAYS.has(c.window)) return true;
      return c.window === period;
    });
  }
  if (activeTab === "Whales & Risk") {
    return cols.filter((c) => {
      if (c.key === "Project") return true;
      if (c.window === "live") return true;
      if (whalesView === "flow") return c.window === flowPeriod(period);
      // Context: threshold, 30d concentration, scores, age (no window)
      return c.window === "30d thr" || c.window === "30d" || c.window === "score" || !c.window;
    });
  }
  return cols;
}

function SegmentedControl({ options, value, onChange, ariaLabel }) {
  return (
    <div
      className="tw-segmented"
      role="group"
      aria-label={ariaLabel}
      style={{ display: "inline-flex", borderRadius: "6px", border: "1px solid var(--btn-inactive-border)", overflow: "hidden", flexShrink: 0 }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              padding: "5px 12px",
              border: "none",
              borderRight: opt === options[options.length - 1] ? "none" : "1px solid var(--btn-inactive-border)",
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

const TAB_ORDER = ["Overview", "Flow", "Whales & Risk", "Watchlist", "Discover", "CLAWD", "ClawdWire", "The Wire", "About"];

const GATE_ADDRESS = "0xc22B7b983EC81523c969753c2385106835E8CfCE";
const GATE_ABI = [
  {
    name: "hasAccess",
    type: "function",
    inputs: [
      { name: "wallet", type: "address" },
      { name: "tier", type: "uint8" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "view",
  },
];

const FREE_ROW_COUNT = 5;

/** Shared window tokens — never tooltip-only; rendered under every column header. */
const WINDOW_ORDER = ["24h", "7d", "30d", "30d thr", "WoW", "live", "score"];

function tabWindowLegend(columns) {
  if (!columns?.length) return null;
  const present = new Set(columns.map((c) => c.window).filter(Boolean));
  const parts = WINDOW_ORDER.filter((w) => present.has(w));
  if (!parts.length) return null;
  return `Windows on this tab: ${parts.join(" · ")}`;
}

function ColumnHeaderLabel({ col, sortKey, sortDir }) {
  const arrow = sortKey === col.key ? (sortDir === "desc" ? " \u25BC" : " \u25B2") : "";
  return (
    <span style={{ display: "inline-flex", flexDirection: "column", alignItems: "flex-start", gap: "1px", lineHeight: 1.15 }}>
      <span>{col.label}{arrow}</span>
      {col.window ? (
        <span style={{ fontSize: "10px", fontWeight: 500, color: "var(--text-faint)", letterSpacing: "0.02em" }}>
          {col.window}
        </span>
      ) : null}
    </span>
  );
}

const TABS = {
  Overview: [
    { key: "Project",      label: "Project",      type: "string" },
    { key: "read",         label: "Read",         type: "string", window: "score", tooltip: "The named verdict for this token's Profile + Signal combination" },
    { key: "Opp",          label: "Opp",          type: "number", format: "dec1", window: "score", tooltip: "How attractive this token looks overall — a blend of momentum, retention, quality, and risk" },
    { key: "Mom",          label: "Mom",          type: "number", format: "dec1", window: "score", tooltip: "How fast this token is growing right now across wallets, transactions, and volume" },
    { key: "Sus",          label: "Sus",          type: "number", format: "dec1", window: "score", tooltip: "How sticky the growth is — whether users keep coming back, not just showing up once" },
    { key: "Prof",         label: "Prof",         type: "string", window: "score", tooltip: "Whether this token scores above or below average on both momentum and sustainability" },
    { key: "priceUsd",     label: "Price",        type: "number", format: "price", window: "live", tooltip: "Live token price in USD from CoinGecko (* = via DexScreener for tokens CoinGecko doesn’t track)" },
    { key: "marketCapUsd", label: "Market Cap",   type: "number", format: "usd", window: "live", tooltip: "Live market cap in USD from CoinGecko (* = via DexScreener for tokens CoinGecko doesn’t track)" },
    { key: "signal",       label: "Signal",       type: "string", window: "WoW", tooltip: "Whether price and volume are moving in the same direction (this week vs prior)" },
    { key: "signalScore",  label: "Signal Score", type: "number", format: "dec1", window: "WoW", tooltip: "A single number combining price change and volume growth — positive means both are moving up" },
  ],
  // Twins only — period toggle filters by window (24h | 7d | 30d)
  Activity: [
    { key: "Project",      label: "Project",    type: "string" },
    { key: "marketCapUsd", label: "Market Cap", type: "number", format: "usd", window: "live", tooltip: "Live market cap in USD from CoinGecko (* = via DexScreener for tokens CoinGecko doesn’t track)" },
    { key: "Vol 30d",      label: "Vol",        type: "number", format: "usd", window: "30d", tooltip: "Total dollar value traded on DEX in the last 30 days" },
    { key: "Vol/Tx",       label: "Vol/Tx",     type: "number", format: "dec2", window: "30d", tooltip: "Average dollar value per transaction over the last 30 days" },
    { key: "Vol/Wlt",      label: "Vol/Wlt",    type: "number", format: "dec2", window: "30d", tooltip: "Average dollar volume per unique wallet over the last 30 days" },
    { key: "Txs 30d",      label: "Txs",        type: "number", format: "int", window: "30d", tooltip: "Total number of on-chain transactions in the last 30 days" },
    { key: "Txs/User",     label: "Txs/User",   type: "number", format: "dec1", window: "30d", tooltip: "Average number of transactions per wallet in the last 30 days" },
    { key: "Vol 7d",       label: "Vol",        type: "number", format: "usd", window: "7d", tooltip: "Total dollar value traded on DEX in the last 7 days" },
    { key: "Vol/Tx 7d",    label: "Vol/Tx",     type: "number", format: "dec2", window: "7d", tooltip: "Average dollar value per transaction over the last 7 days" },
    { key: "Vol/Wlt 7d",   label: "Vol/Wlt",    type: "number", format: "dec2", window: "7d", tooltip: "Average dollar volume per unique wallet over the last 7 days" },
    { key: "Txs 7d",       label: "Txs",        type: "number", format: "int", window: "7d", tooltip: "Total number of on-chain transactions in the last 7 days" },
    { key: "Txs/User 7d",  label: "Txs/User",   type: "number", format: "dec1", window: "7d", tooltip: "Average number of transactions per wallet in the last 7 days" },
    { key: "Vol 24h",      label: "Vol",        type: "number", format: "usd", window: "24h", tooltip: "Total dollar value traded on DEX in the last 24 hours" },
    { key: "Vol/Tx 24h",   label: "Vol/Tx",     type: "number", format: "dec2", window: "24h", tooltip: "Average dollar value per transaction over the last 24 hours" },
    { key: "Vol/Wlt 24h",  label: "Vol/Wlt",    type: "number", format: "dec2", window: "24h", tooltip: "Average dollar volume per unique wallet over the last 24 hours" },
    { key: "Txs 24h",      label: "Txs",        type: "number", format: "int", window: "24h", tooltip: "Total number of on-chain transactions in the last 24 hours" },
    { key: "Txs/User 24h", label: "Txs/User",   type: "number", format: "dec1", window: "24h", tooltip: "Average number of transactions per wallet in the last 24 hours" },
  ],
  // Twins + 30d-only new/returning; Avg Txs Ret is 7d-only (WoW cohort depth)
  Wallets: [
    { key: "Project",           label: "Project",        type: "string" },
    { key: "marketCapUsd",      label: "Market Cap",     type: "number", format: "usd", window: "live", tooltip: "Live market cap in USD from CoinGecko (* = via DexScreener for tokens CoinGecko doesn’t track)" },
    { key: "Wallets 30d",       label: "Wallets",        type: "number", format: "int", window: "30d", tooltip: "Unique wallets that interacted with this token in the last 30 days" },
    { key: "New Wallets",       label: "New Wallets",    type: "number", format: "int", window: "30d", tooltip: "Wallets active in the last 30 days with no activity in the prior 31–90 day window" },
    { key: "Returning Wallets", label: "Returning",      type: "number", format: "int", window: "30d", tooltip: "Wallets active in both the last 30 days and the prior 31–90 day window" },
    { key: "New %",             label: "New Wallet %",   type: "number", format: "pct1", window: "30d", tooltip: "New Wallets ÷ total Wallets 30d" },
    { key: "Wallets 7d",        label: "Wallets",        type: "number", format: "int", window: "7d", tooltip: "Unique wallets that interacted in the last 7 days" },
    { key: "Avg Txs Ret",       label: "Avg Txs Ret",    type: "number", format: "dec1", window: "7d", tooltip: "Average transactions by wallets active both this week and last week" },
    { key: "Wallets 24h",       label: "Wallets",        type: "number", format: "int", window: "24h", tooltip: "Unique wallets that interacted in the last 24 hours" },
  ],
  // Twins — Buy/Sell Ratio & Buy Vol % exist for 7d and 24h; Traders is 30d-only
  Buyers: [
    { key: "Project",         label: "Project",         type: "string" },
    { key: "marketCapUsd",    label: "Market Cap",      type: "number", format: "usd", window: "live", tooltip: "Live market cap in USD from CoinGecko (* = via DexScreener for tokens CoinGecko doesn\u2019t track)" },
    { key: "Traders",         label: "Traders",         type: "number", format: "int", window: "30d", tooltip: "Unique wallets that bought or sold on DEX in the last 30 days" },
    { key: "Buyers 30d",      label: "Buyers",          type: "number", format: "int", window: "30d", tooltip: "Unique wallets that bought in the last 30 days" },
    { key: "1st Buyers 30d",  label: "1st Buyers",      type: "number", format: "int", window: "30d", tooltip: "Wallets buying this token for the very first time in the last 30 days" },
    { key: "1st Sellers 30d", label: "1st Sellers",     type: "number", format: "int", window: "30d", tooltip: "Wallets selling this token for the very first time in the last 30 days" },
    { key: "Buyers 7d",       label: "Buyers",          type: "number", format: "int", window: "7d", tooltip: "Unique wallets that bought in the last 7 days" },
    { key: "1st Buyers 7d",   label: "1st Buyers",      type: "number", format: "int", window: "7d", tooltip: "Wallets buying for the first time in the last 7 days" },
    { key: "1st Sellers 7d",  label: "1st Sellers",     type: "number", format: "int", window: "7d", tooltip: "Wallets selling for the first time in the last 7 days" },
    { key: "Buy/Sell Ratio",  label: "Buy/Sell Ratio",  type: "number", format: "dec2", window: "7d", tooltip: "Buyers 7d \u00f7 all unique sellers this week \u2014 above 1.0 means more wallets buying than selling" },
    { key: "Buy Vol %",       label: "Buy Vol %",       type: "number", format: "pct1", window: "7d", tooltip: "Buys as a share of 7-day DOLLAR volume \u2014 the money-weighted complement to Buy/Sell Ratio (which counts wallets). High ratio + low Buy Vol % = many small wallets buying while a few big ones sell into them" },
    { key: "Buyers 24h",      label: "Buyers",          type: "number", format: "int", window: "24h", tooltip: "Unique wallets that bought in the last 24 hours" },
    { key: "1st Buyers 24h",  label: "1st Buyers",      type: "number", format: "int", window: "24h", tooltip: "Wallets buying for the first time in the last 24 hours" },
    { key: "1st Sellers 24h", label: "1st Sellers",     type: "number", format: "int", window: "24h", tooltip: "Wallets selling for the first time in the last 24 hours" },
    { key: "Buy/Sell Ratio 24h", label: "Buy/Sell Ratio", type: "number", format: "dec2", window: "24h", tooltip: "Buyers 24h \u00f7 unique sellers in the last 24 hours \u2014 above 1.0 means more wallets buying than selling" },
    { key: "Buy Vol % 24h",   label: "Buy Vol %",       type: "number", format: "pct1", window: "24h", tooltip: "Buys as a share of 24h DOLLAR volume \u2014 money-weighted complement to Buy/Sell Ratio" },
  ],
  // WoW-only — not period-toggleable (always this week vs prior week)
  Growth: [
    { key: "Project",      label: "Project",      type: "string" },
    { key: "marketCapUsd", label: "Market Cap",   type: "number", format: "usd", window: "live", tooltip: "Live market cap in USD from CoinGecko (* = via DexScreener for tokens CoinGecko doesn’t track)" },
    { key: "Vol Grw %",    label: "Vol Grw %",    type: "number", format: "pct1", window: "WoW", tooltip: "DEX volume change: most recent 7 days vs the 7 days before that" },
    { key: "Tx Grw %",     label: "Tx Grw %",     type: "number", format: "pct1", window: "WoW", tooltip: "Transaction count change: most recent 7 days vs the 7 days before that" },
    { key: "User Grw %",   label: "User Grw %",   type: "number", format: "pct1", window: "WoW", tooltip: "Unique wallet count change: most recent 7 days vs the 7 days before that" },
    { key: "Retention %",  label: "Retention %",  type: "number", format: "pct1", window: "WoW", tooltip: "Wallets retained from last week ÷ this week's active wallets" },
    { key: "signal",       label: "Signal",       type: "string", window: "WoW", tooltip: "Whether price and volume are moving in the same direction (this week vs prior)" },
    { key: "signalScore",  label: "Signal Score", type: "number", format: "dec1", window: "WoW", tooltip: "A single number combining price change and volume growth — positive means both are moving up" },
  ],
  // Flow = 24h|7d period; Context = 30d thr / 30d / score / age
  "Whales & Risk": [
    { key: "Project",           label: "Project",         type: "string" },
    { key: "marketCapUsd",      label: "Market Cap",      type: "number", format: "usd", window: "live", tooltip: "Live market cap in USD from CoinGecko (* = via DexScreener for tokens CoinGecko doesn\u2019t track)" },
    { key: "Whale Net 7d",      label: "Whale Net",       type: "number", format: "usd", window: "7d", tooltip: "Net USD flow from large trades in the last 7 days \u2014 positive means whales are accumulating, negative means distributing. A whale trade is one in the top 10% of trade sizes for that token (min $100)" },
    { key: "Accum %",           label: "Accum %",         type: "number", format: "pct1", window: "7d", tooltip: "Whale buys as a share of all whale volume (7d) \u2014 50% is neutral, above ~65% suggests accumulation, below ~35% suggests distribution" },
    { key: "Whale Buyers 7d",   label: "Whale Buyers",    type: "number", format: "int", window: "7d", tooltip: "Distinct wallets making top-decile-sized buys in the last 7 days \u2014 distinguishes one whale accumulating from many" },
    { key: "Whale Sellers 7d",  label: "Whale Sellers",   type: "number", format: "int", window: "7d", tooltip: "Distinct wallets making top-decile-sized sells in the last 7 days" },
    { key: "Hump Net 7d",       label: "Humpback Net",    type: "number", format: "usd", window: "7d", tooltip: "Net USD flow from mega-whale (humpback) trades in the last 7 days \u2014 trades in the top 1% of sizes for that token (min $1,000). Humpback trades are a subset of whale trades" },
    { key: "Hump Buyers 7d",    label: "Humpback Buyers", type: "number", format: "int", window: "7d", tooltip: "Distinct wallets making top-1%-sized buys in the last 7 days \u2014 usually a handful of very large players" },
    { key: "Hump Sellers 7d",   label: "Humpback Sellers",type: "number", format: "int", window: "7d", tooltip: "Distinct wallets making top-1%-sized sells in the last 7 days" },
    { key: "Retail Net 7d",     label: "Retail Net",      type: "number", format: "usd", window: "7d", tooltip: "Net USD flow from all NON-whale trades in the last 7 days. Compare against Whale Net: whales buying while retail sells = accumulation from weak hands; whales selling into retail buying = distribution" },
    { key: "Whale Vol %",       label: "Whale Vol %",     type: "number", format: "pct1", window: "7d", tooltip: "Whale trades as a share of all 7-day volume \u2014 how much of the market whale flow represents. At 80%+ the retail column is thin and divergence reads are weak; around 30% a whale/retail split can mean two real crowds disagreeing" },
    { key: "Divergence Bps",    label: "W/R Div (bps)",   type: "number", format: "dec1", window: "7d", tooltip: "Whale-vs-retail divergence in basis points of market cap. Positive = whales net buying more aggressively than retail (bullish divergence). Negative = retail buying more than whales (bearish \u2014 potential exit liquidity pattern). Near zero = both sides agree. Scaled by market cap so a $50k microcap and $500M large-cap are directly comparable" },
    { key: "Whale Net 24h",     label: "Whale Net",       type: "number", format: "usd", window: "24h", tooltip: "Net USD flow from large trades in the last 24 hours \u2014 positive means whales are accumulating, negative means distributing" },
    { key: "Accum % 24h",       label: "Accum %",         type: "number", format: "pct1", window: "24h", tooltip: "Whale buys as a share of all whale volume (24h) \u2014 50% is neutral" },
    { key: "Whale Buyers 24h",  label: "Whale Buyers",    type: "number", format: "int", window: "24h", tooltip: "Distinct wallets making top-decile-sized buys in the last 24 hours" },
    { key: "Whale Sellers 24h", label: "Whale Sellers",   type: "number", format: "int", window: "24h", tooltip: "Distinct wallets making top-decile-sized sells in the last 24 hours" },
    { key: "Hump Net 24h",      label: "Humpback Net",    type: "number", format: "usd", window: "24h", tooltip: "Net USD flow from mega-whale (humpback) trades in the last 24 hours" },
    { key: "Hump Buyers 24h",   label: "Humpback Buyers", type: "number", format: "int", window: "24h", tooltip: "Distinct wallets making top-1%-sized buys in the last 24 hours" },
    { key: "Hump Sellers 24h",  label: "Humpback Sellers",type: "number", format: "int", window: "24h", tooltip: "Distinct wallets making top-1%-sized sells in the last 24 hours" },
    { key: "Retail Net 24h",    label: "Retail Net",      type: "number", format: "usd", window: "24h", tooltip: "Net USD flow from all NON-whale trades in the last 24 hours" },
    { key: "Whale Vol % 24h",   label: "Whale Vol %",     type: "number", format: "pct1", window: "24h", tooltip: "Whale trades as a share of all 24h volume" },
    { key: "Divergence Bps 24h", label: "W/R Div (bps)",  type: "number", format: "dec1", window: "24h", tooltip: "Whale-vs-retail divergence in basis points of market cap over 24h" },
    { key: "Whale Min $",       label: "Whale Min $",     type: "number", format: "usd", window: "30d thr", tooltip: "The whale threshold for THIS token \u2014 the top-10% trade size over 30d (min $100). What counts as a whale trade scales with each token's own market: might be $800 on a microcap, $50k on a major" },
    { key: "Hump Min $",        label: "Hump Min $",      type: "number", format: "usd", window: "30d thr", tooltip: "The humpback / mega-trade threshold for THIS token \u2014 top-1% trade size over 30d, floored at $1,000. If this shows $1,000, the token is sitting on the floor (true p99 is at or below $1k). If higher, that is the live top-1% bar." },
    { key: "Top10 %",           label: "Top10 %",         type: "number", format: "pct1", window: "30d", tooltip: "Share of all 30-day transactions from the top 10 most active wallets \u2014 lower is healthier" },
    { key: "Non-Trade New 30d", label: "Non-Trade New",   type: "number", format: "int", window: "30d", tooltip: "New wallets in the last 30 days that made no first buy or sell" },
    { key: "Qlty %",            label: "Qlty %",          type: "number", format: "pct1", window: "score", tooltip: "How clean the activity looks \u2014 penalizes bot-like patterns, extreme concentration, and unrealistic retention" },
    { key: "Risk %",            label: "Risk %",          type: "number", format: "pct1", window: "score", tooltip: "How concentrated the volume is in a few wallets \u2014 higher means more concentrated" },
    { key: "Token Age Days",    label: "Age (days)",      type: "number", format: "int", tooltip: "Days since this token's contract was first deployed on Base" },
  ],
  Discover: [
    { key: "name",         label: "Project",    type: "string" },
    { key: "symbol",       label: "Symbol",     type: "string" },
    { key: "marketCapUsd", label: "Market Cap", type: "number", format: "usd", window: "live", tooltip: "Live market cap in USD from CoinGecko (* = via DexScreener for tokens CoinGecko doesn’t track)" },
    { key: "priceUsd",     label: "Price",      type: "number", format: "price", window: "live", tooltip: "Live token price in USD from CoinGecko (* = via DexScreener for tokens CoinGecko doesn’t track)" },
    { key: "address",      label: "Address",    type: "string" },
  ],
};

// Two groups, horizontal, always visible
const TYPE_FILTERS = [
  { label: "Agents",     key: "agents",     match: (tag) => (tag && tag.startsWith("agent-")) || tag === "clanker-via-bankrbot-prefork" },
  { label: "Non-Agents", key: "non-agents", match: (tag) => tag && (tag.startsWith("non-agent-") || tag === "neither") },
];

const PLATFORM_FILTERS = [
  { label: "Virtuals",         key: "virtuals", match: (tag) => tag === "agent-via-virtuals" || tag === "non-agent-via-virtuals" },
  { label: "Clanker",          key: "clanker",  match: (tag) => tag === "agent-via-clanker" || tag === "non-agent-via-clanker" },
  { label: "Bankr",            key: "bankr",    match: (tag) => tag === "agent-via-bankr" || tag === "non-agent-via-bankr" },
  { label: "Bankr (pre-fork)", key: "prefork",  match: (tag) => tag === "clanker-via-bankrbot-prefork" },
  { label: "Other",            key: "other",    match: (tag) => tag === "agent-independent" || tag === "non-agent-infrastructure" || tag === "neither" },
];

const ALL_FILTER_DEFS = [...TYPE_FILTERS, ...PLATFORM_FILTERS];

const READ_TIERS = {
  Beacon: "teal", "Low Hum": "teal", Undercurrent: "teal", "Quiet Beacon": "teal",
  Flare: "amber", "Low Signal": "amber", "Soft Ping": "amber", Afterglow: "amber", Standby: "amber", Mirage: "amber",
  Backdraft: "coral", Flashpoint: "coral", Overshoot: "coral", Bleed: "coral", "False Flare": "coral", Flatline: "coral",
};

const READ_TIER_COLORS = {
  teal:  { bg: "var(--read-teal-bg)",  text: "var(--read-teal-text)" },
  amber: { bg: "var(--read-amber-bg)", text: "var(--read-amber-text)" },
  coral: { bg: "var(--read-coral-bg)", text: "var(--read-coral-text)" },
};

function ReadBadge({ value }) {
  if (!value) return "—";
  const tier = READ_TIERS[value] || "amber";
  const colors = READ_TIER_COLORS[tier];
  return (
    <span style={{
      display: "inline-block", fontSize: "12px", fontWeight: 600,
      padding: "2px 8px", borderRadius: "6px",
      background: colors.bg, color: colors.text, whiteSpace: "nowrap",
    }}>
      {value}
    </span>
  );
}

function GatedCell({ blurred, children }) {
  if (!blurred) return children;
  return <span style={{ filter: "blur(6px)", userSelect: "none", display: "inline-block" }}>{children}</span>;
}

function GatedSection({ blurred, children }) {
  if (!blurred) return children;
  return (
    <div style={{ position: "relative" }}>
      <div style={{ filter: "blur(8px)", pointerEvents: "none", userSelect: "none" }}>{children}</div>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{
          fontSize: "14px", fontWeight: 600, color: "var(--text)", background: "var(--bg)",
          padding: "12px 20px", borderRadius: "8px", border: "1px solid var(--border)",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}>
          🔒 Connect a wallet holding 10M+ CLAWD to unlock
        </p>
      </div>
    </div>
  );
}

function formatValue(val, format) {
  if (val == null || val === "") return "—";
  // String columns (Project, Signal, Prof, …) have no numeric format — pass through.
  if (!format) return val;
  const n = Number(val);
  if (Number.isNaN(n)) return "—";
  if (format === "price") return `$${n.toPrecision(4)}`;
  if (format === "usd") return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (format === "usdSign") {
    const abs = Math.abs(Math.round(n)).toLocaleString();
    return `${n < 0 ? "\u2212" : "+"}$${abs}`;
  }
  if (format === "pct1") return `${n.toFixed(1)}%`;
  if (format === "int") return Math.round(n).toLocaleString();
  if (format === "dec1") return n.toFixed(1);
  if (format === "dec2") return n.toFixed(2);
  return val;
}

const HYBRID_TABS = new Set(["Overview", "Whales & Risk"]);

function MobileSummaryList({
  rows,
  pinnedRows,
  tab,
  period,
  hasAccess,
  watchedAddresses,
  pinnedKeys,
  rowKeyField,
  onToggleWatch,
  onTogglePin,
}) {
  const isWhales = tab === "Whales & Risk";
  const whaleWin = flowPeriod(period);
  const whaleNetKey = whaleWin === "24h" ? "Whale Net 24h" : "Whale Net 7d";
  const accumKey = whaleWin === "24h" ? "Accum % 24h" : "Accum %";
  const retailKey = whaleWin === "24h" ? "Retail Net 24h" : "Retail Net 7d";
  const whaleVolKey = whaleWin === "24h" ? "Whale Vol % 24h" : "Whale Vol %";

  return (
    <div className="tw-summary-only" style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
      {rows.length === 0 && (
        <p style={{ color: "var(--text-muted)", padding: "16px 0" }}>No data.</p>
      )}
      {rows.map((d, idx) => {
        const isPinned = pinnedKeys.includes(d[rowKeyField]);
        const unpinnedIdx = idx - pinnedRows.length;
        const isRowGated = !isPinned && unpinnedIdx >= FREE_ROW_COUNT && !hasAccess;
        const isClawd = d["Project"] === "CLAWD";
        const isWatched = watchedAddresses.includes((d["Address"] || "").toLowerCase());

        return (
          <div
            key={d[rowKeyField]}
            style={{
              border: "1px solid var(--border)",
              borderRadius: "8px",
              padding: "12px 14px",
              background: isClawd ? "var(--clawd-row-bg)" : "var(--card-bg)",
              borderLeft: isClawd ? "3px solid var(--clawd-row-border)" : undefined,
              opacity: isRowGated ? 0.85 : 1,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
              <button
                type="button"
                className="tw-icon-btn"
                onClick={() => onToggleWatch(d["Address"])}
                title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
                style={{
                  background: "none", border: "none", cursor: "pointer", fontSize: "14px",
                  lineHeight: 1, padding: "0 2px",
                  color: isWatched ? "#f5c518" : "var(--text-faint)",
                }}
              >
                ⭐
              </button>
              <button
                type="button"
                className="tw-icon-btn"
                onClick={() => onTogglePin(d[rowKeyField])}
                title={isPinned ? "Unpin" : "Pin to top"}
                style={{
                  background: "none", border: "none", cursor: "pointer", fontSize: "14px",
                  lineHeight: 1, padding: "0 2px",
                  color: isPinned ? "var(--btn-active-bg)" : "var(--text-faint)",
                }}
              >
                📍
              </button>
              <span style={{ fontWeight: 700, fontSize: "15px", color: "var(--text)", flex: 1 }}>
                <GatedCell blurred={isRowGated}>{d["Project"] ?? "—"}</GatedCell>
              </span>
              {d.read ? <GatedCell blurred={isRowGated}><ReadBadge value={d.read} /></GatedCell> : null}
            </div>
            <GatedCell blurred={isRowGated}>
              {isWhales ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px", fontSize: "12px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Whale Net <span style={{ color: "var(--text-faint)" }}>{whaleWin}</span> <strong style={{ color: "var(--text)" }}>{formatValue(d[whaleNetKey], "usdSign")}</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>Accum <span style={{ color: "var(--text-faint)" }}>{whaleWin}</span> <strong style={{ color: "var(--text)" }}>{formatValue(d[accumKey], "pct1")}</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>Retail <span style={{ color: "var(--text-faint)" }}>{whaleWin}</span> <strong style={{ color: "var(--text)" }}>{formatValue(d[retailKey], "usdSign")}</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>Whale Vol <span style={{ color: "var(--text-faint)" }}>{whaleWin}</span> <strong style={{ color: "var(--text)" }}>{formatValue(d[whaleVolKey], "pct1")}</strong></span>
                  <span style={{ color: "var(--text-muted)", gridColumn: "1 / -1" }}>
                    Signal <strong style={{ color: "var(--text)" }}>{d.signal ?? "—"}</strong>
                    {d.signalNote ? ` · ${d.signalNote}` : ""}
                  </span>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "6px 12px", fontSize: "12px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Opp <strong style={{ color: "var(--text)" }}>{formatValue(d["Opp"], "dec1")}</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>Mom <strong style={{ color: "var(--text)" }}>{formatValue(d["Mom"], "dec1")}</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>Sus <strong style={{ color: "var(--text)" }}>{formatValue(d["Sus"], "dec1")}</strong></span>
                  <span style={{ color: "var(--text-muted)", gridColumn: "1 / -1" }}>
                    {d.Prof ?? "—"} · {d.signal ?? "—"}
                    {d.signalNote ? ` · ${d.signalNote}` : ""}
                  </span>
                </div>
              )}
            </GatedCell>
          </div>
        );
      })}
    </div>
  );
}

function SummaryBar({ data }) {
  const arr = Array.isArray(data) ? data : [];
  const total = arr.length;
  const breakouts = arr.filter((d) => d["Prof"] === "Breakout").length;
  const oppValues = arr.map((d) => d["Opp"]).filter((v) => v != null && !Number.isNaN(Number(v)));
  const avgOpp = oppValues.length > 0 ? (oppValues.reduce((a, b) => a + Number(b), 0) / oppValues.length).toFixed(1) : "—";
  const momValues = arr.map((d) => d["Mom"]).filter((v) => v != null && !Number.isNaN(Number(v)));
  const avgMom = momValues.length > 0 ? (momValues.reduce((a, b) => a + Number(b), 0) / momValues.length).toFixed(1) : "—";
  const susValues = arr.map((d) => d["Sus"]).filter((v) => v != null && !Number.isNaN(Number(v)));
  const avgSus = susValues.length > 0 ? (susValues.reduce((a, b) => a + Number(b), 0) / susValues.length).toFixed(1) : "—";
  const withPrice = arr.filter((d) => d["priceUsd"] != null).length;

  const pill = (label, value) => (
    <span key={label} style={{
      display: "inline-flex", alignItems: "center", gap: "6px",
      background: "var(--bg-muted)", border: "1px solid var(--border)",
      borderRadius: "6px", padding: "5px 12px", fontSize: "13px", color: "var(--text)",
    }}>
      <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>{label}</span>
      <span style={{ fontWeight: 700, color: "var(--pill-value)" }}>{value}</span>
    </span>
  );

  return (
    <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "12px" }}>
      {pill("Projects tracked", total)}
      {pill("Breakout", breakouts)}
      {pill("Avg Opp Score", avgOpp)}
      {pill("Avg Mom Score", avgMom)}
      {pill("Avg Sus Score", avgSus)}
      {pill("Price data", withPrice)}
    </div>
  );
}

function FilterBar({ activeFilters, onToggle, onClear }) {
  const hasActive = activeFilters.size > 0;

  const pill = (f) => {
    const isActive = activeFilters.has(f.key);
    return (
      <button
        key={f.key}
        onClick={() => onToggle(f.key)}
        style={{
          padding: "3px 9px", borderRadius: "5px", fontSize: "11px", cursor: "pointer",
          border: isActive ? "1px solid var(--btn-active-bg)" : "1px solid var(--btn-inactive-border)",
          background: isActive ? "var(--btn-active-bg)" : "var(--btn-inactive-bg)",
          color: isActive ? "var(--btn-active-text)" : "var(--btn-inactive-text)",
          fontWeight: isActive ? 600 : 400,
          whiteSpace: "nowrap",
          transition: "background 0.1s, color 0.1s",
        }}
      >
        {f.label}
      </button>
    );
  };

  return (
    <div className="tw-filter-bar" style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", marginBottom: "10px" }}>
      {TYPE_FILTERS.map(pill)}
      <span style={{ width: "1px", height: "16px", background: "var(--border-strong)", flexShrink: 0, alignSelf: "center" }} />
      {PLATFORM_FILTERS.map(pill)}
      {hasActive && (
        <button
          onClick={onClear}
          style={{
            padding: "3px 8px", borderRadius: "5px", fontSize: "11px",
            border: "1px solid var(--border)", background: "none",
            color: "var(--text-faint)", cursor: "pointer",
          }}
        >
          Clear
        </button>
      )}
    </div>
  );
}

const PROF_GRID_DATA = [
  {
    prof: "Breakout", subtitle: "strong momentum + strong sustainability",
    signals: [
      { signal: "Confirmed Growth", read: "Beacon",       desc: "Strongest combo: real usage growing, price agrees." },
      { signal: "Absorbed",         read: "Undercurrent", desc: "Volume isn't moving price yet — possible quiet accumulation." },
      { signal: "Thin Rally",       read: "Overshoot",    desc: "Price up on light volume — may be ahead of itself." },
      { signal: "Cooling",          read: "Quiet Beacon", desc: "Market hasn't noticed yet. Possibly undiscovered." },
    ],
  },
  {
    prof: "Quick Mover", subtitle: "strong momentum, weak sustainability",
    signals: [
      { signal: "Confirmed Growth", read: "Flare",      desc: "Hot right now, but durability is unproven." },
      { signal: "Absorbed",         read: "Backdraft",  desc: "Fast activity, price not rewarding it." },
      { signal: "Thin Rally",       read: "Flashpoint", desc: "Classic pump pattern: thin volume, price popping." },
      { signal: "Cooling",          read: "Afterglow",  desc: "Momentum likely fading along with price." },
    ],
  },
  {
    prof: "Slow Burner", subtitle: "weak momentum, strong sustainability",
    signals: [
      { signal: "Confirmed Growth", read: "Low Hum",    desc: "Steady, sticky usage with price finally agreeing." },
      { signal: "Absorbed",         read: "Low Signal", desc: "Durable usage, possibly undervalued." },
      { signal: "Thin Rally",       read: "Soft Ping",  desc: "Modest, low-risk price tick on a stable base." },
      { signal: "Cooling",          read: "Standby",    desc: "Stable but quiet — a sleeper." },
    ],
  },
  {
    prof: "Cold", subtitle: "weak momentum + weak sustainability",
    signals: [
      { signal: "Confirmed Growth", read: "Mirage",      desc: "Price rising despite weak fundamentals — hype-driven." },
      { signal: "Absorbed",         read: "Bleed",       desc: "Weak fundamentals, falling price — possible distribution." },
      { signal: "Thin Rally",       read: "False Flare", desc: "Weakest, highest-risk combo. No substance behind it." },
      { signal: "Cooling",          read: "Flatline",    desc: "Weak across the board — lowest priority." },
    ],
  },
];

function ProfSignalKey() {
  return (
    <details style={{ marginBottom: "4px", fontSize: "14px", color: "var(--text)" }}>
      <summary style={{ cursor: "pointer", fontWeight: 600, color: "var(--text)", marginBottom: "10px" }}>
        Key: Profile, Signal & Read explained
      </summary>
      <p style={{ marginTop: "8px", marginBottom: "12px", color: "var(--text-muted)", fontSize: "13px", lineHeight: "1.5" }}>
        <strong>Prof</strong> = behavioral profile (price-independent). <strong>Signal</strong> = does price agree with volume this week. <strong>Read</strong> = the named verdict for that combination.
      </p>
      <div className="tw-prof-key-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
        {PROF_GRID_DATA.map((col) => (
          <div key={col.prof} style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden", background: "var(--bg)" }}>
            <div style={{ background: "var(--bg-muted)", padding: "8px 12px", borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", color: "var(--text)" }}>{col.prof}</div>
              <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "2px" }}>{col.subtitle}</div>
            </div>
            {col.signals.map((row) => (
              <div key={row.signal} style={{ padding: "8px 12px", borderTop: "1px solid var(--border)" }}>
                <div style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "4px", fontWeight: 500 }}>{row.signal}</div>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "6px", flexWrap: "wrap" }}>
                  <ReadBadge value={row.read} />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.4", paddingTop: "2px" }}>{row.desc}</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </details>
  );
}


export default function DashboardTable({ data, discoveryData = [], lastUpdated, pricesUpdatedAt = null, snapshotBuiltAt = null }) {
  const [activeTab, setActiveTab] = useState("ClawdWire");
  const [sortKey, setSortKey] = useState("Opp");
  const [sortDir, setSortDir] = useState("desc");
  const [pinnedKeys, setPinnedKeys] = useState([]);
  const [dragOver, setDragOver] = useState(null);
  const [activeFilters, setActiveFilters] = useState(new Set());
  const [watchedAddresses, setWatchedAddresses] = useState([]);
  const [watchlistColumnConfig, setWatchlistColumnConfig] = useState(null);
  const [watchlistLoaded, setWatchlistLoaded] = useState(false);
  const [compact, setCompact] = useState(() => loadCompact());
  // false until mount if no stored choice — lets ClawdWire default to comfort without a wrong first paint
  const [compactPrefSet, setCompactPrefSet] = useState(() => {
    if (typeof window === "undefined") return false;
    return hasCompactPreference();
  });
  const [flowFamily, setFlowFamily] = useState("Money");
  const [tableMode, setTableMode] = useState("summary"); // mobile hybrid: summary | full
  const [defSheet, setDefSheet] = useState(null); // { title, body, windowLabel }
  const [rankExpand, setRankExpand] = useState(null); // { rowKey, colKey }
  const headerLongPressRef = useRef({ timer: null, fired: false });
  const [period, setPeriod] = useState(() => loadPeriod());
  const [whalesView, setWhalesView] = useState(() => loadWhalesView());
  const [clawdWireMeta, setClawdWireMeta] = useState({ lastRunAt: null, syncing: false });
  const dragKeyRef = useRef(null);
  const rootRef = useRef(null);
  const { tooltip, show: showTooltip, move: moveTooltip, hide: hideTooltip, toggle: toggleTooltip, dismiss: dismissTooltip } = useDelayedTooltip();

  useEffect(() => {
    setPinnedKeys(loadPins());
    setCompact(loadCompact());
    setCompactPrefSet(hasCompactPreference());
    setFlowFamily(loadFlowFamily());
    try {
      let tab = new URLSearchParams(window.location.search).get("tab");
      // ?tab=Activity and friends predate the Flow merge; land old links on the
      // right family instead of dropping them.
      if (tab && LEGACY_TAB_TO_FLOW[tab]) {
        setFlowFamily(LEGACY_TAB_TO_FLOW[tab]);
        tab = "Flow";
      }
      if (tab && TAB_ORDER.includes(tab)) {
        setActiveTab(tab);
        if (!["The Wire", "ClawdWire", "About", "CLAWD", "Watchlist"].includes(tab)) {
          const filtered = filterColumnsForView(TABS[columnSourceFor(tab, loadFlowFamily())] || [], {
            activeTab: tab,
            period: loadPeriod(),
            whalesView: loadWhalesView(),
          });
          const firstNumeric = filtered.find((c) => c.type === "number");
          if (firstNumeric) setSortKey(firstNumeric.key);
          else if (filtered[0]) setSortKey(filtered[0].key);
        } else if (tab === "Watchlist") setSortKey("Opp");
      }
    } catch {}
  }, []);

  // ClawdWire is a composed cockpit rather than a wide table, so squeezing it to
  // 0.85 buys no extra columns and only costs legibility — it defaults to
  // comfortable. An explicit Compact choice still wins everywhere.
  const effectiveCompact =
    activeTab === "ClawdWire" && !compactPrefSet ? false : compact;

  // Layout body zoom (0.85 on desktop) is the main "compact" — toggle comfort-view to go full size.
  useEffect(() => {
    document.documentElement.classList.toggle("comfort-view", !effectiveCompact);
  }, [effectiveCompact]);

  function toggleCompact() {
    const next = !effectiveCompact;
    saveCompact(next);
    setCompactPrefSet(true);
    setCompact(next);
  }

  const { address } = useAccount();
  const { data: hasAccessRaw } = useReadContract({
    address: GATE_ADDRESS,
    abi: GATE_ABI,
    functionName: "hasAccess",
    args: address ? [address, 1] : undefined,
    chainId: base.id,
    query: { enabled: !!address },
  });
  const hasAccess = !!hasAccessRaw;
  const wireTester = isWireTester(address);

  // ── Load watchlist from Upstash when wallet connects ─────────────────────
  useEffect(() => {
    if (!address) {
      setWatchedAddresses([]);
      setWatchlistColumnConfig(null);
      setWatchlistLoaded(false);
      return;
    }
    let cancelled = false;
    async function loadWatchlist() {
      try {
        const res = await fetch(`/api/watchlist?wallet=${address.toLowerCase()}`);
        const json = await res.json();
        if (cancelled) return;
        setWatchedAddresses(json.watchlist || []);
        setWatchlistColumnConfig(json.columns ? { keys: json.columns, order: json.columnOrder } : null);
        setWatchlistLoaded(true);
      } catch {
        if (!cancelled) setWatchlistLoaded(true);
      }
    }
    loadWatchlist();
    return () => { cancelled = true; };
  }, [address]);

  async function persistWatchlist(newAddresses, newColumnConfig) {
    if (!address) return;
    try {
      await fetch("/api/watchlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: address.toLowerCase(),
          watchlist: newAddresses,
          columns: newColumnConfig?.keys || null,
          columnOrder: newColumnConfig?.order || null,
        }),
      });
    } catch (err) {
      console.error("Failed to persist watchlist:", err);
    }
  }

  function toggleWatch(tokenAddress) {
    if (!tokenAddress) return;
    const addrLower = tokenAddress.toLowerCase();
    setWatchedAddresses((prev) => {
      const next = prev.includes(addrLower) ? prev.filter((a) => a !== addrLower) : [...prev, addrLower];
      persistWatchlist(next, watchlistColumnConfig);
      return next;
    });
  }

  function handleColumnConfigChange(config) {
    setWatchlistColumnConfig(config);
    persistWatchlist(watchedAddresses, config);
  }

  const isTripwire = activeTab === "The Wire";
  const isClawdWire = activeTab === "ClawdWire";
  const isAbout    = activeTab === "About";
  const isClawd    = activeTab === "CLAWD";
  const isDiscover = activeTab === "Discover";
  const isWatchlist = activeTab === "Watchlist";
  const isSpecialTab = isTripwire || isClawdWire || isAbout || isClawd || isWatchlist;
  const rawColumns = isSpecialTab ? [] : (TABS[columnSourceFor(activeTab, flowFamily)] || []);
  const columns = filterColumnsForView(rawColumns, { activeTab, period, whalesView });
  const windowLegend = tabWindowLegend(columns);
  const showWhalesToggle = activeTab === "Whales & Risk";
  const showWhalesFlowPeriod = showWhalesToggle && whalesView === "flow";
  const showPeriodToggle = PERIOD_TABS.has(activeTab) || showWhalesFlowPeriod;
  const showFlowFamilies = activeTab === "Flow";

  function changeFlowFamily(key) {
    setFlowFamily(key);
    try {
      localStorage.setItem("zdash-flow-family", key);
    } catch {}
    const filtered = filterColumnsForView(TABS[FLOW_SOURCE[key]] || [], {
      activeTab: "Flow",
      period,
      whalesView,
    });
    const firstNumeric = filtered.find((c) => c.type === "number");
    setSortKey(firstNumeric ? firstNumeric.key : filtered[0]?.key || "Project");
    setSortDir("desc");
  }
  const rawSource = isDiscover ? discoveryData : data;
  const sourceData = isSpecialTab ? [] : Array.isArray(rawSource) ? rawSource : [];
  const rowKeyField = isDiscover ? "address" : "Address";

  const dataArr = Array.isArray(data) ? data : [];
  const clawdRow = dataArr.find((d) => d["Project"] === "CLAWD") || null;
  const totalProjects = dataArr.length || null;
  const opportunityRank = clawdRow?.["O Rk"] ?? null;
  const momentumRank = clawdRow?.["M Rk"] ?? null;
  const sustainabilityRank = clawdRow?.["S Rk"] ?? null;

  function rankBy(field, ascending = false) {
    const sorted = [...dataArr]
      .filter((d) => d[field] != null && d[field] !== "")
      .sort((a, b) => ascending ? Number(a[field]) - Number(b[field]) : Number(b[field]) - Number(a[field]));
    const idx = sorted.findIndex((d) => d["Project"] === "CLAWD");
    return idx >= 0 ? idx + 1 : null;
  }

  const marketCapRank = rankBy("marketCapUsd");
  const walletsRank   = rankBy("Wallets 30d");

  const RANK_FIELDS = [
    "Vol Grw %", "Tx Grw %", "User Grw %",
    "Txs 30d", "Txs 7d", "Txs 24h", "Vol 30d", "Vol 7d", "Vol 24h",
    "Txs/User", "Txs/User 7d", "Txs/User 24h", "Vol/Tx", "Vol/Tx 7d", "Vol/Tx 24h",
    "Vol/Wlt", "Vol/Wlt 7d", "Vol/Wlt 24h", "Traders",
    "Retention %", "New %", "New Wallets", "Returning Wallets", "Non-Trade New 30d",
    "Wallets 30d", "Wallets 7d", "Wallets 24h",
    "Buyers 30d", "Buyers 7d", "Buyers 24h",
    "1st Buyers 30d", "1st Buyers 7d", "1st Buyers 24h",
    "1st Sellers 30d", "1st Sellers 7d", "1st Sellers 24h",
    "Buy Vol %", "Buy Vol % 24h", "Buy/Sell Ratio", "Buy/Sell Ratio 24h",
    "Whale Net 7d", "Whale Net 24h", "Accum %", "Accum % 24h",
    "Whale Buyers 7d", "Whale Sellers 7d", "Whale Buyers 24h", "Whale Sellers 24h",
    "Hump Net 7d", "Hump Net 24h", "Hump Buyers 7d", "Hump Sellers 7d",
    "Hump Buyers 24h", "Hump Sellers 24h",
    "Retail Net 7d", "Retail Net 24h", "Whale Vol %", "Whale Vol % 24h",
    "Whale Min $", "Hump Min $", "Divergence Bps", "Divergence Bps 24h",
    "Qlty %", "Risk %", "Top10 %",
  ];
  const ranks = {};
  RANK_FIELDS.forEach((f) => { ranks[f] = rankBy(f, LOWER_IS_BETTER_KEYS.has(f)); });

  function togglePin(key) {
    setPinnedKeys((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      savePins(next);
      return next;
    });
  }

  function handleFilterToggle(key) {
    setActiveFilters((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleFilterClear() { setActiveFilters(new Set()); }

  function handleDragStart(key) { dragKeyRef.current = key; }
  function handleDragEnter(key) { setDragOver(key); }
  function handleDragEnd() {
    const from = dragKeyRef.current;
    const to = dragOver;
    dragKeyRef.current = null;
    setDragOver(null);
    if (!from || !to || from === to) return;
    setPinnedKeys((prev) => {
      const next = [...prev];
      const fi = next.indexOf(from);
      const ti = next.indexOf(to);
      if (fi === -1 || ti === -1) return prev;
      next.splice(fi, 1);
      next.splice(ti, 0, from);
      savePins(next);
      return next;
    });
  }

  function getCellRank(colKey, colType, rowData) {
    if (colType !== "number" || isDiscover) return null;
    return peerRank(colKey, rowData[colKey], dataArr);
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (["The Wire", "ClawdWire", "About", "CLAWD", "Watchlist"].includes(tab)) return;
    const filtered = filterColumnsForView(TABS[columnSourceFor(tab, flowFamily)] || [], {
      activeTab: tab,
      period,
      whalesView,
    });
    const firstNumeric = filtered.find((c) => c.type === "number");
    setSortKey(firstNumeric ? firstNumeric.key : filtered[0]?.key || "Project");
    setSortDir("desc");
  }

  // If period/view hides the active sort column, fall back to first visible numeric.
  useEffect(() => {
    if (!columns.length) return;
    if (columns.some((c) => c.key === sortKey)) return;
    const firstNumeric = columns.find((c) => c.type === "number");
    setSortKey(firstNumeric ? firstNumeric.key : columns[0].key);
    setSortDir("desc");
  }, [columns, sortKey]);

  useEffect(() => {
    function handleKeyDown(e) {
      const tag = e.target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;

      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const scroller = rootRef.current?.querySelector("[data-h-scroll]");
        if (!scroller || scroller.scrollWidth <= scroller.clientWidth + 1) return;
        e.preventDefault();
        const step = Math.max(160, Math.round(scroller.clientWidth * 0.35));
        scroller.scrollBy({ left: e.key === "ArrowRight" ? step : -step, behavior: "smooth" });
        return;
      }

      if (e.key !== "[" && e.key !== "]") return;
      const currentIndex = TAB_ORDER.indexOf(activeTab);
      if (currentIndex === -1) return;
      const direction = e.key === "]" ? 1 : -1;
      const nextIndex = (currentIndex + direction + TAB_ORDER.length) % TAB_ORDER.length;
      handleTabChange(TAB_ORDER[nextIndex]);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeTab]);

  function handleSort(key) {
    if (sortKey === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  // AND between groups, OR within group
  const filtered = isSpecialTab || isDiscover
    ? sourceData
    : activeFilters.size === 0
      ? sourceData
      : sourceData.filter((d) => {
          const typeActive = TYPE_FILTERS.filter((f) => activeFilters.has(f.key));
          const platformActive = PLATFORM_FILTERS.filter((f) => activeFilters.has(f.key));
          const typeOk = typeActive.length === 0 || typeActive.some((f) => f.match(d["Tag"]));
          const platformOk = platformActive.length === 0 || platformActive.some((f) => f.match(d["Tag"]));
          return typeOk && platformOk;
        });

  const sorted = isSpecialTab
    ? []
    : [...filtered].sort((a, b) => {
        const col = columns.find((c) => c.key === sortKey) || columns[0];
        let aVal = a[sortKey];
        let bVal = b[sortKey];
        if (col?.type === "number") {
          aVal = aVal == null || aVal === "" ? -Infinity : Number(aVal);
          bVal = bVal == null || bVal === "" ? -Infinity : Number(bVal);
          return sortDir === "desc" ? bVal - aVal : aVal - bVal;
        }
        aVal = aVal == null ? "" : String(aVal);
        bVal = bVal == null ? "" : String(bVal);
        return sortDir === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
      });

  function tabLabel(tab) {
    if (tab === "Discover") return `Discover${discoveryData.length > 0 ? ` (${discoveryData.length})` : ""}`;
    if (tab === "Watchlist") return `Watchlist${watchedAddresses.length > 0 ? ` (${watchedAddresses.length})` : ""}`;
    return tab;
  }

  const pinnedRows = !isDiscover
    ? pinnedKeys.map((k) => sorted.find((d) => d[rowKeyField] === k)).filter(Boolean)
    : [];
  const unpinnedRows = !isDiscover
    ? sorted.filter((d) => !pinnedKeys.includes(d[rowKeyField]))
    : sorted;
  const displayRows = [...pinnedRows, ...unpinnedRows];

  function renderRow(d, idx) {
    const isPinned     = !isDiscover && pinnedKeys.includes(d[rowKeyField]);
    const unpinnedIdx  = idx - pinnedRows.length;
    const isRowGated   = !isDiscover && !isPinned && unpinnedIdx >= FREE_ROW_COUNT && !hasAccess;
    const isClawdRow   = !isDiscover && d["Project"] === "CLAWD";
    const isDragTarget = dragOver === d[rowKeyField] && isPinned;
    const isWatched    = !isDiscover && watchedAddresses.includes((d["Address"] || "").toLowerCase());
    const rowKey = d[rowKeyField];
    const expandCol = rankExpand?.rowKey === rowKey ? columns.find((c) => c.key === rankExpand.colKey) : null;
    const expandRank = expandCol ? getCellRank(expandCol.key, expandCol.type, d) : null;

    const mainRow = (
      <tr
        key={rowKey}
        draggable={isPinned}
        onDragStart={isPinned ? () => handleDragStart(d[rowKeyField]) : undefined}
        onDragEnter={isPinned ? () => handleDragEnter(d[rowKeyField]) : undefined}
        onDragEnd={isPinned ? handleDragEnd : undefined}
        onDragOver={isPinned ? (e) => e.preventDefault() : undefined}
        style={{
          ...(isClawdRow   ? { borderLeft: "3px solid #3B6D11", background: "var(--clawd-row-bg)" } : {}),
          ...(isPinned     ? { background: isDragTarget ? "var(--bg-subtle)" : "var(--clawd-row-bg)" } : {}),
          ...(isDragTarget ? { outline: "2px solid var(--btn-active-bg)", outlineOffset: "-2px" } : {}),
          cursor: isPinned ? "grab" : "default",
        }}
      >
        {!isDiscover && (
          <td className="tw-sticky-actions" style={{ padding: compact ? "2px 2px" : "4px 4px", whiteSpace: "nowrap", width: compact ? "40px" : "52px" }}>
            <button
              className="tw-icon-btn"
              onClick={() => toggleWatch(d["Address"])}
              title={isWatched ? "Remove from watchlist" : "Add to watchlist"}
              style={{
                background: "none", border: "none", cursor: "pointer", fontSize: compact ? "11px" : "14px",
                lineHeight: 1, padding: "0 2px",
                color: isWatched ? "#f5c518" : "var(--text-faint)",
                opacity: isWatched ? 1 : 0.5,
                transition: "opacity 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = isWatched ? "1" : "0.5"; }}
            >
              ⭐
            </button>
            <button
              className="tw-icon-btn"
              onClick={() => togglePin(d[rowKeyField])}
              title={isPinned ? "Unpin" : "Pin to top"}
              style={{
                background: "none", border: "none", cursor: "pointer", fontSize: compact ? "11px" : "14px",
                lineHeight: 1, padding: "0 2px",
                color: isPinned ? "var(--btn-active-bg)" : "var(--text-faint)",
                opacity: isPinned ? 1 : 0.5,
                transition: "opacity 0.15s, color 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.color = "var(--btn-active-bg)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = isPinned ? "1" : "0.5"; e.currentTarget.style.color = isPinned ? "var(--btn-active-bg)" : "var(--text-faint)"; }}
            >
              📍
            </button>
          </td>
        )}
        {columns.map((col) => {
          const rankInfo = !isRowGated ? getCellRank(col.key, col.type, d) : null;
          const isFallbackPrice =
            (col.key === "priceUsd" || col.key === "marketCapUsd") &&
            d.priceSource === "dexscreener" &&
            d[col.key] != null;
          const isProjectCol = col.key === "Project" || col.key === "name";
          const cellContent = col.key === "read"
            ? <ReadBadge value={d[col.key]} />
            : col.key === "signal" && d.signalNote ? (
                <span>
                  {d[col.key]}
                  <span
                    title={d.signalNote === "whales in"
                      ? "Volume is being absorbed WITH whales net buying \u2014 reads as genuine accumulation"
                      : "Volume is being absorbed WHILE whales net sell \u2014 possible distribution disguised as activity"}
                    style={{
                      marginLeft: "6px",
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "1px 6px",
                      borderRadius: "999px",
                      background: d.signalNote === "whales in" ? "var(--read-teal-bg)" : "var(--read-coral-bg)",
                      color: d.signalNote === "whales in" ? "var(--read-teal-text)" : "var(--read-coral-text)",
                    }}
                  >
                    {d.signalNote}
                  </span>
                </span>
              )
            : (
              <>
                {formatValue(d[col.key], col.format)}
                {isFallbackPrice ? (
                  <span title="Price via DexScreener (not on CoinGecko)" style={{ marginLeft: "2px", color: "var(--text-faint)", fontSize: "10px" }}>*</span>
                ) : null}
              </>
            );
          const rankTooltipContent = rankInfo ? (
            <div>
              <div style={{ fontWeight: 600 }}>
                #{rankInfo.rank} of {rankInfo.total}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-muted)", marginTop: "2px" }}>
                Rank for <strong>{col.label}</strong>
                {col.window ? <span style={{ color: "var(--text-faint)" }}> · {col.window}</span> : null}
              </div>
              <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "4px", borderTop: "1px solid var(--border)", paddingTop: "4px" }}>
                1 = best · {rankInfo.total} = worst
              </div>
            </div>
          ) : null;
          const tipHandlers = rankTooltipContent && !prefersTouchUi()
            ? touchTooltipHandlers(rankTooltipContent, {
                showTooltip, moveTooltip, hideTooltip, toggleTooltip, delay: RANK_TOOLTIP_DELAY,
              })
            : {};
          const touchExpandHandlers = rankInfo && prefersTouchUi()
            ? {
                onClick: (e) => {
                  e.stopPropagation();
                  setRankExpand((prev) =>
                    prev?.rowKey === rowKey && prev?.colKey === col.key
                      ? null
                      : { rowKey, colKey: col.key }
                  );
                },
              }
            : {};
          return (
            <td
              key={col.key}
              className={isProjectCol ? "tw-sticky-project" : undefined}
              style={{
                padding: compact ? "3px 6px" : "6px 12px",
                whiteSpace: "nowrap",
                cursor: rankInfo ? "pointer" : undefined,
                background: rankExpand?.rowKey === rowKey && rankExpand?.colKey === col.key
                  ? "var(--bg-subtle)" : undefined,
              }}
              {...tipHandlers}
              {...touchExpandHandlers}
            >
              <GatedCell blurred={isRowGated}>
                {isProjectCol ? (
                  <span className="tw-name-clip" title={String(d[col.key] ?? "")}>{cellContent}</span>
                ) : cellContent}
              </GatedCell>
            </td>
          );
        })}
      </tr>
    );

    if (!expandCol || !expandRank || isRowGated) return mainRow;

    return (
      <>
        {mainRow}
        <tr key={`${rowKey}-rank-expand`}>
          <td
            colSpan={columns.length + (isDiscover ? 0 : 1)}
            style={{
              padding: "8px 12px",
              background: "var(--bg-subtle)",
              borderBottom: "1px solid var(--border)",
              fontSize: "12px",
              color: "var(--text-muted)",
            }}
          >
            <strong style={{ color: "var(--text)" }}>#{expandRank.rank} of {expandRank.total}</strong>
            {" · "}
            {expandCol.label}
            {expandCol.window ? ` · ${expandCol.window}` : ""}
            <span style={{ color: "var(--text-faint)" }}> — 1 = best · tap again to close</span>
          </td>
        </tr>
      </>
    );
  }
  const isHybridTab = HYBRID_TABS.has(activeTab);
  const showHybrid = isHybridTab && !isSpecialTab;

  const tableBody = !isSpecialTab && (
    <div
      data-h-scroll
      className={`tw-full-table tw-hscroll${!isDiscover ? " has-actions" : ""}`}
      style={{ overflowX: "auto", fontSize: compact ? "11px" : undefined }}
    >
      <table style={{ borderCollapse: "collapse", marginTop: "8px", width: "100%" }}>
        <thead>
          <tr>
            {!isDiscover && <th className="tw-sticky-actions" style={{ width: compact ? "40px" : "52px", borderBottom: "1px solid var(--border-strong)", padding: compact ? "4px 4px" : "6px 8px" }} />}
            {columns.map((col) => {
              const isProjectCol = col.key === "Project" || col.key === "name";
              const openDef = () => {
                if (!col.tooltip) return;
                dismissTooltip();
                setDefSheet({
                  title: col.label,
                  body: col.tooltip,
                  windowLabel: col.window || null,
                });
              };
              return (
              <th
                key={col.key}
                className={isProjectCol ? "tw-sticky-project" : undefined}
                onMouseEnter={!prefersTouchUi() && col.tooltip ? (e) => showTooltip(col.tooltip, e, HEADER_TOOLTIP_DELAY) : undefined}
                onMouseMove={!prefersTouchUi() && col.tooltip ? moveTooltip : undefined}
                onMouseLeave={!prefersTouchUi() && col.tooltip ? hideTooltip : undefined}
                onPointerDown={col.tooltip ? (e) => {
                  if (!prefersTouchUi()) return;
                  e.stopPropagation();
                  headerLongPressRef.current.fired = false;
                  clearTimeout(headerLongPressRef.current.timer);
                  headerLongPressRef.current.timer = setTimeout(() => {
                    headerLongPressRef.current.fired = true;
                    openDef();
                  }, 450);
                } : undefined}
                onPointerUp={() => clearTimeout(headerLongPressRef.current.timer)}
                onPointerCancel={() => clearTimeout(headerLongPressRef.current.timer)}
                onClick={() => {
                  if (headerLongPressRef.current.fired) {
                    headerLongPressRef.current.fired = false;
                    return;
                  }
                  handleSort(col.key);
                }}
                style={{
                  textAlign: "left", borderBottom: "1px solid var(--border-strong)",
                  padding: compact ? "4px 6px" : "6px 12px", cursor: "pointer", userSelect: "none",
                  whiteSpace: isProjectCol ? "nowrap" : "normal", verticalAlign: "bottom",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                  {isProjectCol ? (
                    <span className="tw-name-clip">{col.label}{sortKey === col.key ? (sortDir === "desc" ? " \u25BC" : " \u25B2") : ""}</span>
                  ) : (
                    <ColumnHeaderLabel col={col} sortKey={sortKey} sortDir={sortDir} />
                  )}
                  {col.tooltip ? (
                    <button
                      type="button"
                      className="tw-tip-mobile"
                      aria-label={`Definition for ${col.label}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        openDef();
                      }}
                      style={{
                        border: "none",
                        background: "transparent",
                        color: "var(--text-faint)",
                        fontSize: "11px",
                        lineHeight: 1,
                        padding: "2px",
                        cursor: "pointer",
                      }}
                    >
                      ⓘ
                    </button>
                  ) : null}
                </span>
              </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {pinnedRows.length > 0 && (
            <tr>
              <td colSpan={columns.length + 1} style={{ padding: "2px 12px 0", fontSize: "10px", color: "var(--text-xfaint)", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", background: "var(--bg-subtle)" }}>
                Pinned — drag to reorder
              </td>
            </tr>
          )}
          {displayRows.length === 0 ? (
            <tr>
              <td colSpan={columns.length + 1} style={{ padding: "16px", color: "var(--text-muted)" }}>
                {isDiscover ? "No new candidates found." : "No data."}
              </td>
            </tr>
          ) : (
            displayRows.map((d, idx) => renderRow(d, idx))
          )}
        </tbody>
      </table>
    </div>
  );

  // Public nav is slim: ClawdWire + About + Snapshot menu. TABS remains a column library.
  const isSnapshotTab = SNAPSHOT_TAB_SET.has(activeTab);
  const hybridClass = showHybrid
    ? (tableMode === "full" ? "tw-hybrid-full" : "tw-hybrid-summary")
    : "";

  const navChip = (active) => ({
    padding: "8px 16px",
    borderRadius: "6px",
    border: active ? "1px solid var(--btn-active-bg)" : "1px solid var(--btn-inactive-border)",
    background: active ? "var(--btn-active-bg)" : "var(--btn-inactive-bg)",
    color: active ? "var(--btn-active-text)" : "var(--btn-inactive-text)",
    cursor: "pointer",
    fontWeight: active ? 600 : 400,
    fontSize: "14px",
    fontFamily: "inherit",
    textDecoration: "none",
  });

  return (
    <div ref={rootRef}>
      {isTripwire ? (
        <WireBanner />
      ) : isClawdWire ? (
        <ClawdWireBanner />
      ) : (
        <StatusBanner
          lastUpdated={lastUpdated}
          pricesUpdatedAt={pricesUpdatedAt}
          snapshotBuiltAt={snapshotBuiltAt}
        />
      )}

      <div className="tw-tab-strip tw-nav-desktop" style={{ display: "flex", gap: "8px", marginBottom: "6px", flexWrap: "wrap", alignItems: "center" }}>
        <button type="button" onClick={() => handleTabChange("ClawdWire")} style={navChip(activeTab === "ClawdWire")}>
          ClawdWire
        </button>
        <MoreMenu
          chipLabel="Snapshot"
          items={[
            ...SNAPSHOT_TABS.map((t) => ({
              key: t,
              label: t === "Whales & Risk" ? "Whales" : tabLabel(t),
            })),
            { key: "__movers", label: "Movers" },
          ]}
          activeKey={isSnapshotTab ? activeTab : null}
          onSelect={(key) => {
            if (key === "__movers") {
              window.location.href = "/movers";
              return;
            }
            handleTabChange(key);
          }}
        />
        <button type="button" onClick={() => handleTabChange("About")} style={navChip(activeTab === "About")}>
          About
        </button>
        <span style={{ flex: "1 1 8px" }} />
        <AppearanceToggle />
      </div>

      <DashboardMobileNav
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabLabel={(tab) => (tab === "Whales & Risk" ? "Whales" : tabLabel(tab))}
      />

      {isSnapshotTab && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            margin: "0 0 10px",
            padding: "6px 10px",
            borderRadius: "6px",
            border: "1px solid var(--read-amber-text)",
            background: "rgba(232, 168, 56, 0.08)",
            fontSize: "12px",
            color: "var(--text)",
            lineHeight: 1.4,
          }}
        >
          <strong style={{ letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "10px" }}>
            Snapshot
          </strong>
          <span style={{ color: "var(--text-muted)" }}>
            Multi-token board ages with Scores last updated — not the ClawdWire live pulse.
            {lastUpdated ? (
              <>
                {" "}
                · Dune {new Date(lastUpdated).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
              </>
            ) : null}
          </span>
        </div>
      )}

      {!isSpecialTab && windowLegend && (
        <p style={{ fontSize: "11px", color: "var(--text-faint)", margin: "0 0 8px", letterSpacing: "0.01em" }}>
          {windowLegend}
        </p>
      )}
      {activeTab === "Flow" && flowFamily === "Wallets" && (period === "24h" || period === "7d") && (
        <p style={{ fontSize: "11px", color: "var(--text-faint)", margin: "0 0 8px", lineHeight: 1.4 }}>
          {period === "24h"
            ? "24h shows wallet count only — New / Returning and Avg Txs Ret need longer windows (30d / 7d)."
            : "Avg Txs Ret is 7d-only. New / Returning wallets show on 30d."}
        </p>
      )}

      {/* ClawdWire is a cockpit — no table tip / Compact chrome (density defaults to comfort). */}
      {!isClawdWire && (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "10px", flexWrap: "wrap" }}>
        <p className="tw-tip-desktop" style={{ fontSize: "12px", color: "var(--text-xfaint)", margin: 0, flex: "1 1 280px" }}>
          Tip: press <strong>[</strong> or <strong>]</strong> to switch tabs. Use <strong>←</strong> <strong>→</strong> to scroll wide tables. Hover a column header for its definition. Hover any number to see its rank among peers. Click ⭐ to watch, 📍 to pin to top.
        </p>
        <p className="tw-tip-mobile" style={{ fontSize: "12px", color: "var(--text-xfaint)", margin: 0, flex: "1 1 280px" }}>
          Tip: primary tabs + More · Summary/Full on Overview &amp; Whales · tap header to sort · long-press or ⓘ for defs · tap a number for peer rank. ⭐ watch · 📍 pin.
        </p>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexShrink: 0, flexWrap: "wrap" }}>
          {showFlowFamilies && (
            <SegmentedControl
              ariaLabel="Metric family"
              value={flowFamily}
              onChange={changeFlowFamily}
              options={FLOW_FAMILIES.map((f) => ({ value: f.key, label: f.label }))}
            />
          )}
          {showPeriodToggle && (
            <SegmentedControl
              ariaLabel="Period window"
              value={showWhalesFlowPeriod ? flowPeriod(period) : period}
              onChange={(next) => { savePeriod(next); setPeriod(next); }}
              options={showWhalesFlowPeriod
                ? [
                    { value: "24h", label: "24h" },
                    { value: "7d", label: "7d" },
                  ]
                : [
                    { value: "24h", label: "24h" },
                    { value: "7d", label: "7d" },
                    { value: "30d", label: "30d" },
                  ]}
            />
          )}
          {showWhalesToggle && (
            <SegmentedControl
              ariaLabel="Whales view"
              value={whalesView}
              onChange={(next) => { saveWhalesView(next); setWhalesView(next); }}
              options={[
                { value: "flow", label: "Flow" },
                { value: "context", label: "Context" },
              ]}
            />
          )}
          {showHybrid && (
            <button
              type="button"
              className="tw-table-mode-toggle"
              onClick={() => setTableMode((m) => (m === "summary" ? "full" : "summary"))}
              style={{
                padding: "5px 12px",
                borderRadius: "6px",
                border: "1px solid var(--btn-inactive-border)",
                background: tableMode === "full" ? "var(--btn-active-bg)" : "var(--btn-inactive-bg)",
                color: tableMode === "full" ? "var(--btn-active-text)" : "var(--btn-inactive-text)",
                cursor: "pointer",
                fontSize: "12px",
                fontWeight: tableMode === "full" ? 600 : 400,
                whiteSpace: "nowrap",
                alignItems: "center",
              }}
            >
              {tableMode === "summary" ? "Full table" : "Summary"}
            </button>
          )}
          <button
            type="button"
            className="tw-compact-btn"
            onClick={toggleCompact}
            title={effectiveCompact ? "Switch to comfortable size" : "Shrink table so more columns fit"}
            style={{
              padding: "5px 12px",
              borderRadius: "6px",
              border: effectiveCompact ? "1px solid var(--btn-active-bg)" : "1px solid var(--btn-inactive-border)",
              background: effectiveCompact ? "var(--btn-active-bg)" : "var(--btn-inactive-bg)",
              color: effectiveCompact ? "var(--btn-active-text)" : "var(--btn-inactive-text)",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: effectiveCompact ? 600 : 400,
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            {effectiveCompact ? "Compact ✓" : "Compact"}
          </button>
        </div>
      </div>
      )}

      {!isSpecialTab && !isDiscover && (
        <>
          <FilterBar activeFilters={activeFilters} onToggle={handleFilterToggle} onClear={handleFilterClear} />
          <SummaryBar data={filtered} />
        </>
      )}

      {isDiscover && (
        <p style={{ color: "var(--text-muted)", marginBottom: "12px", fontSize: "14px" }}>
          AI-category coins from CoinGecko (AI Agents, AI Agent Launchpad, AI Framework, DeFAI) with a Base
          contract address, not yet in your tracked list. Verify each before adding — category tagging on
          CoinGecko isn't perfect either.
        </p>
      )}

      {activeTab === "Overview" && (
        <MobileTriageBlock
          clawdRow={clawdRow}
          peerRows={[...dataArr]
            .filter((d) => d?.Project && d.Project !== "CLAWD" && d.Opp != null)
            .sort((a, b) => Number(b.Opp) - Number(a.Opp))}
          onOpenFullTable={() => setTableMode("full")}
          onGoClawd={() => handleTabChange("CLAWD")}
        />
      )}

      {activeTab === "Overview" && <ProfSignalKey />}

      <div style={{ minHeight: "500px" }}>
        {isTripwire && (
          wireTester ? (
            <div>
              <div style={{
                marginBottom: "16px",
                padding: "10px 14px",
                border: "1px solid var(--border)",
                borderRadius: "8px",
                background: "var(--bg-subtle)",
                display: "flex",
                flexWrap: "wrap",
                gap: "8px",
                alignItems: "center",
              }}>
                <span style={{
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--read-amber-text)",
                  background: "var(--read-amber-bg)",
                  padding: "4px 10px",
                  borderRadius: "999px",
                }}>
                  Under construction
                </span>
                <span style={{ fontSize: "13px", color: "var(--text-muted)" }}>
                  Team testing — The Wire is open only to the tester wallet while we rebuild.
                </span>
              </div>
              <TripwirePanel hasAccess={true} walletAddress={address} />
            </div>
          ) : (
            <div style={{
              marginTop: "24px",
              padding: "40px 24px",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              background: "var(--bg-subtle)",
              textAlign: "center",
            }}>
              <div style={{
                display: "inline-block",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                color: "var(--read-amber-text)",
                background: "var(--read-amber-bg)",
                padding: "4px 10px",
                borderRadius: "999px",
                marginBottom: "12px",
              }}>
                Under construction
              </div>
              <p style={{ margin: 0, fontSize: "16px", fontWeight: 600, color: "var(--text)" }}>
                The Wire is temporarily offline
              </p>
              <p style={{ margin: "8px 0 0", fontSize: "13px", color: "var(--text-muted)", maxWidth: "440px", marginLeft: "auto", marginRight: "auto" }}>
                Team is testing a rebuild. Public access is paused — check back soon.
              </p>
            </div>
          )
        )}
        {isClawdWire && (
          <div>
            <ClawdWirePanel
              canTrip={hasAccess || wireTester}
              walletAddress={address}
              onMeta={setClawdWireMeta}
              clawdRow={clawdRow}
            />
          </div>
        )}
        {isAbout     && <AboutPanel />}
        {isClawd     && (
          <GatedSection blurred={!hasAccess}>
            <ClawdPanel
              clawdRow={clawdRow}
              totalProjects={totalProjects}
              opportunityRank={opportunityRank}
              momentumRank={momentumRank}
              sustainabilityRank={sustainabilityRank}
              marketCapRank={marketCapRank}
              walletsRank={walletsRank}
              ranks={ranks}
            />
          </GatedSection>
        )}
        {isWatchlist && (
          <GatedSection blurred={!hasAccess}>
            <WatchlistPanel
              data={dataArr}
              watchedAddresses={watchedAddresses}
              onUnwatch={toggleWatch}
              address={address}
              columnConfig={watchlistColumnConfig}
              onColumnConfigChange={handleColumnConfigChange}
              showTooltip={showTooltip}
              moveTooltip={moveTooltip}
              hideTooltip={hideTooltip}
              toggleTooltip={toggleTooltip}
              compact={compact}
            />
          </GatedSection>
        )}
        {isDiscover ? (
          <GatedSection blurred={!hasAccess}>{tableBody}</GatedSection>
        ) : showHybrid ? (
          <div className={hybridClass}>
            <MobileSummaryList
              rows={displayRows}
              pinnedRows={pinnedRows}
              tab={activeTab}
              period={period}
              hasAccess={hasAccess}
              watchedAddresses={watchedAddresses}
              pinnedKeys={pinnedKeys}
              rowKeyField={rowKeyField}
              onToggleWatch={toggleWatch}
              onTogglePin={togglePin}
            />
            {tableBody}
          </div>
        ) : (
          tableBody
        )}
      </div>

      <TooltipBox tooltip={tooltip} />
      <DefSheet
        open={!!defSheet}
        title={defSheet?.title}
        body={defSheet?.body}
        windowLabel={defSheet?.windowLabel}
        onClose={() => setDefSheet(null)}
      />
    </div>
  );
}