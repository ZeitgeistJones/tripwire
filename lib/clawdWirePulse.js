import { gzipSync, gunzipSync } from "zlib";
import { kv } from "@vercel/kv";

/**
 * Per-token cache for ClawdWire pulse results.
 *
 * Two jobs, and the second one is the reason this is not optional:
 *
 *  1. Money. A pulse costs Dune credits to run. Cached, it costs nothing to
 *     look at, so one holder's Trip pays for everyone else's view.
 *
 *  2. Correctness, once the Dune query takes a token parameter. Dune's
 *     "latest results" endpoint returns the last run of the *query*, whatever
 *     token that run was for — so asking it for CLAWD could hand back the
 *     numbers from someone else's run on a different coin. Keying results by
 *     token here is what stops one coin's data appearing under another's name.
 */

const PULSE_PREFIX = "tripwire:clawdwire:pulse:v1:";
const RECENT_KEY = "tripwire:clawdwire:recent:v1";
const RECENT_LIMIT = 24;

/** Default cool-off before the same coin may be re-tripped. */
export const RETRIP_COOLDOWN_MS = 5 * 60 * 1000;

export function normalizeTokenAddress(address) {
  return String(address || "").trim().toLowerCase();
}

/**
 * ClawdWire pulses are one row with flow/whale fields.
 * The lean Wire query (7765068) returns many Project rows with only Wallets/Txs —
 * if that SQL was pasted into CLAWD_WIRE_QUERY_ID, Trips poison this cache and the
 * UI looks empty (rows[0] is "Virtuals Protocol" with no Net USD).
 */
export function isValidClawdWirePulseRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return false;
  if (rows.length > 3) return false;
  const row = rows[0];
  if (!row || typeof row !== "object") return false;
  const hasFlow =
    row["Net USD 24h"] != null ||
    row["Net USD 1h"] != null ||
    row["Whale Net 24h"] != null ||
    row["Buy USD 24h"] != null;
  if (!hasFlow) return false;
  const projects = new Set(
    rows.map((r) => String(r?.Project || "").trim()).filter(Boolean)
  );
  if (projects.size > 1) return false;
  return true;
}

function pulseKey(address) {
  return `${PULSE_PREFIX}${normalizeTokenAddress(address)}`;
}

function decode(raw) {
  if (!raw) return null;
  if (raw?.encoding === "gzip-b64" && typeof raw.data === "string") {
    try {
      return JSON.parse(gunzipSync(Buffer.from(raw.data, "base64")).toString("utf8"));
    } catch {
      return null;
    }
  }
  return raw;
}

/** @returns {Promise<{address,symbol,rows,lastRunAt,executionId,cachedAt}|null>} */
export async function readPulse(address) {
  const addr = normalizeTokenAddress(address);
  if (!addr) return null;
  try {
    const payload = decode(await kv.get(pulseKey(addr)));
    if (!payload || !Array.isArray(payload.rows)) return null;
    // Ignore poisoned Wire-shaped caches so the UI can Trip a real pulse again.
    if (!isValidClawdWirePulseRows(payload.rows)) return null;
    return payload;
  } catch (err) {
    console.error("[clawdWirePulse] read failed:", String(err));
    return null;
  }
}

/**
 * Cache a completed run. Never throws: a cache miss is a slower page, but a
 * cache write that throws would lose a pulse the user already paid for.
 */
export async function writePulse({ address, symbol = null, rows, lastRunAt, executionId = null }) {
  const addr = normalizeTokenAddress(address);
  if (!addr) return null;
  if (!isValidClawdWirePulseRows(rows)) {
    console.error(
      "[clawdWirePulse] refuse to cache non-ClawdWire rows (likely Wire pulse SQL in CLAWD_WIRE_QUERY_ID)",
      { address: addr, rowCount: Array.isArray(rows) ? rows.length : 0 }
    );
    return null;
  }

  const payload = {
    address: addr,
    symbol,
    rows: rows || [],
    lastRunAt: lastRunAt || new Date().toISOString(),
    executionId,
    cachedAt: new Date().toISOString(),
    v: 1,
  };

  const json = JSON.stringify(payload);
  try {
    if (json.length > 700_000) {
      const gz = gzipSync(Buffer.from(json, "utf8")).toString("base64");
      await kv.set(pulseKey(addr), { encoding: "gzip-b64", data: gz });
    } else {
      await kv.set(pulseKey(addr), payload);
    }
    await touchRecent(payload);
    return payload;
  } catch (err) {
    console.error("[clawdWirePulse] write failed:", String(err), "bytes=", json.length);
    return null;
  }
}

/** Most-recently-tripped index — what is fresh, and therefore free to view. */
async function touchRecent(payload) {
  try {
    const raw = await kv.get(RECENT_KEY);
    const list = Array.isArray(raw) ? raw : [];
    const rest = list.filter((e) => normalizeTokenAddress(e?.address) !== payload.address);
    const next = [
      { address: payload.address, symbol: payload.symbol, lastRunAt: payload.lastRunAt },
      ...rest,
    ].slice(0, RECENT_LIMIT);
    await kv.set(RECENT_KEY, next);
  } catch (err) {
    console.error("[clawdWirePulse] recent index write failed:", String(err));
  }
}

export async function readRecentPulses(limit = RECENT_LIMIT) {
  try {
    const raw = await kv.get(RECENT_KEY);
    if (!Array.isArray(raw)) return [];
    return raw.filter((e) => e && e.address).slice(0, limit);
  } catch (err) {
    console.error("[clawdWirePulse] recent index read failed:", String(err));
    return [];
  }
}

/** ms since this coin last ran, or null if it never has. */
export function msSinceRun(payload) {
  const t = payload?.lastRunAt ? new Date(payload.lastRunAt).getTime() : NaN;
  return Number.isNaN(t) ? null : Date.now() - t;
}

export function isCoolingDown(payload, cooldownMs = RETRIP_COOLDOWN_MS) {
  const since = msSinceRun(payload);
  return since != null && since < cooldownMs;
}
