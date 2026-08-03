import { canUseClawdWire } from "@/lib/gateAccess";
import { resolvePulseToken, defaultPulseToken, normalizeAddress } from "@/lib/clawdWire";
import { fetchClawdWireLatestFromDune } from "@/lib/clawdWireFetch";
import { readPulse, writePulse } from "@/lib/clawdWirePulse";

/**
 * Latest ClawdWire results for one token.
 *
 * Cache first, always. Reading a pulse someone else already paid to run is
 * free and open to everyone — that is the point of caching it. Only the
 * fallback that actually talks to Dune stays gated, so clicking through coins
 * can never cost anything.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const requested = searchParams.get("token");
  const token = requested ? resolvePulseToken(requested) : defaultPulseToken();

  if (!token) {
    return Response.json(
      { error: "That token is not tracked by Tripwire." },
      { status: 400 }
    );
  }

  const cached = await readPulse(token.address);
  // Treat empty cached pulses as a miss — a bad Trip once wrote 0 rows over a
  // good run and the UI looked like the token had never been pulsed.
  if (cached && Array.isArray(cached.rows) && cached.rows.length > 0) {
    return Response.json({
      rows: cached.rows,
      lastRunAt: cached.lastRunAt,
      token: token.address,
      symbol: token.symbol,
      cached: true,
    });
  }

  // Cache miss. Only a holder may warm it, because this call hits Dune.
  const wallet = request.headers.get("x-wallet-address") || "";
  if (!(await canUseClawdWire(wallet))) {
    return Response.json({
      rows: [],
      lastRunAt: null,
      token: token.address,
      symbol: token.symbol,
      cached: false,
      needsRun: true,
      message: `No pulse has been run for ${token.symbol} yet.`,
    });
  }

  try {
    const data = await fetchClawdWireLatestFromDune(token.address);
    const rows = data?.rows || [];

    // Dune's "latest results" is per QUERY, not per token — it returns whatever
    // ran last, which may well be a different coin. Serving that unchecked is
    // how one token's numbers end up under another token's name, so the row has
    // to prove which token it is before we trust it.
    const rowAddress = normalizeAddress(rows[0]?.Address);
    if (!rows.length || rowAddress !== token.address) {
      return Response.json({
        rows: [],
        lastRunAt: null,
        token: token.address,
        symbol: token.symbol,
        cached: false,
        needsRun: true,
        message: `No pulse has been run for ${token.symbol} yet.`,
      });
    }

    await writePulse({
      address: token.address,
      symbol: token.symbol,
      rows,
      lastRunAt: data.lastRunAt,
    });
    return Response.json({
      rows,
      lastRunAt: data.lastRunAt,
      token: token.address,
      symbol: token.symbol,
      cached: false,
    });
  } catch (err) {
    const status = err?.status || 500;
    return Response.json({ error: String(err?.message || err) }, { status });
  }
}
