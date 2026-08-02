"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatLocalDateTime } from "@/lib/snapshotTime";

/** Always format in the viewer's local timezone (client-side). */
function formatTs(value) {
  return formatLocalDateTime(value) || "—";
}

function tsMs(value) {
  if (!value) return null;
  const n = new Date(value).getTime();
  return Number.isNaN(n) ? null : n;
}

/**
 * Hero clock = Dune on-chain / scores time (matches table).
 * Small subtitle = CoinGecko/Dex prices from last admin price refresh.
 * Soft-reloads when Upstash publishes a newer snapshot.
 */
export default function StatusBanner({
  lastUpdated: initialLastUpdated,
  pricesUpdatedAt: initialPricesUpdatedAt = null,
  snapshotBuiltAt: initialBuiltAt = null,
}) {
  const router = useRouter();
  // Start blank so SSR (UTC server) never paints a wrong zone; fill after mount.
  const [duneFormatted, setDuneFormatted] = useState("—");
  const [pricesFormatted, setPricesFormatted] = useState("—");

  useEffect(() => {
    setDuneFormatted(formatTs(initialLastUpdated));
  }, [initialLastUpdated]);

  useEffect(() => {
    setPricesFormatted(formatTs(initialPricesUpdatedAt));
  }, [initialPricesUpdatedAt]);

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
        const remotePrices = tsMs(json.pricesUpdatedAt);
        const pagePrices = tsMs(initialPricesUpdatedAt);

        const builtNewer =
          remoteBuilt != null && (pageBuilt == null || remoteBuilt > pageBuilt);
        const duneNewer =
          remoteDune != null && (pageDune == null || remoteDune > pageDune);
        const pricesNewer =
          remotePrices != null && (pagePrices == null || remotePrices > pagePrices);

        if (builtNewer || duneNewer || pricesNewer) {
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
  }, [initialLastUpdated, initialPricesUpdatedAt, initialBuiltAt, router]);

  return (
    <div style={{
      background: "var(--bg-subtle)", border: "1px solid var(--border)", borderRadius: "8px",
      padding: "12px 16px", marginBottom: "16px",
    }}>
      <div style={{ fontSize: "11px", color: "var(--text-faint)", marginBottom: "2px" }}>
        On-chain scores last updated
      </div>
      <div style={{ fontSize: "18px", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em" }}>
        {duneFormatted}
      </div>
      <div style={{ fontSize: "11px", color: "var(--text-faint)", marginTop: "6px", lineHeight: 1.4 }}>
        Prices (CoinGecko) · {pricesFormatted}
      </div>
    </div>
  );
}
