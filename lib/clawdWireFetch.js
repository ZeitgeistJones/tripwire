import { CLAWD_TOKEN_ADDRESS, getClawdWireQueryId } from "@/lib/clawdWire";

/**
 * Solo CoinGecko quote for one Base contract — price, mcap, 24h Δ.
 * Uses /simple/token_price (one address), not the dashboard batch and not the
 * heavy /coins/.../contract detail endpoint. Only call on pulse enrich
 * (Trip / status complete / cache-miss latest), never on every page load.
 */
export async function fetchClawdQuote(tokenAddress = CLAWD_TOKEN_ADDRESS) {
  const address = String(tokenAddress || CLAWD_TOKEN_ADDRESS).toLowerCase();
  const empty = { priceUsd: null, marketCapUsd: null, priceChange24h: null };
  try {
    const url =
      `https://api.coingecko.com/api/v3/simple/token_price/base` +
      `?contract_addresses=${encodeURIComponent(address)}` +
      `&vs_currencies=usd` +
      `&include_market_cap=true` +
      `&include_24hr_change=true`;
    const res = await fetch(url, {
      headers: { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY },
      cache: "no-store",
    });
    if (!res.ok) return empty;
    const json = await res.json();
    const entry = json?.[address] ?? null;
    if (!entry) return empty;
    return {
      priceUsd: entry.usd ?? null,
      marketCapUsd: entry.usd_market_cap ?? null,
      priceChange24h: entry.usd_24h_change ?? null,
    };
  } catch {
    return empty;
  }
}

/** @deprecated prefer fetchClawdQuote — kept for call sites that only need mcap */
export async function fetchClawdMarketCap(tokenAddress = CLAWD_TOKEN_ADDRESS) {
  const q = await fetchClawdQuote(tokenAddress);
  return q.marketCapUsd;
}

/**
 * `fallbackAddress` is only for rows that predate the token column. It must
 * never silently default to CLAWD now that other tokens can run — a row with
 * no address getting stamped as CLAWD is how another coin's numbers end up in
 * CLAWD's cache slot.
 *
 * `quote` may be a number (legacy mcap-only) or { priceUsd, marketCapUsd, priceChange24h }.
 */
export function enrichClawdWireRows(rows, quote, fallbackAddress = null) {
  const q =
    quote != null && typeof quote === "object"
      ? quote
      : { priceUsd: null, marketCapUsd: quote ?? null, priceChange24h: null };
  return (rows || []).map((row) => ({
    ...row,
    Address: row["Address"] || fallbackAddress,
    priceUsd: q.priceUsd ?? null,
    marketCapUsd: q.marketCapUsd ?? null,
    priceChange24h: q.priceChange24h ?? null,
  }));
}

/** Latest saved result for the ClawdWire query (no execute). */
export async function fetchClawdWireLatestFromDune(expectedAddress = null) {
  const queryId = getClawdWireQueryId();
  if (!queryId) {
    const err = new Error(
      "CLAWD_WIRE_QUERY_ID is not set. Create the Dune query and add the ID in Vercel env."
    );
    err.status = 503;
    throw err;
  }

  const res = await fetch(
    `https://api.dune.com/api/v1/query/${queryId}/results`,
    {
      headers: { "X-Dune-API-Key": process.env.DUNE_API_KEY },
      cache: "no-store",
    }
  );
  if (!res.ok) {
    const err = new Error(`Dune results failed: ${res.status}`);
    err.status = 500;
    throw err;
  }

  const json = await res.json();
  const lastRunAt =
    json.execution_ended_at ||
    json.execution_started_at ||
    json.submitted_at ||
    null;
  // Quote must belong to whichever token actually ran, not assumed CLAWD.
  const rawRows = json.result?.rows || [];
  const ranAddress = String(rawRows[0]?.Address || expectedAddress || CLAWD_TOKEN_ADDRESS).toLowerCase();
  const quote = await fetchClawdQuote(ranAddress);
  const rows = enrichClawdWireRows(rawRows, quote, ranAddress);

  return {
    rows,
    lastRunAt,
    marketCapUsd: quote.marketCapUsd,
    priceUsd: quote.priceUsd,
    priceChange24h: quote.priceChange24h,
    ranAddress,
  };
}
