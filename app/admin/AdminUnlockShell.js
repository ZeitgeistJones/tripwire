"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

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

const cardStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: "16px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--card-bg)",
};

/**
 * Same ADMIN_SECRET unlock as /admin (sessionStorage tripwire-admin-secret).
 */
export default function AdminUnlockShell({ children, title = "Admin" }) {
  const [secret, setSecret] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [unlockError, setUnlockError] = useState(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(SECRET_KEY);
      if (saved) {
        setSecret(saved);
        setUnlocked(true);
      }
    } catch {}
  }, []);

  const unlock = async () => {
    setUnlockError(null);
    setBusy(true);
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
    } catch (e) {
      setUnlockError(String(e.message || "failed"));
    } finally {
      setBusy(false);
    }
  };

  if (!unlocked) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--text)" }}>{title}</h1>
          <Link href="/admin" style={{ fontSize: "13px", color: "var(--text-faint)", textDecoration: "none" }}>
            ← Admin
          </Link>
        </div>
        <div style={cardStyle}>
          <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>
            ADMIN_SECRET
          </label>
          <p style={{ margin: 0, fontSize: "12px", color: "var(--text-faint)", lineHeight: 1.45 }}>
            Same value as Vercel <code>ADMIN_SECRET</code>. Unlock once per browser tab (shared with /admin).
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
            {busy ? "Checking…" : "Unlock"}
          </button>
          {unlockError && (
            <span style={{ fontSize: "12px", color: "var(--gate-fail-text)" }}>{unlockError}</span>
          )}
        </div>
      </div>
    );
  }

  return children;
}
