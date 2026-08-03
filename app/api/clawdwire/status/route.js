import { canUseClawdWire } from "@/lib/gateAccess";
import { CLAWD_TOKEN_ADDRESS, resolvePulseToken } from "@/lib/clawdWire";
import { enrichClawdWireRows, fetchClawdQuote } from "@/lib/clawdWireFetch";
import { writePulse, normalizeTokenAddress } from "@/lib/clawdWirePulse";

export async function GET(request) {
  const wallet = request.headers.get("x-wallet-address") || "";
  if (!(await canUseClawdWire(wallet))) {
    return Response.json(
      { error: "Connect a wallet with 10M+ CLAWD to use ClawdWire Trip." },
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
    const rawRows = resultsJson.result?.rows || [];

    // Trust the execution's own row over anything the caller asked for: this is
    // the token that actually ran, so it decides the CoinGecko quote we attach
    // and the cache slot the result lands in. Solo CG call — not the dashboard batch.
    const ranAddress = normalizeTokenAddress(
      rawRows[0]?.Address || searchParams.get("token") || CLAWD_TOKEN_ADDRESS
    );
    const known = resolvePulseToken(ranAddress);

    // Empty result = broken/unsaved SQL or bad params. Never cache that — it
    // would overwrite a good pulse and the UI would look like "no pulse ever".
    if (!rawRows.length) {
      return Response.json({
        state: "QUERY_STATE_FAILED",
        error:
          "Dune finished with 0 rows. Check the ClawdWire query SQL is pasted and token_address / token_name params are set.",
        token: ranAddress,
        symbol: known?.symbol || null,
      });
    }

    const quote = await fetchClawdQuote(ranAddress);
    const rows = enrichClawdWireRows(rawRows, quote, ranAddress);
    const lastRunAt =
      resultsJson.execution_ended_at ||
      statusJson.execution_ended_at ||
      new Date().toISOString();

    // Cache the finished run so everyone else reads it for free.
    await writePulse({
      address: ranAddress,
      symbol: known?.symbol || rows[0]?.Project || null,
      rows,
      lastRunAt,
      executionId,
    });

    return Response.json({
      state: "QUERY_STATE_COMPLETED",
      rows,
      lastRunAt,
      token: ranAddress,
      symbol: known?.symbol || null,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
