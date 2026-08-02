import { canUseClawdWire } from "@/lib/gateAccess";
import { CLAWD_TOKEN_ADDRESS } from "@/lib/clawdWire";
import { enrichClawdWireRows, fetchClawdMarketCap } from "@/lib/clawdWireFetch";
import { writePulse, normalizeTokenAddress } from "@/lib/clawdWirePulse";

export async function GET(request) {
  const wallet = request.headers.get("x-wallet-address") || "";
  if (!(await canUseClawdWire(wallet))) {
    return Response.json(
      { error: "Connect a Tripwire-eligible wallet (CLAWD holder access) to use ClawdWire." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get("executionId");
  if (!executionId) {
    return Response.json({ error: "Missing executionId" }, { status: 400 });
  }

  try {
    const statusRes = await fetch(
      `https://api.dune.com/api/v1/execution/${executionId}/status`,
      { headers: { "X-Dune-API-Key": process.env.DUNE_API_KEY } }
    );
    const statusJson = await statusRes.json();

    if (statusJson.state !== "QUERY_STATE_COMPLETED") {
      return Response.json({ state: statusJson.state });
    }

    const resultsRes = await fetch(
      `https://api.dune.com/api/v1/execution/${executionId}/results`,
      { headers: { "X-Dune-API-Key": process.env.DUNE_API_KEY } }
    );
    const resultsJson = await resultsRes.json();
    const marketCapUsd = await fetchClawdMarketCap();
    const rows = enrichClawdWireRows(resultsJson.result?.rows || [], marketCapUsd);
    const lastRunAt =
      resultsJson.execution_ended_at ||
      statusJson.execution_ended_at ||
      new Date().toISOString();

    // Cache the finished run so everyone else reads it for free.
    const token = normalizeTokenAddress(
      searchParams.get("token") || rows[0]?.Address || CLAWD_TOKEN_ADDRESS
    );
    await writePulse({
      address: token,
      symbol: rows[0]?.Project || null,
      rows,
      lastRunAt,
      executionId,
    });

    return Response.json({
      state: "QUERY_STATE_COMPLETED",
      rows,
      lastRunAt,
      token,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
