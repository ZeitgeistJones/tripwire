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
export const RETRIP_COOLDOWN_MS = 15 * 60 * 1000;

export function normalizeTokenAddress(address) {
  return String(address || "").trim().toLowerCase();
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
