import { CLAWD_TOKEN_ADDRESS, getClawdWireQueryId } from "@/lib/clawdWire";

/**
 * Market cap for the token that actually ran. Defaults to CLAWD, but must be
 * passed the real address once other tokens can be pulsed — otherwise every
 * coin gets CLAWD's market cap stapled to it, and every metric derived from
 * mcap (the whale/retail divergence in bps) is quietly wrong.
 */
export async function fetchClawdMarketCap(tokenAddress = CLAWD_TOKEN_ADDRESS) {
  const address = String(tokenAddress || CLAWD_TOKEN_ADDRESS).toLowerCase();
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/base/contract/${address}`,
      {
        headers: { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.market_data?.market_cap?.usd || null;
  } catch {
    return null;
  }
}

export function enrichClawdWireRows(rows, marketCapUsd) {
  return (rows || []).map((row) => ({
    ...row,
    Address: row["Address"] || CLAWD_TOKEN_ADDRESS,
    marketCapUsd,
  }));
}

/** Latest saved result for the ClawdWire query (no execute). */
export async function fetchClawdWireLatestFromDune() {
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
  const marketCapUsd = await fetchClawdMarketCap();
  const rows = enrichClawdWireRows(json.result?.rows || [], marketCapUsd);

  return { rows, lastRunAt, marketCapUsd };
}
