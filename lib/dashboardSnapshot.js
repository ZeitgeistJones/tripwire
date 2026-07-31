import { gzipSync, gunzipSync } from "zlib";
import { kv } from "@vercel/kv";

/** Canonical dashboard rows + Dune time — admin, public pages, and banner all share this. */
export const DASHBOARD_SNAPSHOT_KEY = "tripwire:dashboard:snapshot:v1";

/** How long a published snapshot is served before we rebuild from Dune. */
export const SNAPSHOT_MAX_AGE_MS = 60 * 60 * 1000;

function tsMs(value) {
  if (!value) return null;
  const n = new Date(value).getTime();
  return Number.isNaN(n) ? null : n;
}

/**
 * @returns {Promise<{ rows: object[], lastUpdated: string|null, builtAt: string }|null>}
 */
export async function readDashboardSnapshot() {
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
      builtAt: payload.builtAt || null,
    };
  } catch (err) {
    console.error("[dashboardSnapshot] read failed:", String(err));
    return null;
  }
}

/**
 * Publish the snapshot everyone reads. Compresses if JSON is large (Upstash payload limits).
 * @param {{ rows: object[], lastUpdated: string|null }} data
 */
export async function writeDashboardSnapshot(data) {
  const payload = {
    rows: data.rows || [],
    lastUpdated: data.lastUpdated ?? null,
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

export function snapshotIsFresh(snap, maxAgeMs = SNAPSHOT_MAX_AGE_MS) {
  if (!snap?.builtAt) return false;
  const built = tsMs(snap.builtAt);
  if (built == null) return false;
  return Date.now() - built < maxAgeMs;
}
