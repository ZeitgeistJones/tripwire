"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

function formatTs(value) {
  if (!value) return "—";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function tsMs(value) {
  if (!value) return null;
  const n = new Date(value).getTime();
  return Number.isNaN(n) ? null : n;
}

export default function StatusBanner({ lastUpdated: initialLastUpdated }) {
  const router = useRouter();
  // Always show the timestamp that matches the row data on this page.
  // Never label the table with a newer Dune time than the numbers themselves.
  const [formatted, setFormatted] = useState(() => formatTs(initialLastUpdated));

  useEffect(() => {
    setFormatted(formatTs(initialLastUpdated));
  }, [initialLastUpdated]);

  useEffect(() => {
    let cancelled = false;

    async function checkForNewerScores() {
      try {
        const res = await fetch("/api/scores-updated", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;
        const remoteMs = tsMs(json.lastUpdated);
        const pageMs = tsMs(initialLastUpdated);
        // Dune advanced past what this page rendered — reload RSC props so
        // table numbers and this banner stay on the same snapshot.
        if (remoteMs != null && (pageMs == null || remoteMs > pageMs)) {
          router.refresh();
        }
      } catch {
        // keep whatever we already show
      }
    }

    checkForNewerScores();
    const id = setInterval(checkForNewerScores, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [initialLastUpdated, router]);

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
