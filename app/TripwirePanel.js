"use client";
import { useState, useRef } from "react";

const COLUMNS = [
  { key: "Project", label: "Project" },
  { key: "marketCapUsd", label: "Market Cap", format: "usd" },
  { key: "Wallets 15m", label: "Active Wallets 15m" },
  { key: "Txs 15m", label: "Txs 15m" },
  { key: "Wallets 1h", label: "Active Wallets 1h" },
  { key: "Txs 1h", label: "Txs 1h" },
  { key: "Wallets 6h", label: "Active Wallets 6h" },
  { key: "Txs 6h", label: "Txs 6h" },
  { key: "Wallets 24h", label: "Active Wallets 24h" },
  { key: "Txs 24h", label: "Txs 24h" },
];

const TRIPWIRE_KEY_METRICS = [
  { name: "Txs 15m / 1h / 6h / 24h",            desc: "On-chain transactions in each window — a spike means something just happened" },
  { name: "Active Wallets 15m / 1h / 6h / 24h", desc: "Unique wallets that transacted — distinguishes broad activity from one whale moving" },
  { name: "Market Cap",                          desc: "Live market cap from CoinGecko at time of query" },
];

function MetricPill({ name, desc }) {
  return (
    <div style={{
      background: "var(--bg-muted)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      padding: "8px 14px",
      minWidth: "180px",
      maxWidth: "240px",
      flex: "1 1 180px",
    }}>
      <div style={{ fontWeight: 700, fontSize: "12px", color: "var(--text)", marginBottom: "3px" }}>{name}</div>
      <div style={{ fontSize: "11px", color: "var(--text-muted)", lineHeight: "1.4" }}>{desc}</div>
    </div>
  );
}

function formatValue(val, format) {
  if (val == null || val === "") return "—";
  if (format === "usd") return `$${Number(val).toLocaleString()}`;
  return val;
}

export default function TripwirePanel({ hasAccess, walletAddress = null }) {
  const [status, setStatus] = useState("idle");
  const [rows, setRows] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [sortKey, setSortKey] = useState("Txs 15m");
  const [sortDir, setSortDir] = useState("desc");
  const pollRef = useRef(null);
  const attemptsRef = useRef(0);

  function stopPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  function wireHeaders() {
    const h = {};
    if (walletAddress) h["x-wallet-address"] = String(walletAddress).toLowerCase();
    return h;
  }

  async function runTripwire() {
    setStatus("starting");
    setErrorMsg("");
    setRows([]);
    attemptsRef.current = 0;

    try {
      const startRes = await fetch("/api/tripwire/start", {
        method: "POST",
        headers: wireHeaders(),
      });
      const startJson = await startRes.json();
      if (!startRes.ok || !startJson.executionId) {
        throw new Error(startJson.error || "Failed to start The Wire run");
      }

      setStatus("running");
      pollRef.current = setInterval(async () => {
        attemptsRef.current += 1;
        if (attemptsRef.current > 90) {
          stopPolling();
          setStatus("error");
          setErrorMsg("Taking longer than expected. Try again in a moment.");
          return;
        }
        try {
          const statusRes = await fetch(
            `/api/tripwire/status?executionId=${startJson.executionId}`,
            { headers: wireHeaders() }
          );
          const statusJson = await statusRes.json();
          if (statusJson.state === "QUERY_STATE_COMPLETED") {
            stopPolling();
            setRows(statusJson.rows || []);
            setStatus("done");
          } else if (statusJson.state === "QUERY_STATE_FAILED" || statusJson.state === "QUERY_STATE_CANCELLED") {
            stopPolling();
            setStatus("error");
            setErrorMsg("Dune query failed or was cancelled.");
          }
        } catch {
          // transient fetch error, keep trying until attempt limit
        }
      }, 2000);
    } catch (err) {
      setStatus("error");
      setErrorMsg(String(err.message || err));
    }
  }

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(sortDir === "desc" ? "asc" : "desc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sorted = [...rows].sort((a, b) => {
    let aVal = a[sortKey];
    let bVal = b[sortKey];
    if (sortKey === "Project") {
      aVal = aVal == null ? "" : String(aVal);
      bVal = bVal == null ? "" : String(bVal);
      return sortDir === "desc" ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
    }
    aVal = aVal == null || aVal === "" ? -Infinity : Number(aVal);
    bVal = bVal == null || bVal === "" ? -Infinity : Number(bVal);
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  const isRunning = status === "starting" || status === "running";

  // Explanation block — always visible
  const explanationBlock = (
    <div style={{
      background: "var(--bg-subtle)",
      border: "1px solid var(--border)",
      borderRadius: "8px",
      padding: "12px 16px",
      marginBottom: "20px",
      fontSize: "13px",
      color: "var(--text-muted)",
      lineHeight: "1.6",
      maxWidth: "680px",
    }}>
      The Wire is an on-demand pulse check — it runs a fresh Dune query and returns wallets + txs for
      the last 15 minutes, 1 hour, 6 hours, and 24 hours across every tracked project. Use it right after
      news breaks, a token gets mentioned, or you want to know what is moving right now. It usually
      finishes in under a minute. Usage may be limited to stay within free-tier Dune query credits.
    </div>
  );

  if (!hasAccess) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: "24px" }}>
        {explanationBlock}
        <button
          disabled
          style={{
            padding: "16px 40px",
            borderRadius: "8px",
            border: "1px solid var(--border-strong)",
            background: "var(--bg-muted)",
            color: "var(--text-faint)",
            cursor: "not-allowed",
            fontWeight: 700,
            fontSize: "16px",
          }}
        >
          🔒 Run The Wire
        </button>
        <span style={{ color: "var(--text-faint)", fontSize: "13px", marginTop: "10px" }}>
          Connect a wallet holding 10M+ CLAWD to use The Wire.
        </span>
      </div>
    );
  }

  return (
    <div>
      {/* Explanation + button — centered, always visible */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>
        {explanationBlock}
        <button
          onClick={runTripwire}
          disabled={isRunning}
          style={{
            padding: "16px 40px",
            borderRadius: "8px",
            border: isRunning ? "1px solid var(--border-strong)" : "1px solid var(--btn-active-bg)",
            background: isRunning ? "var(--text-faint)" : "var(--btn-active-bg)",
            color: "var(--btn-active-text)",
            cursor: isRunning ? "not-allowed" : "pointer",
            fontWeight: 700,
            fontSize: "16px",
          }}
        >
          {status === "starting" && "Starting…"}
          {status === "running" && "Running on Dune…"}
          {(status === "idle" || status === "done" || status === "error") && "Trip The Wire"}
        </button>

        {status === "running" && (
          <span style={{ marginTop: "10px", color: "var(--text-muted)", fontSize: "13px", textAlign: "center" }}>
            Calling Dune fresh — usually under a minute.
          </span>
        )}
        {status === "error" && (
          <span style={{ marginTop: "10px", color: "#c0392b", fontSize: "13px" }}>
            {errorMsg}
          </span>
        )}
      </div>

      {/* Column key — only after results load */}
      {rows.length > 0 && (
        <details style={{ marginBottom: "16px" }}>
          <summary style={{ cursor: "pointer", fontWeight: 600, fontSize: "14px", color: "var(--text)", marginBottom: "8px" }}>
            Key: what am I looking at?
          </summary>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
            {TRIPWIRE_KEY_METRICS.map((m) => (
              <MetricPill key={m.name} name={m.name} desc={m.desc} />
            ))}
          </div>
        </details>
      )}

      {status === "done" && rows.length === 0 && (
        <p style={{ color: "var(--text-muted)", textAlign: "center" }}>No activity in the last 24h.</p>
      )}

      {rows.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%" }}>
            <thead>
              <tr>
                {COLUMNS.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    style={{
                      textAlign: "left",
                      borderBottom: "1px solid var(--border-strong)",
                      padding: "6px 12px",
                      cursor: "pointer",
                      userSelect: "none",
                      whiteSpace: "nowrap",
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
              {sorted.map((r) => (
                <tr key={r["Address"] || r["Project"]}>
                  {COLUMNS.map((col) => (
                    <td key={col.key} style={{ padding: "6px 12px", whiteSpace: "nowrap", color: "var(--text)" }}>
                      {col.format ? formatValue(r[col.key], col.format) : r[col.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
