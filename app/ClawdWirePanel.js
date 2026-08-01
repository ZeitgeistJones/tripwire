"use client";
import { useState, useRef, useEffect, useCallback } from "react";

const SYNC_MS = 45_000;

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function fmtUsd(v, digits = 0) {
  const n = num(v);
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: digits })}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function fmtInt(v) {
  const n = num(v);
  if (n == null) return "—";
  return Math.round(n).toLocaleString();
}

function fmtPct(v) {
  const n = num(v);
  if (n == null) return "—";
  return `${n.toFixed(1)}%`;
}

function fmtScore(v) {
  const n = num(v);
  if (n == null) return "—";
  return n.toFixed(1);
}

function fmtRatio(v) {
  const n = num(v);
  if (n == null) return "—";
  return n.toFixed(2);
}

function fmtMins(v) {
  const n = num(v);
  if (n == null) return "—";
  if (n < 60) return `${Math.round(n)}m`;
  if (n < 60 * 24) return `${(n / 60).toFixed(1)}h`;
  return `${(n / (60 * 24)).toFixed(1)}d`;
}

function fmtText(v) {
  if (v == null || v === "") return "—";
  const s = String(v);
  // Peak hour timestamps from Dune — show compact UTC
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s.endsWith("Z") || s.includes("+") ? s : `${s}Z`);
    if (!Number.isNaN(d.getTime())) {
      return d.toISOString().slice(0, 16).replace("T", " ") + "Z";
    }
  }
  return s;
}

function shortAddr(addr) {
  if (!addr || addr.length < 12) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

function parseWalletLines(raw) {
  if (raw == null || raw === "") return [];
  return String(raw)
    .split(" | ")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(" · ").map((p) => p.trim());
      const wallet = parts.find((p) => /^0x[a-fA-F0-9]{40}$/.test(p)) || null;
      const txPart = parts.find((p) => /^tx0x[a-fA-F0-9]+$/i.test(p));
      const tx = txPart ? txPart.replace(/^tx/i, "") : null;
      const rest = parts.filter((p) => p !== wallet && p !== txPart);
      return { wallet, tx, detail: rest.join(" · ") || line };
    });
}

function WalletLens({ title, subtitle, raw }) {
  const lines = parseWalletLines(raw);
  return (
    <section style={{ marginBottom: "22px", animation: "cwFadeIn 0.5s ease both" }}>
      <div style={{ marginBottom: "10px" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: "3px 0 0", fontSize: "12px", color: "var(--text-faint)" }}>
            {subtitle}
          </p>
        )}
      </div>
      {lines.length === 0 ? (
        <Stat label="—" value="—" />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {lines.map((line, i) => (
            <div
              key={`${title}-${i}`}
              style={{
                background: "var(--bg-subtle)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                padding: "12px 14px",
                display: "flex",
                flexWrap: "wrap",
                gap: "8px 14px",
                alignItems: "baseline",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--text-faint)", minWidth: 18 }}>
                {i + 1}
              </span>
              {line.wallet ? (
                <a
                  href={`https://basescan.org/address/${line.wallet}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--text)",
                    textDecoration: "none",
                    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
                  }}
                  title={line.wallet}
                >
                  {shortAddr(line.wallet)}
                </a>
              ) : null}
              <span style={{ fontSize: "13px", color: "var(--text-muted)", flex: "1 1 160px" }}>
                {line.detail}
              </span>
              {line.tx ? (
                <a
                  href={`https://basescan.org/tx/${line.tx}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "12px", color: "var(--text-faint)", textDecoration: "underline" }}
                >
                  tx {shortAddr(line.tx)}
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function netColor(v) {
  const n = num(v);
  if (n == null || n === 0) return "var(--text)";
  return n > 0 ? "var(--read-teal-text)" : "var(--read-coral-text)";
}

function RankChip({ label, score, rank, total }) {
  return (
    <div
      style={{
        background: "var(--bg)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: "12px 14px",
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-faint)", letterSpacing: "0.04em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: "22px", fontWeight: 700, color: "var(--text)", marginTop: "4px", fontVariantNumeric: "tabular-nums" }}>
        {fmtScore(score)}
      </div>
      <div style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
        {rank != null && total ? `Rank ${rank} / ${total}` : "—"}
      </div>
    </div>
  );
}

function Stat({ label, value, color, large }) {
  return (
    <div
      style={{
        background: "var(--bg-subtle)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        padding: large ? "16px 18px" : "12px 14px",
        minWidth: 0,
        animation: "cwFadeIn 0.45s ease both",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "var(--text-faint)",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: large ? "28px" : "18px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: color || "var(--text)",
          lineHeight: 1.15,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function WindowBlock({ title, subtitle, children }) {
  return (
    <section style={{ marginBottom: "22px", animation: "cwFadeIn 0.5s ease both" }}>
      <div style={{ marginBottom: "10px" }}>
        <h3
          style={{
            margin: 0,
            fontSize: "15px",
            fontWeight: 700,
            color: "var(--text)",
            letterSpacing: "-0.01em",
          }}
        >
          {title}
        </h3>
        {subtitle && (
          <p style={{ margin: "3px 0 0", fontSize: "12px", color: "var(--text-faint)" }}>
            {subtitle}
          </p>
        )}
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
          gap: "10px",
        }}
      >
        {children}
      </div>
    </section>
  );
}

export default function ClawdWirePanel({
  hasAccess,
  walletAddress = null,
  onMeta = null,
  clawdRow = null,
  opportunityRank = null,
  momentumRank = null,
  sustainabilityRank = null,
  totalProjects = null,
}) {
  const [status, setStatus] = useState("idle");
  const [row, setRow] = useState(null);
  const [lastRunAt, setLastRunAt] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [syncHint, setSyncHint] = useState("");
  const pollRef = useRef(null);
  const attemptsRef = useRef(0);
  const lastRunRef = useRef(null);
  const executingRef = useRef(false);

  function stopExecPoll() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }

  function wireHeaders() {
    const h = {};
    if (walletAddress) h["x-wallet-address"] = String(walletAddress).toLowerCase();
    return h;
  }

  const publishMeta = useCallback(
    (runAt, syncing) => {
      onMeta?.({ lastRunAt: runAt, syncing: !!syncing });
    },
    [onMeta]
  );

  const applyPayload = useCallback(
    (json, { quiet } = {}) => {
      const nextRun = json.lastRunAt || null;
      const nextRow = (json.rows && json.rows[0]) || null;
      const prev = lastRunRef.current;
      const newer =
        nextRun && (!prev || new Date(nextRun).getTime() > new Date(prev).getTime());

      if (nextRow) setRow(nextRow);
      if (nextRun && (newer || !prev)) {
        lastRunRef.current = nextRun;
        setLastRunAt(nextRun);
        publishMeta(nextRun, false);
        if (!quiet && prev && newer) setSyncHint("Picked up a newer Dune run");
      } else {
        publishMeta(lastRunRef.current || nextRun, false);
      }
    },
    [publishMeta]
  );

  const pullLatest = useCallback(
    async ({ quiet = true } = {}) => {
      if (executingRef.current) return;
      try {
        if (!quiet) publishMeta(lastRunRef.current, true);
        const res = await fetch("/api/clawdwire/latest", {
          headers: wireHeaders(),
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          if (!quiet) setErrorMsg(json.error || "Failed to load latest results");
          publishMeta(lastRunRef.current, false);
          return;
        }
        applyPayload(json, { quiet });
        if (!quiet && status === "idle") setStatus("done");
      } catch (err) {
        if (!quiet) setErrorMsg(String(err.message || err));
        publishMeta(lastRunRef.current, false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applyPayload, publishMeta, status, walletAddress]
  );

  useEffect(() => {
    if (!hasAccess) return undefined;
    pullLatest({ quiet: true });
    const id = setInterval(() => pullLatest({ quiet: true }), SYNC_MS);

    function onVis() {
      if (document.visibilityState === "visible") pullLatest({ quiet: true });
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      stopExecPoll();
    };
  }, [hasAccess, pullLatest]);

  useEffect(() => {
    if (!syncHint) return undefined;
    const t = setTimeout(() => setSyncHint(""), 4000);
    return () => clearTimeout(t);
  }, [syncHint]);

  async function runClawdWire() {
    executingRef.current = true;
    setStatus("starting");
    setErrorMsg("");
    setSyncHint("");
    attemptsRef.current = 0;
    publishMeta(lastRunRef.current, true);

    try {
      const startRes = await fetch("/api/clawdwire/start", {
        method: "POST",
        headers: wireHeaders(),
      });
      const startJson = await startRes.json();
      if (!startRes.ok || !startJson.executionId) {
        throw new Error(startJson.error || "Failed to start ClawdWire run");
      }

      setStatus("running");
      pollRef.current = setInterval(async () => {
        attemptsRef.current += 1;
        if (attemptsRef.current > 90) {
          stopExecPoll();
          executingRef.current = false;
          setStatus("error");
          setErrorMsg("Taking longer than expected. Try again in a moment.");
          publishMeta(lastRunRef.current, false);
          return;
        }
        try {
          const statusRes = await fetch(
            `/api/clawdwire/status?executionId=${startJson.executionId}`,
            { headers: wireHeaders() }
          );
          const statusJson = await statusRes.json();
          if (statusJson.state === "QUERY_STATE_COMPLETED") {
            stopExecPoll();
            executingRef.current = false;
            applyPayload(statusJson, { quiet: false });
            setStatus("done");
            setSyncHint("Fresh execute complete");
          } else if (
            statusJson.state === "QUERY_STATE_FAILED" ||
            statusJson.state === "QUERY_STATE_CANCELLED"
          ) {
            stopExecPoll();
            executingRef.current = false;
            setStatus("error");
            setErrorMsg("Dune query failed or was cancelled.");
            publishMeta(lastRunRef.current, false);
          }
        } catch {
          // keep polling
        }
      }, 2000);
    } catch (err) {
      executingRef.current = false;
      setStatus("error");
      setErrorMsg(String(err.message || err));
      publishMeta(lastRunRef.current, false);
    }
  }

  const isRunning = status === "starting" || status === "running";

  if (!hasAccess) {
    return (
      <div style={{ paddingTop: "24px", textAlign: "center", color: "var(--text-muted)", fontSize: "13px" }}>
        Tester wallet only while under construction.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "920px" }}>
      <style>{`
        @keyframes cwFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Hero */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "16px",
          marginBottom: "22px",
          padding: "20px 22px",
          borderRadius: "12px",
          border: "1px solid var(--clawd-row-border)",
          background:
            "linear-gradient(145deg, rgba(122,184,74,0.14) 0%, var(--bg-subtle) 42%, var(--bg) 100%)",
          animation: "cwFadeIn 0.4s ease both",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "var(--clawd-row-border)",
              marginBottom: "6px",
            }}
          >
            On-chain pulse
          </div>
          <div
            style={{
              fontSize: "42px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--text)",
              lineHeight: 1,
            }}
          >
            CLAWD
          </div>
          <div style={{ marginTop: "8px", fontSize: "14px", color: "var(--text-muted)" }}>
            Market cap {fmtUsd(row?.marketCapUsd ?? clawdRow?.marketCapUsd)}
            {clawdRow?.Prof ? ` · ${clawdRow.Prof}` : ""}
            {clawdRow?.signal ? ` · ${clawdRow.signal}` : ""}
            {clawdRow?.read ? ` · ${clawdRow.read}` : ""}
          </div>
          <div style={{ marginTop: "4px", fontSize: "12px", color: "var(--text-faint)" }}>
            {lastRunAt
              ? `Pulse run ${new Date(lastRunAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
              : "Waiting for first Dune pulse run"}
            {" · "}
            Scores from shared snapshot (Pull Dune / Refresh prices)
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
          <button
            type="button"
            onClick={runClawdWire}
            disabled={isRunning}
            style={{
              padding: "12px 22px",
              borderRadius: "8px",
              border: isRunning ? "1px solid var(--border-strong)" : "1px solid var(--clawd-row-border)",
              background: isRunning ? "var(--text-faint)" : "var(--clawd-row-border)",
              color: isRunning ? "var(--btn-active-text)" : "#0f140c",
              cursor: isRunning ? "not-allowed" : "pointer",
              fontWeight: 700,
              fontSize: "14px",
            }}
          >
            {status === "starting" && "Starting…"}
            {status === "running" && "Running on Dune…"}
            {!isRunning && "Trip ClawdWire"}
          </button>
          <button
            type="button"
            onClick={() => pullLatest({ quiet: false })}
            disabled={isRunning}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: isRunning ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: 600,
            }}
          >
            Sync latest (no re-run)
          </button>
        </div>
      </div>

      {syncHint && (
        <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--read-teal-text)" }}>{syncHint}</p>
      )}
      {status === "error" && errorMsg && (
        <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--read-coral-text)" }}>{errorMsg}</p>
      )}
      {isRunning && (
        <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--text-muted)" }}>
          Executing on Dune — results will land here automatically.
        </p>
      )}

      {!row && !isRunning && (
        <p style={{ color: "var(--text-muted)", fontSize: "13px" }}>
          No results yet. Run the query on Dune or hit Trip ClawdWire — this page auto-syncs every ~45s.
        </p>
      )}

      {/* Chunk A — scored snapshot (no Dune cost) */}
      {clawdRow && (
        <section style={{ marginBottom: "26px", animation: "cwFadeIn 0.45s ease both" }}>
          <div style={{ marginBottom: "10px" }}>
            <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--text)" }}>
              Tripwire scores
            </h3>
            <p style={{ margin: "3px 0 0", fontSize: "12px", color: "var(--text-faint)" }}>
              From the shared dashboard snapshot — not recomputed on each pulse
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
              gap: "10px",
              marginBottom: "10px",
            }}
          >
            <RankChip label="Opportunity" score={clawdRow.Opp} rank={opportunityRank} total={totalProjects} />
            <RankChip label="Momentum" score={clawdRow.Mom} rank={momentumRank} total={totalProjects} />
            <RankChip label="Sustainability" score={clawdRow.Sus} rank={sustainabilityRank} total={totalProjects} />
            <Stat label="Quality %" value={fmtPct(clawdRow["Qlty %"])} />
            <Stat label="Risk %" value={fmtPct(clawdRow["Risk %"])} />
            <Stat label="Price 24h" value={fmtPct(clawdRow.priceChange7d)} color={netColor(clawdRow.priceChange7d)} />
          </div>
          {clawdRow.signalNote && (
            <div style={{ fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.45 }}>
              Signal note: {clawdRow.signalNote}
            </div>
          )}
        </section>
      )}

      {row && (
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              gap: "12px",
              marginBottom: "28px",
            }}
          >
            <Stat label="Net $ 15m" value={fmtUsd(row["Net USD 15m"])} color={netColor(row["Net USD 15m"])} large />
            <Stat label="Net $ 1h" value={fmtUsd(row["Net USD 1h"])} color={netColor(row["Net USD 1h"])} large />
            <Stat label="Net $ 6h" value={fmtUsd(row["Net USD 6h"])} color={netColor(row["Net USD 6h"])} large />
            <Stat label="Net $ 24h" value={fmtUsd(row["Net USD 24h"])} color={netColor(row["Net USD 24h"])} large />
          </div>

          <WindowBlock title="15 minutes" subtitle="Immediate heat">
            <Stat label="Wallets" value={fmtInt(row["Wallets 15m"])} />
            <Stat label="Txs" value={fmtInt(row["Txs 15m"])} />
            <Stat label="Buy $" value={fmtUsd(row["Buy USD 15m"])} color="var(--read-teal-text)" />
            <Stat label="Sell $" value={fmtUsd(row["Sell USD 15m"])} color="var(--read-coral-text)" />
            <Stat label="Max trade $" value={fmtUsd(row["Max Trade USD 15m"])} />
          </WindowBlock>

          <WindowBlock title="1 hour" subtitle="Short pulse">
            <Stat label="Wallets" value={fmtInt(row["Wallets 1h"])} />
            <Stat label="Txs" value={fmtInt(row["Txs 1h"])} />
            <Stat label="Buy $" value={fmtUsd(row["Buy USD 1h"])} color="var(--read-teal-text)" />
            <Stat label="Sell $" value={fmtUsd(row["Sell USD 1h"])} color="var(--read-coral-text)" />
            <Stat label="Buyers" value={fmtInt(row["Buyers 1h"])} />
            <Stat label="Sellers" value={fmtInt(row["Sellers 1h"])} />
            <Stat label="Buy vol %" value={fmtPct(row["Buy Vol % 1h"])} />
            <Stat label="Max trade $" value={fmtUsd(row["Max Trade USD 1h"])} />
          </WindowBlock>

          <WindowBlock title="6 hours" subtitle="Session flow">
            <Stat label="Wallets" value={fmtInt(row["Wallets 6h"])} />
            <Stat label="Txs" value={fmtInt(row["Txs 6h"])} />
            <Stat label="Buy $" value={fmtUsd(row["Buy USD 6h"])} color="var(--read-teal-text)" />
            <Stat label="Sell $" value={fmtUsd(row["Sell USD 6h"])} color="var(--read-coral-text)" />
            <Stat label="Buyers" value={fmtInt(row["Buyers 6h"])} />
            <Stat label="Sellers" value={fmtInt(row["Sellers 6h"])} />
            <Stat label="Buy vol %" value={fmtPct(row["Buy Vol % 6h"])} />
            <Stat label="Max trade $" value={fmtUsd(row["Max Trade USD 6h"])} />
          </WindowBlock>

          <WindowBlock title="24 hours" subtitle="Full-day money + activity">
            <Stat label="Wallets" value={fmtInt(row["Wallets 24h"])} />
            <Stat label="Txs" value={fmtInt(row["Txs 24h"])} />
            <Stat label="Buy $" value={fmtUsd(row["Buy USD 24h"])} color="var(--read-teal-text)" />
            <Stat label="Sell $" value={fmtUsd(row["Sell USD 24h"])} color="var(--read-coral-text)" />
            <Stat label="Buyers" value={fmtInt(row["Buyers 24h"])} />
            <Stat label="Sellers" value={fmtInt(row["Sellers 24h"])} />
            <Stat label="Buy vol %" value={fmtPct(row["Buy Vol % 24h"])} />
            <Stat label="Max trade $" value={fmtUsd(row["Max Trade USD 24h"])} />
          </WindowBlock>

          <WindowBlock
            title="Whales 24h"
            subtitle={`Live tiers · whale ≥ ${fmtUsd(row["Whale Min $"])} · hump ≥ ${fmtUsd(row["Hump Min $"])} (30d CLAWD percentiles)`}
          >
            <Stat label="Whale net $" value={fmtUsd(row["Whale Net 24h"])} color={netColor(row["Whale Net 24h"])} large />
            <Stat label="Hump net $" value={fmtUsd(row["Hump Net 24h"])} color={netColor(row["Hump Net 24h"])} large />
            <Stat label="Retail net $" value={fmtUsd(row["Retail Net 24h"])} color={netColor(row["Retail Net 24h"])} large />
            <Stat label="Accum %" value={fmtPct(row["Accum % 24h"])} />
            <Stat label="Whale vol %" value={fmtPct(row["Whale Vol % 24h"])} />
            <Stat label="Whale buyers" value={fmtInt(row["Whale Buyers 24h"])} />
            <Stat label="Whale sellers" value={fmtInt(row["Whale Sellers 24h"])} />
            <Stat label="Hump buyers" value={fmtInt(row["Hump Buyers 24h"])} />
            <Stat label="Hump sellers" value={fmtInt(row["Hump Sellers 24h"])} />
            <Stat
              label="W/R div (bps)"
              value={(() => {
                const mcap = num(row?.marketCapUsd ?? clawdRow?.marketCapUsd);
                const w = num(row["Whale Net 24h"]);
                const r = num(row["Retail Net 24h"]);
                if (mcap == null || mcap <= 0 || w == null || r == null) return "—";
                return ((w - r) / mcap * 10000).toFixed(1);
              })()}
            />
          </WindowBlock>

          <WindowBlock
            title="Whales 7d"
            subtitle="Same tier logic as the CLAWD tab / main dashboard"
          >
            <Stat label="Whale net $" value={fmtUsd(row["Whale Net 7d"])} color={netColor(row["Whale Net 7d"])} large />
            <Stat label="Hump net $" value={fmtUsd(row["Hump Net 7d"])} color={netColor(row["Hump Net 7d"])} large />
            <Stat label="Retail net $" value={fmtUsd(row["Retail Net 7d"])} color={netColor(row["Retail Net 7d"])} large />
            <Stat label="Accum %" value={fmtPct(row["Accum %"])} />
            <Stat label="Whale vol %" value={fmtPct(row["Whale Vol %"])} />
            <Stat label="Buy vol % 7d" value={fmtPct(row["Buy Vol % 7d"])} />
            <Stat label="Whale buyers" value={fmtInt(row["Whale Buyers 7d"])} />
            <Stat label="Whale sellers" value={fmtInt(row["Whale Sellers 7d"])} />
            <Stat label="Hump buyers" value={fmtInt(row["Hump Buyers 7d"])} />
            <Stat label="Hump sellers" value={fmtInt(row["Hump Sellers 7d"])} />
            <Stat
              label="W/R div (bps)"
              value={(() => {
                const mcap = num(row?.marketCapUsd ?? clawdRow?.marketCapUsd);
                const w = num(row["Whale Net 7d"]);
                const r = num(row["Retail Net 7d"]);
                if (mcap == null || mcap <= 0 || w == null || r == null) return "—";
                return ((w - r) / mcap * 10000).toFixed(1);
              })()}
            />
          </WindowBlock>

          <WindowBlock
            title="Stickiness"
            subtitle="New vs returning traders in the 30d CLAWD window (1st buy/sell = first seen in that window)"
          >
            <Stat label="Vol 24h" value={fmtUsd(row["Vol 24h"])} large />
            <Stat label="Vol 7d" value={fmtUsd(row["Vol 7d"])} large />
            <Stat label="Vol 30d" value={fmtUsd(row["Vol 30d"])} large />
            <Stat label="Wallets 7d" value={fmtInt(row["Wallets 7d"])} />
            <Stat label="Txs 7d" value={fmtInt(row["Txs 7d"])} />
            <Stat label="Traders 24h" value={fmtInt(row["Traders 24h"])} />
            <Stat label="Traders 7d" value={fmtInt(row["Traders 7d"])} />
            <Stat label="Traders 30d" value={fmtInt(row["Traders 30d"])} />
            <Stat label="New traders 7d" value={fmtInt(row["New Traders 7d"])} />
            <Stat label="Returning 7d" value={fmtInt(row["Returning Traders 7d"])} />
            <Stat label="Returning % 7d" value={fmtPct(row["Returning % 7d"])} />
            <Stat label="Buy/sell ratio 24h" value={fmtRatio(row["Buy/Sell Ratio 24h"])} />
            <Stat label="Buy/sell ratio 7d" value={fmtRatio(row["Buy/Sell Ratio 7d"])} />
            <Stat label="Buyers 7d" value={fmtInt(row["Buyers 7d"])} />
            <Stat label="Sellers 7d" value={fmtInt(row["Sellers 7d"])} />
            <Stat label="1st buyers 24h" value={fmtInt(row["1st Buyers 24h"])} />
            <Stat label="1st buyers 7d" value={fmtInt(row["1st Buyers 7d"])} />
            <Stat label="1st buyers 30d" value={fmtInt(row["1st Buyers 30d"])} />
            <Stat label="1st sellers 24h" value={fmtInt(row["1st Sellers 24h"])} />
            <Stat label="1st sellers 7d" value={fmtInt(row["1st Sellers 7d"])} />
            <Stat label="1st sellers 30d" value={fmtInt(row["1st Sellers 30d"])} />
            <Stat label="Buyers 30d" value={fmtInt(row["Buyers 30d"])} />
            <Stat label="Sellers 30d" value={fmtInt(row["Sellers 30d"])} />
            <Stat label="Vol/tx 24h" value={fmtUsd(row["Vol/Tx 24h"])} />
            <Stat label="Vol/tx 7d" value={fmtUsd(row["Vol/Tx 7d"])} />
            <Stat label="Vol/tx 30d" value={fmtUsd(row["Vol/Tx 30d"])} />
            <Stat label="Txs/trader 24h" value={fmtRatio(row["Txs/Trader 24h"])} />
            <Stat label="Txs/trader 7d" value={fmtRatio(row["Txs/Trader 7d"])} />
            <Stat label="Txs/trader 30d" value={fmtRatio(row["Txs/Trader 30d"])} />
          </WindowBlock>

          <WalletLens
            title="Top buyers 24h"
            subtitle="Wallet · buy $ · buy txs · net · biggest trade tx (Basescan links)"
            raw={row["Top Buyers 24h"]}
          />
          <WalletLens
            title="Top sellers 24h"
            subtitle="Wallet · sell $ · sell txs · net · biggest trade tx"
            raw={row["Top Sellers 24h"]}
          />
          <WalletLens
            title="Top net accumulators 24h"
            subtitle="Wallets with the largest buy−sell net (includes total txs)"
            raw={row["Top Net Accumulators 24h"]}
          />
          <WalletLens
            title="Biggest prints 24h"
            subtitle="Largest single DEX trades — side · $ · wallet · tx"
            raw={row["Biggest Prints 24h"]}
          />

          <WindowBlock
            title="WoW growth"
            subtitle="This 7d vs prior 7d on the same 30d CLAWD trade scan"
          >
            <Stat label="Vol grw %" value={fmtPct(row["Vol Grw %"])} color={netColor(row["Vol Grw %"])} large />
            <Stat label="Tx grw %" value={fmtPct(row["Tx Grw %"])} color={netColor(row["Tx Grw %"])} large />
            <Stat label="User grw %" value={fmtPct(row["User Grw %"])} color={netColor(row["User Grw %"])} large />
            <Stat label="Retention %" value={fmtPct(row["Retention %"])} large />
            <Stat label="Retained traders" value={fmtInt(row["Retained Traders"])} />
            <Stat label="New vs prev week" value={fmtInt(row["New vs Prev Week"])} />
            <Stat label="Vol prev 7d" value={fmtUsd(row["Vol Prev 7d"])} />
            <Stat label="Txs prev 7d" value={fmtInt(row["Txs Prev 7d"])} />
            <Stat label="Traders prev 7d" value={fmtInt(row["Traders Prev 7d"])} />
          </WindowBlock>

          <WindowBlock
            title="Heat & distribution"
            subtitle="How concentrated the day is + who is flipping both sides"
          >
            <Stat label="Heat % 1h" value={fmtPct(row["Heat % 1h"])} large />
            <Stat label="Heat % 6h" value={fmtPct(row["Heat % 6h"])} large />
            <Stat label="Trade heat % 1h" value={fmtPct(row["Trade Heat % 1h"])} />
            <Stat label="Median trade $" value={fmtUsd(row["Median Trade 24h"])} />
            <Stat label="P90 trade $" value={fmtUsd(row["P90 Trade 24h"])} />
            <Stat label="Flippers 24h" value={fmtInt(row["Flippers 24h"])} />
            <Stat label="Flipper % 24h" value={fmtPct(row["Flipper % 24h"])} />
            <Stat label="Whale traders 7d" value={fmtInt(row["Whale Traders 7d"])} />
            <Stat label="Whale active 24h" value={fmtInt(row["Whale Active 24h"])} />
            <Stat label="Whale persist %" value={fmtPct(row["Whale Persist %"])} />
          </WindowBlock>

          <WindowBlock
            title="Trade-shape signals"
            subtitle="Research heuristics from trade sizes/timing — not accusations, not proof of intent"
          >
            <Stat label="Size uniformity %" value={fmtPct(row["Size Uniformity %"])} large />
            <Stat label="Size CV 24h" value={fmtRatio(row["Size CV 24h"])} />
            <Stat label="Vol per 1% move $" value={fmtUsd(row["Vol per 1% Move $"])} large />
            <Stat label="Abs move % 24h" value={fmtPct(row["Abs Move % 24h"])} />
            <Stat label="Impact % / $1k" value={fmtPct(row["Impact % per $1k"])} />
            <Stat
              label="Round-trip vol % 24h"
              value={fmtPct(row["Round-trip Vol % 24h"] ?? row["Wash Vol % 24h"])}
              large
            />
            <Stat
              label="Round-trip wallets 24h"
              value={fmtInt(row["Round-trip Wallets 24h"] ?? row["Wash Wallets 24h"])}
            />
            <Stat label="Longest buy streak" value={fmtInt(row["Longest Buy Streak"])} />
            <Stat label="Longest sell streak" value={fmtInt(row["Longest Sell Streak"])} />
          </WindowBlock>

          <WindowBlock
            title="Conviction"
            subtitle="Diamond-hand survival of first buyers (30d window) + how fast sellers flip"
          >
            <Stat label="Survive 1h %" value={fmtPct(row["Survive 1h %"])} large />
            <Stat label="Survive 1d %" value={fmtPct(row["Survive 1d %"])} large />
            <Stat label="Survive 3d %" value={fmtPct(row["Survive 3d %"])} />
            <Stat label="Survive 7d %" value={fmtPct(row["Survive 7d %"])} />
            <Stat label="1st buyer cohort" value={fmtInt(row["1st Buyer Cohort 30d"])} />
            <Stat label="Median flip" value={fmtMins(row["Median Flip Mins"])} />
            <Stat label="Flip · new" value={fmtMins(row["Median Flip Mins New"])} />
            <Stat label="Flip · returning" value={fmtMins(row["Median Flip Mins Returning"])} />
          </WindowBlock>

          <WindowBlock
            title="Timing vs peak"
            subtitle="Aligns on-chain flow to the 24h trade-price peak (DEX implied) — match to the CG spike hour"
          >
            <Stat label="Peak hour (UTC)" value={fmtText(row["Peak Price Hour"])} large />
            <Stat label="Net before peak" value={fmtUsd(row["Net Hour Before Peak"])} color={netColor(row["Net Hour Before Peak"])} />
            <Stat label="Whale before peak" value={fmtUsd(row["Whale Net Hour Before Peak"])} color={netColor(row["Whale Net Hour Before Peak"])} />
            <Stat label="Net at peak hour" value={fmtUsd(row["Net At Peak Hour"])} color={netColor(row["Net At Peak Hour"])} large />
            <Stat label="Whale at peak hour" value={fmtUsd(row["Whale Net At Peak Hour"])} color={netColor(row["Whale Net At Peak Hour"])} large />
            <Stat label="Vol at peak hour" value={fmtUsd(row["Vol At Peak Hour"])} />
            <Stat label="Net after peak" value={fmtUsd(row["Net Hour After Peak"])} color={netColor(row["Net Hour After Peak"])} />
            <Stat label="Whale after peak" value={fmtUsd(row["Whale Net Hour After Peak"])} color={netColor(row["Whale Net Hour After Peak"])} />
            <Stat label="Worst hour net" value={fmtUsd(row["Worst Hour Net $"])} color={netColor(row["Worst Hour Net $"])} />
            <Stat label="Whale at worst hour" value={fmtUsd(row["Whale Net At Worst Hour"])} color={netColor(row["Whale Net At Worst Hour"])} />
            <Stat label="Best hour net" value={fmtUsd(row["Best Hour Net $"])} color={netColor(row["Best Hour Net $"])} />
          </WindowBlock>

          <section style={{ marginBottom: "22px", animation: "cwFadeIn 0.5s ease both" }}>
            <div style={{ marginBottom: "10px" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text)",
                  letterSpacing: "-0.01em",
                }}
              >
                Hourly tape 24h
              </h3>
              <p style={{ margin: "3px 0 0", fontSize: "12px", color: "var(--text-faint)" }}>
                UTC hour · net $ (k). Match the CG spike hour to the tape.
              </p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Stat label="All flow" value={fmtText(row["Hourly Net Tape 24h"])} />
              <Stat label="Whale flow" value={fmtText(row["Hourly Whale Tape 24h"])} />
            </div>
          </section>

          <WindowBlock
            title="Run-up window"
            subtitle="Hour before peak + peak hour — who bought the rip"
          >
            <Stat label="Run-up net $" value={fmtUsd(row["Run-up Net $"])} color={netColor(row["Run-up Net $"])} large />
            <Stat label="Buy $" value={fmtUsd(row["Run-up Buy $"])} color="var(--read-teal-text)" />
            <Stat label="Sell $" value={fmtUsd(row["Run-up Sell $"])} color="var(--read-coral-text)" />
            <Stat label="Buyers" value={fmtInt(row["Run-up Buyers"])} />
            <Stat label="Sellers" value={fmtInt(row["Run-up Sellers"])} />
          </WindowBlock>

          <WalletLens
            title="Run-up top buyers"
            subtitle="Wallets that bought in the hour before peak + peak hour"
            raw={row["Run-up Top Buyers"]}
          />
          <WalletLens
            title="Run-up top sellers"
            subtitle="Wallets that sold into the rip (same 2h window)"
            raw={row["Run-up Top Sellers"]}
          />

          <WindowBlock
            title="Dump hour"
            subtitle="Worst net hour in the last 24h — who sold the dump"
          >
            <Stat label="Dump hour net $" value={fmtUsd(row["Dump Hour Net $"])} color={netColor(row["Dump Hour Net $"])} large />
            <Stat label="Buy $" value={fmtUsd(row["Dump Hour Buy $"])} color="var(--read-teal-text)" />
            <Stat label="Sell $" value={fmtUsd(row["Dump Hour Sell $"])} color="var(--read-coral-text)" />
            <Stat label="Buyers" value={fmtInt(row["Dump Hour Buyers"])} />
            <Stat label="Sellers" value={fmtInt(row["Dump Hour Sellers"])} />
            <Stat label="Worst hour (UTC)" value={fmtText(row["Worst Net Hour"])} />
          </WindowBlock>

          <WalletLens
            title="Dump hour top sellers"
            subtitle="Wallets that sold in the worst net hour"
            raw={row["Dump Hour Top Sellers"]}
          />
          <WalletLens
            title="Dump hour top buyers"
            subtitle="Wallets that bought the dip in that same hour"
            raw={row["Dump Hour Top Buyers"]}
          />
        </>
      )}
    </div>
  );
}
