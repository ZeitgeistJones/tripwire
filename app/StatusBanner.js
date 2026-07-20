"use client";

import { useEffect, useState } from "react";

function formatTs(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function StatusBanner({ lastUpdated: initialLastUpdated }) {
  const [formatted, setFormatted] = useState("—");

  useEffect(() => {
    let cancelled = false;

    // Always format in the browser so timezone matches across pages.
    if (initialLastUpdated) setFormatted(formatTs(initialLastUpdated));

    async function load() {
      try {
        const res = await fetch("/api/scores-updated", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setFormatted(formatTs(json.lastUpdated));
      } catch {
        // keep whatever we already show
      }
    }

    load();
    return () => { cancelled = true; };
  }, [initialLastUpdated]);

  return (
    <div style={{
      background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "8px",
      padding: "12px 16px", marginBottom: "16px",
    }}>
      <div style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "2px" }}>Scores last updated</div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>{formatted}</div>
    </div>
  );
}
