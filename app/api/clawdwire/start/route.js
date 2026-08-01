import { canUseClawdWire } from "@/lib/gateAccess";
import { getClawdWireQueryId } from "@/lib/clawdWire";

function unauthorized() {
  return Response.json(
    { error: "Connect a Tripwire-eligible wallet (CLAWD holder access) to run ClawdWire." },
    { status: 403 }
  );
}

export async function POST(request) {
  const wallet = request.headers.get("x-wallet-address") || "";
  if (!(await canUseClawdWire(wallet))) return unauthorized();

  const queryId = getClawdWireQueryId();
  if (!queryId) {
    return Response.json(
      {
        error:
          "CLAWD_WIRE_QUERY_ID is not set. Create the Dune query from docs/dune-CLAWDWIRE-paste-this.sql and add the ID in Vercel env.",
      },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(
      `https://api.dune.com/api/v1/query/${queryId}/execute`,
      {
        method: "POST",
        headers: { "X-Dune-API-Key": process.env.DUNE_API_KEY },
      }
    );
    if (!res.ok) {
      return Response.json({ error: `Dune execute failed: ${res.status}` }, { status: 500 });
    }
    const json = await res.json();
    return Response.json({ executionId: json.execution_id });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
