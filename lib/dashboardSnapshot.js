import { gzipSync, gunzipSync } from "zlib";
import { unstable_noStore as noStore } from "next/cache";
import { kv } from "@vercel/kv";

/** Canonical dashboard rows + Dune time — admin, public pages, and banner all share this. */
export const DASHBOARD_SNAPSHOT_KEY = "tripwire:dashboard:snapshot:v1";

/**
 * @returns {Promise<{ rows: object[], lastUpdated: string|null, pricesUpdatedAt: string|null, builtAt: string }|null>}
 */
export async function readDashboardSnapshot() {
  // @vercel/kv uses fetch under the hood; Next can Data-Cache that and serve a
  // stale snapshot on /dashboard while /api/scores-updated looks fresh (or flaps).
  noStore();
  try {
    const raw = await kv.get(DASHBOARD_SNAPSHOT_KEY);
    if (!raw) return null;

    let payload = raw;
    if (raw?.encoding === "gzip-b64" && typeof raw.data === "string") {
      const json = gunzipSync(Buffer.from(raw.data, "base64")).toString("utf8");
      payload = JSON.parse(json);
    }

    if (!payload || !Array.isArray(payload.rows)) return null;
    return {
      rows: payload.rows,
      lastUpdated: payload.lastUpdated ?? null,
      pricesUpdatedAt: payload.pricesUpdatedAt ?? payload.builtAt ?? null,
      builtAt: payload.builtAt || null,
    };
  } catch (err) {
    console.error("[dashboardSnapshot] read failed:", String(err));
    return null;
  }
}

/**
 * Publish the snapshot everyone reads. Compresses if JSON is large (Upstash payload limits).
 * @param {{ rows: object[], lastUpdated: string|null, pricesUpdatedAt?: string|null }} data
 */
export async function writeDashboardSnapshot(data) {
  noStore();
  const pricesUpdatedAt = data.pricesUpdatedAt ?? new Date().toISOString();
  const payload = {
    rows: data.rows || [],
    lastUpdated: data.lastUpdated ?? null,
    pricesUpdatedAt,
    builtAt: new Date().toISOString(),
    v: 1,
  };
  const json = JSON.stringify(payload);
  try {
    if (json.length > 700_000) {
      const gz = gzipSync(Buffer.from(json, "utf8")).toString("base64");
      await kv.set(DASHBOARD_SNAPSHOT_KEY, { encoding: "gzip-b64", data: gz });
    } else {
      await kv.set(DASHBOARD_SNAPSHOT_KEY, payload);
    }
    return payload;
  } catch (err) {
    console.error("[dashboardSnapshot] write failed:", String(err), "bytes=", json.length);
    throw err;
  }
}
