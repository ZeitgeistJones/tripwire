"use client";
import { useState, useRef, useEffect, Fragment } from "react";

const ALL_COLUMNS = [
  { key: "Project",          label: "Project",                 type: "string" },
  { key: "read",             label: "Read",                    type: "string" },
  { key: "Opp",              label: "Opp",                     type: "number", format: "dec1" },
  { key: "Mom",              label: "Mom",                     type: "number", format: "dec1" },
  { key: "Sus",              label: "Sus",                     type: "number", format: "dec1" },
  { key: "Prof",             label: "Prof",                    type: "string" },
  { key: "priceUsd",         label: "Price",                   type: "number", format: "price" },
  { key: "marketCapUsd",     label: "Market Cap",              type: "number", format: "usd" },
  { key: "signal",           label: "Signal",                  type: "string" },
  { key: "signalScore",      label: "Signal Score",            type: "number", format: "dec1" },
  { key: "Vol 30d",          label: "Vol (30d)",               type: "number", format: "usd" },
  { key: "Vol/Tx",           label: "Vol/Tx (30d)",            type: "number", format: "dec2" },
  { key: "Vol/Wlt",          label: "Vol/Wlt (30d)",           type: "number", format: "dec2" },
  { key: "Vol Grw %",        label: "Vol Grw % (WoW)",         type: "number", format: "pct1" },
  { key: "Txs 30d",          label: "Txs (30d)",               type: "number", format: "int" },
  { key: "Txs 7d",           label: "Txs (7d)",                type: "number", format: "int" },
  { key: "Tx Grw %",         label: "Tx Grw % (WoW)",          type: "number", format: "pct1" },
  { key: "Txs/User",         label: "Txs/User (30d)",          type: "number", format: "dec1" },
  { key: "Wallets 30d",      label: "Wallets (30d)",           type: "number", format: "int" },
  { key: "Wallets 7d",       label: "Wallets (7d)",            type: "number", format: "int" },
  { key: "User Grw %",       label: "User Grw % (WoW)",        type: "number", format: "pct1" },
  { key: "New Wallets",      label: "New Wallets (30d)",       type: "number", format: "int" },
  { key: "Returning Wallets",label: "Returning Wallets (30d)", type: "number", format: "int" },
  { key: "New %",            label: "New Wallet % (30d)",      type: "number", format: "pct1" },
  { key: "Retention %",      label: "Retention % (WoW)",       type: "number", format: "pct1" },
  { key: "Avg Txs Ret",      label: "Avg Txs Ret (7d)",        type: "number", format: "dec1" },
  { key: "Traders",          label: "Traders (30d)",           type: "number", format: "int" },
  { key: "Buyers 30d",       label: "Buyers (30d)",            type: "number", format: "int" },
  { key: "Buyers 7d",        label: "Buyers (7d)",             type: "number", format: "int" },
  { key: "1st Buyers 30d",   label: "1st Buyers (30d)",        type: "number", format: "int" },
  { key: "1st Buyers 7d",    label: "1st Buyers (7d)",         type: "number", format: "int" },
  { key: "1st Sellers 30d",  label: "1st Sellers (30d)",       type: "number", format: "int" },
  { key: "1st Sellers 7d",   label: "1st Sellers (7d)",        type: "number", format: "int" },
  { key: "Buy/Sell Ratio",   label: "Buy/Sell Ratio (7d)",     type: "number", format: "dec2" },
  { key: "Token Age Days",   label: "Age (days)",              type: "number", format: "int" },
  { key: "Non-Trade New 30d",label: "Non-Trade New (30d)",     type: "number", format: "int" },
  { key: "Top10 %",          label: "Top10 % (30d)",           type: "number", format: "pct1" },
  { key: "Risk %",           label: "Risk %",                  type: "number", format: "pct1" },
  { key: "Qlty %",           label: "Qlty %",                  type: "number", format: "pct1" },
];

const DEFAULT_COLUMNS = ["Project", "Opp", "Mom", "Sus", "Prof", "priceUsd", "marketCapUsd", "signal"];
const RANK_TOOLTIP_DELAY = 350;
const LOWER_IS_BETTER_KEYS = new Set(["Risk %", "Top10 %"]);

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

function formatValue(val, format) {
  if (val == null || val === "") return "—";
  // String columns (Project, Signal, Prof, …) have no numeric format — pass through.
  if (!format) return val;
  const n = Number(val);
  if (Number.isNaN(n)) return "—";
  if (format === "price") return `$${n.toPrecision(4)}`;
  if (format === "usd") return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  if (format === "pct1") return `${n.toFixed(1)}%`;
  if (format === "int") return Math.round(n).toLocaleString();
  if (format === "dec1") return n.toFixed(1);
  if (format === "dec2") return n.toFixed(2);
  return val;
}

function ColumnCustomizer({ activeKeys, order, onChange, onClose }) {
  const [localOrder, setLocalOrder] = useState(order);
  const [localActive, setLocalActive] = useState(new Set(activeKeys));
  const dragRef = useRef(null);
  const [dragOver, setDragOver] = useState(null);

  function toggleCol(key) {
    if (key === "Project") return;
    setLocalActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function handleDragStart(key) { dragRef.current = key; }
  function handleDragEnter(key) { setDragOver(key); }
  function handleDragEnd() {
    const from = dragRef.current;
    const to = dragOver;
    dragRef.current = null;
    setDragOver(null);
    if (!from || !to || from === to) return;
    setLocalOrder((prev) => {
      const next = [...prev];
      const fi = next.indexOf(from);
      const ti = next.indexOf(to);
      if (fi === -1 || ti === -1) return prev;
      next.splice(fi, 1);
      next.splice(ti, 0, from);
      return next;
    });
  }

  function handleSave() {
    onChange({ keys: [...localActive], order: localOrder });
    onClose();
  }

  const orderedCols = [
    ...localOrder.filter((k) => ALL_COLUMNS.find((c) => c.key === k)),
    ...ALL_COLUMNS.filter((c) => !localOrder.includes(c.key)).map((c) => c.key),
  ];

  return (
    <div
      className="tw-watchlist-modal"
      style={{
      position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
      background: "var(--bg)", border: "1px solid var(--border-strong)",
      borderRadius: "8px", padding: "16px", boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span style={{ fontWeight: 600, fontSize: "14px", color: "var(--text)" }}>Customize columns</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "18px", color: "var(--text-faint)", lineHeight: 1 }}>×</button>
      </div>
      <p style={{ fontSize: "12px", color: "var(--text-faint)", margin: "0 0 12px" }}>
        Check to show. Drag to reorder. Project is always first.
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px", maxHeight: "340px", overflowY: "auto", marginBottom: "12px" }}>
        {orderedCols.map((key) => {
          const col = ALL_COLUMNS.find((c) => c.key === key);
          if (!col) return null;
          const isActive = localActive.has(key);
          const isDrag = dragOver === key;
          return (
            <div
              key={key}
              draggable={key !== "Project"}
              onDragStart={() => handleDragStart(key)}
              onDragEnter={() => handleDragEnter(key)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                padding: "5px 8px", borderRadius: "6px", cursor: key === "Project" ? "default" : "grab",
                background: isDrag ? "var(--bg-subtle)" : "transparent",
                outline: isDrag ? "1px solid var(--btn-active-bg)" : "none",
                opacity: key === "Project" ? 0.5 : 1,
              }}
            >
              <input
                type="checkbox"
                checked={isActive}
                disabled={key === "Project"}
                onChange={() => toggleCol(key)}
                style={{ cursor: key === "Project" ? "default" : "pointer", flexShrink: 0 }}
              />
              <span style={{ fontSize: "12px", color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {col.label}
              </span>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
        <button
          onClick={onClose}
          style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid var(--border)", background: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "13px" }}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid var(--btn-active-bg)", background: "var(--btn-active-bg)", color: "var(--btn-active-text)", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default function WatchlistPanel({
  data,
  watchedAddresses,
  onUnwatch,
  address,
  columnConfig,
  onColumnConfigChange,
  showTooltip,
  moveTooltip,
  hideTooltip,
  toggleTooltip,
  compact = false,
}) {
  const prefersTouchUi = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(hover: none), (max-width: 1023px)").matches;
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [sortKey, setSortKey] = useState("Opp");
  const [sortDir, setSortDir] = useState("desc");
  const [rankExpand, setRankExpand] = useState(null); // { address, colKey }

  const activeKeys = new Set(columnConfig?.keys || DEFAULT_COLUMNS);
  const columnOrder = columnConfig?.order || DEFAULT_COLUMNS;

  const orderedActiveColumns = [
    { key: "Project", label: "Project", type: "string" },
    ...columnOrder
      .filter((k) => k !== "Project" && activeKeys.has(k))
      .map((k) => ALL_COLUMNS.find((c) => c.key === k))
      .filter(Boolean),
    ...ALL_COLUMNS.filter((c) => c.key !== "Project" && activeKeys.has(c.key) && !columnOrder.includes(c.key)),
  ];

  const watchedRows = (data || []).filter((d) =>
    watchedAddresses.includes((d["Address"] || "").toLowerCase())
  );

  function handleSort(key) {
    if (sortKey === key) setSortDir(sortDir === "desc" ? "asc" : "desc");
    else { setSortKey(key); setSortDir("desc"); }
  }

  const sorted = [...watchedRows].sort((a, b) => {
    const col = orderedActiveColumns.find((c) => c.key === sortKey) || orderedActiveColumns[0];
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

  if (!address) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "48px", gap: "12px" }}>
        <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--text)", background: "var(--bg)", padding: "12px 20px", borderRadius: "8px", border: "1px solid var(--border)" }}>
          🔒 Connect a wallet holding 10M+ CLAWD to use the Watchlist
        </p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted)" }}>
          {sorted.length === 0
            ? "No tokens starred yet — click ⭐ on any row to add."
            : `${sorted.length} token${sorted.length !== 1 ? "s" : ""} watched`}
        </p>
        <button
          onClick={() => setShowCustomizer(true)}
          style={{
            padding: "5px 12px", borderRadius: "6px", border: "1px solid var(--border)",
            background: "var(--btn-inactive-bg)", color: "var(--btn-inactive-text)",
            cursor: "pointer", fontSize: "12px",
          }}
        >
          Customize columns
        </button>
      </div>

      {showCustomizer && (
        <ColumnCustomizer
          activeKeys={[...activeKeys]}
          order={columnOrder}
          onChange={onColumnConfigChange}
          onClose={() => setShowCustomizer(false)}
        />
      )}

      {sorted.length === 0 ? (
        <div style={{ padding: "48px 0", textAlign: "center", color: "var(--text-faint)", fontSize: "13px" }}>
          Star tokens from any tab to build your watchlist.
        </div>
      ) : (
        <div data-h-scroll className="tw-hscroll has-actions" style={{ overflowX: "auto", fontSize: compact ? "11px" : undefined }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                <th className="tw-sticky-actions" style={{ width: compact ? "22px" : "28px", borderBottom: "1px solid var(--border-strong)", padding: compact ? "4px 4px" : "6px 8px" }} />
                {orderedActiveColumns.map((col) => (
                  <th
                    key={col.key}
                    className={col.key === "Project" ? "tw-sticky-project" : undefined}
                    onClick={() => handleSort(col.key)}
                    style={{
                      textAlign: "left", borderBottom: "1px solid var(--border-strong)",
                      padding: compact ? "4px 6px" : "6px 12px", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap",
                      color: "var(--text)",
                    }}
                  >
                    {col.label}
                    {sortKey === col.key ? (sortDir === "desc" ? " ▼" : " ▲") : ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => {
                const address = d["Address"];
                const expandCol = rankExpand?.address === address
                  ? orderedActiveColumns.find((c) => c.key === rankExpand.colKey)
                  : null;
                const expandRank = expandCol
                  ? peerRank(expandCol.key, d[expandCol.key], data || [])
                  : null;
                return (
                <Fragment key={address}>
                <tr>
                  <td className="tw-sticky-actions" style={{ padding: compact ? "2px 4px" : "4px 8px", whiteSpace: "nowrap", width: compact ? "22px" : "28px" }}>
                    <button
                      className="tw-icon-btn"
                      onClick={() => onUnwatch(d["Address"])}
                      title="Remove from watchlist"
                      style={{
                        background: "none", border: "none", cursor: "pointer",
                        fontSize: compact ? "12px" : "16px", lineHeight: 1, padding: "0 2px",
                        color: "#f5c518",
                      }}
                    >
                      ⭐
                    </button>
                  </td>
                  {orderedActiveColumns.map((col) => {
                    const cellContent = col.key === "read"
                      ? <ReadBadge value={d[col.key]} />
                      : col.format ? formatValue(d[col.key], col.format)
                      : (d[col.key] ?? "—");
                    const rankInfo = col.type === "number" ? peerRank(col.key, d[col.key], data || []) : null;
                    const rankTooltipContent = rankInfo ? (
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "15px", marginBottom: "4px" }}>
                          #{rankInfo.rank}{" "}
                          <span style={{ color: "var(--text-faint)", fontWeight: 400 }}>of {rankInfo.total}</span>
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
                          Rank for <strong>{col.label}</strong> among tracked peers
                        </div>
                        <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "4px", borderTop: "1px solid var(--border)", paddingTop: "4px" }}>
                          1 = best · {rankInfo.total} = worst
                        </div>
                      </div>
                    ) : null;
                    const touch = prefersTouchUi();
                    return (
                      <td
                        key={col.key}
                        className={col.key === "Project" ? "tw-sticky-project" : undefined}
                        style={{
                          padding: compact ? "3px 6px" : "6px 12px",
                          whiteSpace: "nowrap",
                          color: "var(--text)",
                          cursor: rankInfo ? "pointer" : undefined,
                          background: rankExpand?.address === address && rankExpand?.colKey === col.key
                            ? "var(--bg-subtle)" : undefined,
                        }}
                        onMouseEnter={!touch && rankTooltipContent && showTooltip ? (e) => showTooltip(rankTooltipContent, e, RANK_TOOLTIP_DELAY) : undefined}
                        onMouseMove={!touch && rankTooltipContent && moveTooltip ? moveTooltip : undefined}
                        onMouseLeave={!touch && rankTooltipContent && hideTooltip ? hideTooltip : undefined}
                        onClick={rankInfo && touch ? (e) => {
                          e.stopPropagation();
                          setRankExpand((prev) =>
                            prev?.address === address && prev?.colKey === col.key
                              ? null
                              : { address, colKey: col.key }
                          );
                        } : undefined}
                      >
                        {col.key === "Project" ? (
                          <span className="tw-name-clip" title={String(d[col.key] ?? "")}>{cellContent}</span>
                        ) : cellContent}
                      </td>
                    );
                  })}
                </tr>
                {expandCol && expandRank ? (
                  <tr key={`${address}-rank`}>
                    <td
                      colSpan={orderedActiveColumns.length + 1}
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
                      <span style={{ color: "var(--text-faint)" }}> — tap again to close</span>
                    </td>
                  </tr>
                ) : null}
                </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
