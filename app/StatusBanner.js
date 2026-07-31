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

/**
 * Clock always matches the rows on this page (lastUpdated prop).
 * If Upstash publishes a newer snapshot (builtAt), soft-reload so table + clock update together.
 */
export default function StatusBanner({
  lastUpdated: initialLastUpdated,
  snapshotBuiltAt: initialBuiltAt = null,
}) {
  const router = useRouter();
  const [formatted, setFormatted] = useState(() => formatTs(initialLastUpdated));

  useEffect(() => {
    setFormatted(formatTs(initialLastUpdated));
  }, [initialLastUpdated]);

  useEffect(() => {
    let cancelled = false;

    async function checkForNewerSnapshot() {
      try {
        const res = await fetch("/api/scores-updated", { cache: "no-store" });
        if (!res.ok) return;
        const json = await res.json();
        if (cancelled) return;

        const remoteBuilt = tsMs(json.builtAt);
        const pageBuilt = tsMs(initialBuiltAt);
        const remoteDune = tsMs(json.lastUpdated);
        const pageDune = tsMs(initialLastUpdated);

        const builtNewer =
          remoteBuilt != null && (pageBuilt == null || remoteBuilt > pageBuilt);
        const duneNewer =
          remoteDune != null && (pageDune == null || remoteDune > pageDune);

        if (builtNewer || duneNewer) {
          router.refresh();
        }
      } catch {
        // keep whatever we already show
      }
    }

    checkForNewerSnapshot();
    const id = setInterval(checkForNewerSnapshot, 30_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [initialLastUpdated, initialBuiltAt, router]);

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
