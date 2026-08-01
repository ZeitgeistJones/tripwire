import { canUseClawdWire } from "@/lib/gateAccess";
import { enrichClawdWireRows, fetchClawdMarketCap } from "@/lib/clawdWireFetch";

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

    return Response.json({
      state: "QUERY_STATE_COMPLETED",
      rows,
      lastRunAt,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
