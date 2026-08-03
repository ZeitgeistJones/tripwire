import { canUseClawdWire } from "@/lib/gateAccess";
import {
  getClawdWireQueryId,
  resolvePulseToken,
  defaultPulseToken,
} from "@/lib/clawdWire";
import { readPulse, isCoolingDown, RETRIP_COOLDOWN_MS } from "@/lib/clawdWirePulse";

function unauthorized() {
  return Response.json(
    { error: "Connect a wallet with 10M+ CLAWD to Trip ClawdWire." },
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
          "CLAWD_WIRE_QUERY_ID is not set. Create the Dune query from docs/dune-CLAWDWIRE-any-token.sql and add the ID in Vercel env.",
      },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  let requested = searchParams.get("token");
  if (!requested) {
    try {
      requested = (await request.json())?.token || null;
    } catch {
      requested = null;
    }
  }

  // Unknown addresses are refused rather than defaulted: silently pulsing the
  // wrong token would spend a credit and cache a result under a name nobody
  // asked for.
  const token = requested ? resolvePulseToken(requested) : defaultPulseToken();
  if (!token) {
    return Response.json(
      { error: "That token is not tracked by Tripwire, so it cannot be pulsed." },
      { status: 400 }
    );
  }

  // One paid run per token per cooldown. Without this, a held-down button is a
  // bill.
  const cached = await readPulse(token.address);
  if (isCoolingDown(cached)) {
    const mins = Math.ceil(
      (RETRIP_COOLDOWN_MS - (Date.now() - new Date(cached.lastRunAt).getTime())) / 60000
    );
    return Response.json(
      {
        error: `${token.symbol} was pulsed recently. Fresh run available in ~${mins}m — the cached pulse is showing meanwhile.`,
        cooldown: true,
        lastRunAt: cached.lastRunAt,
        token: token.address,
      },
      { status: 429 }
    );
  }

  try {
    // Always send the parameters. Relying on the query's saved defaults would
    // mean the result depends on whatever token was last run by hand in Dune.
    const res = await fetch(
      `https://api.dune.com/api/v1/query/${queryId}/execute`,
      {
        method: "POST",
        headers: {
          "X-Dune-API-Key": process.env.DUNE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query_parameters: {
            token_address: token.address,
            token_name: token.symbol,
          },
        }),
      }
    );
    if (!res.ok) {
      return Response.json({ error: `Dune execute failed: ${res.status}` }, { status: 500 });
    }
    const json = await res.json();
    return Response.json({
      executionId: json.execution_id,
      token: token.address,
      symbol: token.symbol,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
