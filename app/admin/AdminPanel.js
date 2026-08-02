"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  SHARE_PROMPT_KINDS,
  SHARE_PROMPT_WINDOWS,
  buildShareCardPrompt,
  buildClawdWireCardPrompt,
  sharePromptTokenOptions,
} from "@/lib/shareCardPrompts";
import { moversHighlightForToken } from "@/lib/moversRank";
import { buildAnalysisPrompt } from "@/lib/clawdAnalysisPrompt";
import {
  buildCondensedText,
  buildObjectiveText,
  buildShareText,
} from "@/lib/tokenShareCopy";

const SECRET_KEY = "tripwire-admin-secret";

const inputStyle = {
  padding: "8px 10px",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  background: "var(--bg-subtle)",
  color: "var(--text)",
  fontSize: "13px",
  width: "100%",
  maxWidth: "360px",
  boxSizing: "border-box",
};

const primaryBtn = {
  padding: "8px 14px",
  borderRadius: "6px",
  border: "1px solid var(--btn-active-bg)",
  background: "var(--btn-active-bg)",
  color: "var(--btn-active-text)",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

const secondaryBtn = {
  padding: "8px 14px",
  borderRadius: "6px",
  border: "1px solid var(--border)",
  background: "var(--bg-subtle)",
  color: "var(--text-muted)",
  fontSize: "13px",
  fontWeight: 600,
  cursor: "pointer",
};

const cardStyle = {
  background: "var(--card-bg)",
  border: "1px solid var(--border)",
  borderRadius: "12px",
  padding: "16px 18px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

function Segmented({ options, value, onChange, ariaLabel }) {
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

export default function AdminPanel({
  rows: initialRows = [],
  scoresLastUpdated: initialScoresLastUpdated = null,
  pricesUpdatedAt: initialPricesUpdatedAt = null,
  snapshotBuiltAt: initialBuiltAt = null,
}) {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState(null);
  const [report, setReport] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState(null);
  const [promptAddress, setPromptAddress] = useState("");
  const [promptWindow, setPromptWindow] = useState("7d");
  const [promptKind, setPromptKind] = useState("whale");
  const [promptCopied, setPromptCopied] = useState(false);
  const [clawdWirePromptCopied, setClawdWirePromptCopied] = useState(false);
  const [clawdWirePromptBusy, setClawdWirePromptBusy] = useState(false);
  const [textCopied, setTextCopied] = useState(null);
  const [behHistory, setBehHistory] = useState([]);
  const [rows, setRows] = useState(initialRows);
  const [scoresLastUpdated, setScoresLastUpdated] = useState(initialScoresLastUpdated);
  const [pricesUpdatedAt, setPricesUpdatedAt] = useState(initialPricesUpdatedAt);
  const [snapshotBuiltAt, setSnapshotBuiltAt] = useState(initialBuiltAt);
  const [dataRefreshing, setDataRefreshing] = useState(false);

  const tokenOptions = useMemo(() => sharePromptTokenOptions(rows), [rows]);
  const rowByAddress = useMemo(() => {
    const map = {};
    for (const r of rows) {
      if (r?.Address) map[r.Address.toLowerCase()] = r;
    }
    return map;
  }, [rows]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SECRET_KEY);
      if (saved) {
        setSecret(saved);
        setUnlocked(true);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!unlocked) return;
    refresh();
    // Pull shared Upstash snapshot (same as public site) — do not republish on unlock.
    refreshDashboard({ silent: true, readOnly: true });
    const id = setInterval(() => {
      refreshDashboard({ silent: true, readOnly: true });
    }, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  useEffect(() => {
    if (promptAddress || !tokenOptions.length) return;
    const clawd = tokenOptions.find((t) => t.project?.toUpperCase() === "CLAWD")
      || tokenOptions.find((t) => (t.address || "").toLowerCase() === "0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07");
    setPromptAddress((clawd || tokenOptions[0]).address);
  }, [tokenOptions, promptAddress]);

  const selectedRow = promptAddress ? rowByAddress[promptAddress.toLowerCase()] : null;

  useEffect(() => {
    if (!unlocked || !selectedRow) return;
    const isClawd = (selectedRow.Project || "").toUpperCase() === "CLAWD";
    if (!isClawd) {
      setBehHistory([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/clawd-history");
        const json = await res.json();
        if (!cancelled) setBehHistory(json.behavioralHistory || []);
      } catch {
        if (!cancelled) setBehHistory([]);
      }
    })();
    return () => { cancelled = true; };
  }, [unlocked, selectedRow]);

  const moversStatus = useMemo(
    () => (selectedRow ? moversHighlightForToken(rows, selectedRow.Address, promptWindow === "all" ? "7d" : promptWindow) : null),
    [rows, selectedRow, promptWindow]
  );
  const sharePrompt = useMemo(
    () => buildShareCardPrompt(promptKind, selectedRow, rows, promptWindow, { scoresLastUpdated }),
    [promptKind, selectedRow, rows, promptWindow, scoresLastUpdated]
  );
  const kindMeta = SHARE_PROMPT_KINDS.find((k) => k.value === promptKind);

  const refreshDashboard = async ({ silent = false, readOnly = false, mode = "prices" } = {}) => {
    if (!secret) return;
    if (!silent) setDataRefreshing(true);
    try {
      const params = new URLSearchParams();
      if (readOnly) params.set("read", "1");
      else if (mode === "dune") params.set("mode", "dune");
      const qs = params.toString() ? `?${params}` : "";
      const res = await fetch(`/api/admin/dashboard-snapshot${qs}`, {
        headers: { "x-admin-secret": secret },
        cache: "no-store",
      });
      if (res.status === 401) {
        lock();
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed to refresh dashboard snapshot");
      if (Array.isArray(j.rows)) setRows(j.rows);
      if (j.lastUpdated != null) setScoresLastUpdated(j.lastUpdated);
      if (j.pricesUpdatedAt != null) setPricesUpdatedAt(j.pricesUpdatedAt);
      if (j.builtAt != null) setSnapshotBuiltAt(j.builtAt);
      if (!silent) {
        setStatus(mode === "dune" ? "dune_pulled" : "prices_refreshed");
        setTimeout(() => setStatus(null), 2500);
      }
    } catch (e) {
      if (!silent) setStatus(String(e.message || "refresh failed"));
    } finally {
      if (!silent) setDataRefreshing(false);
    }
  };

  const refresh = async () => {
    try {
      const headers = { "x-admin-secret": secret };
      const [rRes, aRes] = await Promise.all([
        fetch("/api/clawd-report", { headers }),
        fetch("/api/clawd-analysis", { headers }),
      ]);
      if (rRes.status === 401 || aRes.status === 401) {
        lock();
        return;
      }
      const rJ = rRes.ok ? await rRes.json() : null;
      const aJ = aRes.ok ? await aRes.json() : null;
      setReport(rJ?.report || null);
      setAnalysis(aJ?.analysis || null);
    } catch {}
  };

  const unlock = async () => {
    setUnlockError(null);
    setStatus("checking");
    try {
      const res = await fetch("/api/clawd-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ text: "" }),
      });
      if (res.status === 401) throw new Error("Wrong ADMIN_SECRET");
      if (res.status !== 400 && !res.ok) throw new Error("Unlock failed");
      try {
        sessionStorage.setItem(SECRET_KEY, secret);
      } catch {}
      setUnlocked(true);
      setStatus(null);
    } catch (e) {
      setUnlockError(String(e.message || "failed"));
      setStatus(null);
    }
  };

  const lock = () => {
    try {
      sessionStorage.removeItem(SECRET_KEY);
    } catch {}
    setUnlocked(false);
    setSecret("");
    setStatus(null);
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
      if (res.status === 401) {
        lock();
        throw new Error("Wrong ADMIN_SECRET");
      }
      if (res.status === 503) {
        throw new Error("Add GEMINI_API_KEY in Vercel → Environment Variables, then redeploy");
      }
      if (res.status === 429) {
        if (j.analysis?.text) setAnalysis(j.analysis);
        throw new Error(
          j.error === "cooldown"
            ? `Cooldown — try again in ~${j.retryAfterHours || "?"}h (or Force after 15m)`
            : j.error === "force_cooldown"
              ? "Wait 15 minutes between force regenerations"
              : j.error === "generation_in_progress"
                ? "Already generating"
                : "Rate limited"
        );
      }
      if (!res.ok) throw new Error(j.error || "failed");
      if (j.analysis?.text) setAnalysis(j.analysis);
      setStatus(j.cached ? "cached" : "generated");
      setTimeout(() => setStatus(null), 3000);
    } catch (e) {
      setStatus(String(e.message || "failed"));
    }
  };

  const post = async () => {
    setStatus("posting");
    try {
      const res = await fetch("/api/clawd-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-secret": secret },
        body: JSON.stringify({ text: draft }),
      });
      if (res.status === 401) {
        lock();
        throw new Error("Wrong ADMIN_SECRET");
      }
      if (!res.ok) throw new Error("failed");
      const j = await res.json();
      setReport(j.report);
      setDraft("");
      setStatus("posted");
      setTimeout(() => setStatus(null), 2500);
    } catch (e) {
      setStatus(String(e.message || "failed"));
    }
  };

  const copySharePrompt = async () => {
    if (!promptAddress) return;
    try {
      // Re-read shared snapshot so the pasted prompt matches the live site exactly.
      const res = await fetch("/api/admin/dashboard-snapshot?read=1", {
        headers: { "x-admin-secret": secret },
        cache: "no-store",
      });
      if (res.status === 401) {
        lock();
        return;
      }
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Failed to read shared snapshot");
      const nextRows = Array.isArray(j.rows) ? j.rows : rows;
      if (Array.isArray(j.rows)) setRows(j.rows);
      if (j.lastUpdated != null) setScoresLastUpdated(j.lastUpdated);
      if (j.pricesUpdatedAt != null) setPricesUpdatedAt(j.pricesUpdatedAt);
      if (j.builtAt != null) setSnapshotBuiltAt(j.builtAt);
      const row = nextRows.find(
        (r) => (r.Address || "").toLowerCase() === promptAddress.toLowerCase()
      );
      const text = buildShareCardPrompt(promptKind, row, nextRows, promptWindow, {
        scoresLastUpdated: j.lastUpdated ?? scoresLastUpdated,
      });
      if (!text) return;
      await navigator.clipboard.writeText(text);
      setPromptCopied(true);
      setTimeout(() => setPromptCopied(false), 2000);
    } catch (e) {
      setStatus(String(e.message || "Clipboard failed — select the prompt and copy manually"));
    }
  };

  const copyClawdWirePrompt = async () => {
    setClawdWirePromptBusy(true);
    setStatus(null);
    try {
      const [wireRes, snapRes] = await Promise.all([
        fetch("/api/admin/clawdwire-latest", {
          headers: { "x-admin-secret": secret },
          cache: "no-store",
        }),
        fetch("/api/admin/dashboard-snapshot?read=1", {
          headers: { "x-admin-secret": secret },
          cache: "no-store",
        }),
      ]);
      if (wireRes.status === 401 || snapRes.status === 401) {
        lock();
        return;
      }
      const wireJson = await wireRes.json().catch(() => ({}));
      if (!wireRes.ok) throw new Error(wireJson.error || "ClawdWire latest failed");
      const wireRow = Array.isArray(wireJson.rows) ? wireJson.rows[0] : null;
      if (!wireRow) throw new Error("No ClawdWire row yet — run a pulse for a token first");

      const snapJson = await snapRes.json().catch(() => ({}));
      const nextRows = Array.isArray(snapJson.rows) ? snapJson.rows : rows;
      if (Array.isArray(snapJson.rows)) setRows(snapJson.rows);
      const wireAddr = (wireRow.Address || "").toLowerCase();
      const wireProject = (wireRow.Project || "").toUpperCase();
      const dashRow =
        (wireAddr &&
          nextRows.find((r) => (r.Address || "").toLowerCase() === wireAddr)) ||
        (wireProject &&
          nextRows.find((r) => (r.Project || "").toUpperCase() === wireProject)) ||
        null;

      const text = buildClawdWireCardPrompt(wireRow, dashRow, {
        clawdWireLastRunAt: wireJson.lastRunAt || null,
        scoresLastUpdated: snapJson.lastUpdated ?? scoresLastUpdated,
      });
      if (!text) throw new Error("Prompt empty");
      await navigator.clipboard.writeText(text);
      setClawdWirePromptCopied(true);
      setTimeout(() => setClawdWirePromptCopied(false), 2000);
    } catch (e) {
      setStatus(String(e.message || "ClawdWire prompt copy failed"));
    } finally {
      setClawdWirePromptBusy(false);
    }
  };

  const copyText = async (text, label) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setTextCopied(label);
      setTimeout(() => setTextCopied(null), 2000);
    } catch {
      setStatus("Clipboard failed — select and copy manually");
    }
  };

  const copyBtnStyle = {
    padding: "6px 12px",
    borderRadius: "6px",
    border: "1px solid var(--border)",
    background: "var(--bg-subtle)",
    color: "var(--text-muted)",
    cursor: selectedRow ? "pointer" : "not-allowed",
    fontSize: "12px",
    fontWeight: 600,
    opacity: selectedRow ? 1 : 0.6,
  };

  const displayed = analysis?.text
    ? {
        kind: "ai",
        text: analysis.text,
        at: analysis.generatedAt,
        dataAsOf: analysis.scoresLastUpdated,
        model: analysis.model,
      }
    : report?.text
      ? {
          kind: "manual",
          text: report.text,
          at: report.postedAt,
          dataAsOf: report.scoresLastUpdated,
        }
      : null;

  const busy = status === "generating" || status === "forcing" || status === "posting" || status === "checking" || dataRefreshing;
  const okStatuses = ["posted", "generated", "cached", "data_refreshed", "prices_refreshed", "dune_pulled"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "var(--text)" }}>Admin</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
            Share-image prompts + CLAWD Gemini reports.
          </p>
        </div>
        <Link href="/dashboard?tab=clawd" style={{ fontSize: "13px", color: "var(--text-faint)", textDecoration: "none" }}>
          ← CLAWD tab
        </Link>
      </div>

      {!unlocked ? (
        <div style={cardStyle}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>
            ADMIN_SECRET
          </label>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.45 }}>
            Same value as Vercel <code>ADMIN_SECRET</code>. Not your Gemini API key.
          </p>
          <input
            type="password"
            placeholder="ADMIN_SECRET"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && secret) unlock(); }}
            autoComplete="off"
            style={inputStyle}
          />
          <button
            type="button"
            onClick={unlock}
            disabled={!secret || busy}
            style={{ ...primaryBtn, alignSelf: "flex-start", opacity: !secret || busy ? 0.6 : 1 }}
          >
            {status === "checking" ? "Checking…" : "Unlock"}
          </button>
          {unlockError && (
            <span style={{ fontSize: "12px", color: "var(--gate-fail-text)" }}>{unlockError}</span>
          )}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", color: "var(--gate-ok-text)" }}>Unlocked for this browser tab</span>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <Link
                href="/admin/forecast"
                style={{ ...secondaryBtn, padding: "4px 10px", fontSize: "11px", textDecoration: "none", display: "inline-flex", alignItems: "center" }}
              >
                Forecast v1 beta
              </Link>
              <button
                type="button"
                onClick={() => refreshDashboard({ mode: "prices" })}
                disabled={dataRefreshing}
                style={{ ...secondaryBtn, padding: "4px 10px", fontSize: "11px", cursor: dataRefreshing ? "wait" : "pointer" }}
                title="CoinGecko/Dex prices only — no Dune credits. Recomputes signals that use price."
              >
                {dataRefreshing ? "Refreshing…" : "Refresh prices"}
              </button>
              <button
                type="button"
                onClick={() => refreshDashboard({ mode: "dune" })}
                disabled={dataRefreshing}
                style={{ ...secondaryBtn, padding: "4px 10px", fontSize: "11px", cursor: dataRefreshing ? "wait" : "pointer" }}
                title="Pull latest Dune results + prices (~2 Result Read credits). Use after you re-run the Dune query."
              >
                Pull Dune
              </button>
              <button type="button" onClick={lock} style={{ ...secondaryBtn, padding: "4px 10px", fontSize: "11px" }}>
                Lock
              </button>
            </div>
          </div>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              ClawdWire pulse card
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              CLAWD-only live pulse for social images — pulls latest Dune result for query 8180604 (Result Read, no Trip).
              Soft language only (no wash / manipulation wording). Paste into ChatGPT / Claude / Gemini (image-capable).
            </p>
            <button
              type="button"
              onClick={copyClawdWirePrompt}
              disabled={clawdWirePromptBusy}
              style={{ ...primaryBtn, alignSelf: "flex-start", opacity: clawdWirePromptBusy ? 0.6 : 1 }}
            >
              {clawdWirePromptBusy
                ? "Loading…"
                : clawdWirePromptCopied
                  ? "✓ Copied"
                  : "Copy ClawdWire prompt"}
            </button>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Share image prompts
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Pick a token + window + card type → copy → paste into ChatGPT / Claude / Gemini (image-capable).
              Prompts ask for a social image first, then a short caption. Uses the shared Upstash snapshot (same rows the public site serves).
            </p>

            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {SHARE_PROMPT_KINDS.map((k) => {
                const active = promptKind === k.value;
                return (
                  <button
                    key={k.value}
                    type="button"
                    onClick={() => setPromptKind(k.value)}
                    title={k.blurb}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "6px",
                      border: active ? "1px solid var(--btn-active-bg)" : "1px solid var(--border)",
                      background: active ? "var(--btn-active-bg)" : "var(--bg-subtle)",
                      color: active ? "var(--btn-active-text)" : "var(--text-muted)",
                      fontSize: "12px",
                      fontWeight: active ? 700 : 500,
                      cursor: "pointer",
                    }}
                  >
                    {k.label}
                  </button>
                );
              })}
            </div>
            {kindMeta && (
              <div style={{ fontSize: "12px", color: "var(--text-faint)" }}>{kindMeta.blurb}</div>
            )}

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 220px", minWidth: 0 }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-faint)" }}>Token</span>
                <select
                  value={promptAddress}
                  onChange={(e) => setPromptAddress(e.target.value)}
                  style={{ ...inputStyle, maxWidth: "100%", cursor: "pointer" }}
                >
                  {tokenOptions.length === 0 ? (
                    <option value="">No tokens loaded</option>
                  ) : (
                    tokenOptions.map((t) => (
                      <option key={t.address} value={t.address}>{t.label}</option>
                    ))
                  )}
                </select>
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-faint)" }}>Window</span>
                <Segmented
                  ariaLabel="Share prompt window"
                  value={promptWindow}
                  onChange={setPromptWindow}
                  options={SHARE_PROMPT_WINDOWS}
                />
              </div>
              <button
                type="button"
                onClick={copySharePrompt}
                disabled={!sharePrompt}
                style={{ ...primaryBtn, alignSelf: "flex-end", opacity: sharePrompt ? 1 : 0.6 }}
              >
                {promptCopied ? "✓ Copied" : "Copy prompt"}
              </button>
            </div>

            {selectedRow && (
              <div style={{ fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.5 }}>
                <strong style={{ color: "var(--text-muted)", fontWeight: 600 }}>{selectedRow.Project}</strong>
                {selectedRow["Whale Min $"] != null
                  ? ` · whale thr ~$${Number(selectedRow["Whale Min $"]).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : ""}
                {selectedRow["Hump Min $"] != null
                  ? ` · mega thr ~$${Number(selectedRow["Hump Min $"]).toLocaleString(undefined, { maximumFractionDigits: 0 })}${Number(selectedRow["Hump Min $"]) <= 1000 ? " (floor)" : ""}`
                  : ""}
                {scoresLastUpdated
                  ? ` · scores as of ${new Date(scoresLastUpdated).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                  : ""}
                {pricesUpdatedAt
                  ? ` · prices ${new Date(pricesUpdatedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                  : ""}
                {moversStatus && (
                  <div style={{ marginTop: "4px" }}>
                    Movers {promptWindow === "all" ? "7d" : promptWindow}:{" "}
                    {moversStatus.isHighlighted ? (
                      <span style={{ color: "var(--gate-ok-text)" }}>
                        {moversStatus.onActivityBoard ? `activity #${moversStatus.activityRank}` : ""}
                        {moversStatus.onActivityBoard && moversStatus.onWhaleBoard ? " · " : ""}
                        {moversStatus.onWhaleBoard ? `whale #${moversStatus.whaleRank}` : ""}
                      </span>
                    ) : (
                      <span>not on top boards</span>
                    )}
                    {promptWindow === "all" ? " · card includes multiple windows" : ""}
                    {promptKind === "whale" && promptWindow === "30d" ? " · whale card uses 7d flow" : ""}
                    {promptKind === "whale" && promptWindow === "all" ? " · whale bands: 24h + 7d (no 30d twin)" : ""}
                    {promptKind === "buyers" && promptWindow === "30d" ? " · no 30d buy/sell ratio twin" : ""}
                    {promptKind === "all" ? " · stacked Whale + Buyers + Activity" : ""}
                  </div>
                )}
              </div>
            )}

            <textarea
              readOnly
              value={sharePrompt}
              rows={16}
              style={{
                ...inputStyle,
                maxWidth: "100%",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
                fontSize: "11.5px",
                resize: "vertical",
                lineHeight: 1.45,
                color: "var(--text-muted)",
              }}
            />
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Copy texts
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Same plain-text copies that used to live on the public CLAWD tab. Uses the token selected above.
              Numbers come from the shared Upstash snapshot. Use <strong style={{ color: "var(--text-muted)" }}>Refresh prices</strong> anytime (free of Dune credits). Use <strong style={{ color: "var(--text-muted)" }}>Pull Dune</strong> only after you re-run the Dune query.
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                style={copyBtnStyle}
                disabled={!selectedRow}
                onClick={() => copyText(buildShareText(selectedRow, { scoresLastUpdated }), "full")}
              >
                {textCopied === "full" ? "\u2713 Copied!" : "Copy full stats"}
              </button>
              <button
                type="button"
                style={copyBtnStyle}
                disabled={!selectedRow}
                onClick={() => copyText(buildCondensedText(selectedRow, { scoresLastUpdated }), "short")}
              >
                {textCopied === "short" ? "\u2713 Copied!" : "Copy short version"}
              </button>
              <button
                type="button"
                style={copyBtnStyle}
                disabled={!selectedRow}
                onClick={() => copyText(buildObjectiveText(selectedRow, { scoresLastUpdated }), "objective")}
              >
                {textCopied === "objective" ? "\u2713 Copied!" : "Copy on-chain snapshot"}
              </button>
              <button
                type="button"
                style={copyBtnStyle}
                disabled={!selectedRow}
                onClick={() => copyText(buildAnalysisPrompt(selectedRow, behHistory, { scoresLastUpdated }), "prompt")}
              >
                {textCopied === "prompt" ? "\u2713 Copied!" : "Copy analysis prompt"}
              </button>
              <span style={{ fontSize: "11px", color: "var(--text-faint)" }}>
                Paste into Discord / Twitter / Farcaster / Telegram
              </span>
            </div>
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Gemini report
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              CLAWD analyst text for admin preview. Public CLAWD tab no longer shows this card.
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={() => generate(false)}
                disabled={busy}
                style={{ ...primaryBtn, cursor: busy ? "wait" : "pointer" }}
              >
                {status === "generating" ? "Generating…" : "Generate report"}
              </button>
              <button
                type="button"
                onClick={() => generate(true)}
                disabled={busy}
                title="Bypass fingerprint/12h cooldown (still 15m floor)"
                style={{ ...secondaryBtn, cursor: busy ? "wait" : "pointer" }}
              >
                {status === "forcing" ? "Forcing…" : "Force regenerate"}
              </button>
              <button type="button" onClick={refresh} disabled={busy} style={secondaryBtn}>
                Refresh preview
              </button>
            </div>
            {status && !busy && (
              <span style={{ fontSize: "12px", color: okStatuses.includes(status) ? "var(--gate-ok-text)" : "var(--gate-fail-text)" }}>
                {status === "posted" ? "✓ Manual report saved"
                  : status === "generated" ? "✓ Report generated"
                  : status === "cached" ? "✓ Already up to date (no API call)"
                  : status === "prices_refreshed" ? "✓ Prices refreshed (no Dune credits)"
                  : status === "dune_pulled" ? "✓ Dune + prices published to shared snapshot"
                  : status === "data_refreshed" ? "✓ Shared snapshot published"
                  : status}
              </span>
            )}
          </section>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Manual report
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Optional override. AI report wins when both exist.
            </p>
            <textarea
              placeholder="Paste a manual report…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={8}
              style={{
                ...inputStyle,
                maxWidth: "100%",
                fontFamily: "inherit",
                fontSize: "12.5px",
                resize: "vertical",
                lineHeight: 1.5,
              }}
            />
            <button
              type="button"
              onClick={post}
              disabled={!draft || busy}
              style={{ ...secondaryBtn, alignSelf: "flex-start", opacity: !draft || busy ? 0.6 : 1 }}
            >
              {status === "posting" ? "Posting…" : "Publish manual report"}
            </button>
          </section>

          <section style={cardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                Live preview
              </h2>
              {displayed && (
                <span style={{ fontSize: "11px", color: "var(--text-faint)", textAlign: "right", lineHeight: 1.45 }}>
                  {displayed.dataAsOf
                    ? `Scores as of ${new Date(displayed.dataAsOf).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                    : null}
                  <div>
                    {displayed.kind === "ai" ? "AI" : "Manual"} ·{" "}
                    {displayed.at ? new Date(displayed.at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : ""}
                    {displayed.model ? ` · ${displayed.model}` : ""}
                  </div>
                </span>
              )}
            </div>
            {displayed ? (
              <div style={{ whiteSpace: "pre-wrap", fontSize: "13px", lineHeight: 1.65, color: "var(--text)" }}>
                {displayed.text}
              </div>
            ) : (
              <p style={{ margin: 0, fontSize: "13px", color: "var(--text-faint)" }}>No report published yet.</p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
