import { canUseClawdWire } from "@/lib/gateAccess";
import { CLAWD_TOKEN_ADDRESS } from "@/lib/clawdWire";
import { fetchClawdWireLatestFromDune } from "@/lib/clawdWireFetch";
import { readPulse, writePulse, normalizeTokenAddress } from "@/lib/clawdWirePulse";

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
  const token = normalizeTokenAddress(searchParams.get("token") || CLAWD_TOKEN_ADDRESS);

  const cached = await readPulse(token);
  if (cached) {
    return Response.json({
      rows: cached.rows,
      lastRunAt: cached.lastRunAt,
      token,
      cached: true,
    });
  }

  // Cache miss. Only a holder may warm it, because this call hits Dune.
  const wallet = request.headers.get("x-wallet-address") || "";
  if (!(await canUseClawdWire(wallet))) {
    return Response.json({
      rows: [],
      lastRunAt: null,
      token,
      cached: false,
      needsRun: true,
      message: "No pulse has been run for this token yet.",
    });
  }

  try {
    const data = await fetchClawdWireLatestFromDune();
    if (data?.rows?.length) {
      await writePulse({
        address: token,
        symbol: data.rows[0]?.Project || null,
        rows: data.rows,
        lastRunAt: data.lastRunAt,
      });
    }
    return Response.json({ ...data, token, cached: false });
  } catch (err) {
    const status = err?.status || 500;
    return Response.json({ error: String(err?.message || err) }, { status });
  }
}
