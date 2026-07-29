"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildWhaleCardPrompt, whalePromptTokenOptions } from "@/lib/whaleCardPrompt";

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

export default function AdminPanel({ rows = [], scoresLastUpdated = null }) {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [unlockError, setUnlockError] = useState(null);
  const [report, setReport] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState(null);
  const [whaleAddress, setWhaleAddress] = useState("");
  const [whaleWindow, setWhaleWindow] = useState("7d");
  const [whaleCopied, setWhaleCopied] = useState(false);

  const tokenOptions = useMemo(() => whalePromptTokenOptions(rows), [rows]);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  useEffect(() => {
    if (whaleAddress || !tokenOptions.length) return;
    const clawd = tokenOptions.find((t) => t.project?.toUpperCase() === "CLAWD")
      || tokenOptions.find((t) => (t.address || "").toLowerCase() === "0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07");
    setWhaleAddress((clawd || tokenOptions[0]).address);
  }, [tokenOptions, whaleAddress]);

  const selectedRow = whaleAddress ? rowByAddress[whaleAddress.toLowerCase()] : null;
  const whalePrompt = useMemo(
    () => buildWhaleCardPrompt(selectedRow, whaleWindow, { scoresLastUpdated }),
    [selectedRow, whaleWindow, scoresLastUpdated]
  );

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

  const copyWhalePrompt = async () => {
    if (!whalePrompt) return;
    try {
      await navigator.clipboard.writeText(whalePrompt);
      setWhaleCopied(true);
      setTimeout(() => setWhaleCopied(false), 2000);
    } catch {
      setStatus("Clipboard failed — select the prompt and copy manually");
    }
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

  const busy = status === "generating" || status === "forcing" || status === "posting" || status === "checking";
  const okStatuses = ["posted", "generated", "cached"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 700, color: "var(--text)" }}>Admin</h1>
          <p style={{ margin: "6px 0 0", fontSize: "13px", color: "var(--text-muted)" }}>
            CLAWD reports + whale card prompts for LLM share graphics.
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "12px", color: "var(--gate-ok-text)" }}>Unlocked for this browser tab</span>
            <button type="button" onClick={lock} style={{ ...secondaryBtn, padding: "4px 10px", fontSize: "11px" }}>
              Lock
            </button>
          </div>

          <section style={cardStyle}>
            <h2 style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "var(--text)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              Whale card prompt
            </h2>
            <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", lineHeight: 1.5 }}>
              Pick a token → copy → paste into ChatGPT / Claude / Gemini. Tuned for a sharable card: big-wallet story,
              plain-English whale vs humpback definitions, data timestamp, and disclaimer. No Tripwire Gemini call.
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "4px", flex: "1 1 220px", minWidth: 0 }}>
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-faint)" }}>Token</span>
                <select
                  value={whaleAddress}
                  onChange={(e) => setWhaleAddress(e.target.value)}
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
                <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-faint)" }}>Flow window</span>
                <Segmented
                  ariaLabel="Whale flow window"
                  value={whaleWindow}
                  onChange={setWhaleWindow}
                  options={[
                    { value: "24h", label: "24h" },
                    { value: "7d", label: "7d" },
                  ]}
                />
              </div>
              <button
                type="button"
                onClick={copyWhalePrompt}
                disabled={!whalePrompt}
                style={{ ...primaryBtn, alignSelf: "flex-end", opacity: whalePrompt ? 1 : 0.6 }}
              >
                {whaleCopied ? "✓ Copied" : "Copy prompt"}
              </button>
            </div>
            {selectedRow && (
              <div style={{ fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.45 }}>
                {selectedRow.Project}
                {selectedRow["Whale Min $"] != null
                  ? ` · whale threshold ~$${Number(selectedRow["Whale Min $"]).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                  : ""}
                {scoresLastUpdated
                  ? ` · scores as of ${new Date(scoresLastUpdated).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}`
                  : ""}
              </div>
            )}
            <textarea
              readOnly
              value={whalePrompt}
              rows={14}
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
