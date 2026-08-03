import { CLAWD_TOKEN_ADDRESS, getClawdWireQueryId } from "@/lib/clawdWire";

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

function requireAdmin(req) {
  const secret = req.headers.get("x-admin-secret") || "";
  const expected = process.env.ADMIN_SECRET || "";
  return Boolean(expected && secret === expected);
}

/**
 * Admin: inspect the configured ClawdWire Dune query (no execute).
 * Confirms CLAWD_WIRE_QUERY_ID and whether token_address / token_name exist.
 */
export async function GET(req) {
  if (!requireAdmin(req)) return unauthorized();

  const queryId = getClawdWireQueryId();
  if (!queryId) {
    return Response.json(
      { error: "CLAWD_WIRE_QUERY_ID is not set" },
      { status: 503 }
    );
  }

  const key = process.env.DUNE_API_KEY;
  if (!key) {
    return Response.json({ error: "DUNE_API_KEY is not set" }, { status: 503 });
  }

  try {
    const res = await fetch(`https://api.dune.com/api/v1/query/${queryId}`, {
      headers: { "X-Dune-API-Key": key },
      cache: "no-store",
    });
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    if (!res.ok) {
      return Response.json(
        {
          queryId,
          duneStatus: res.status,
          error: json?.error || text.slice(0, 300) || `Dune query fetch failed: ${res.status}`,
        },
        { status: 502 }
      );
    }

    const params = Array.isArray(json?.parameters) ? json.parameters : [];
    const paramKeys = params.map((p) => p.key || p.name).filter(Boolean);
    const sql = String(json?.query_sql || json?.sql || "");
    return Response.json({
      queryId,
      name: json?.name || null,
      paramKeys,
      hasTokenAddressParam: paramKeys.includes("token_address"),
      hasTokenNameParam: paramKeys.includes("token_name"),
      sqlMentionsTokenAddress: sql.includes("{{token_address}}"),
      sqlMentionsTokenName: sql.includes("{{token_name}}"),
      isLegacyClawdOnlyId: String(queryId) === "8180604",
      clawdFallbackAddress: CLAWD_TOKEN_ADDRESS,
      hint:
        paramKeys.includes("token_address") && paramKeys.includes("token_name")
          ? "Query looks ready for multi-token Trip."
          : String(queryId) === "8180604"
            ? "CLAWD_WIRE_QUERY_ID is still the CLAWD-only query 8180604. Trip sends token_address/token_name → Dune 400. Point env at the any-token query (docs/dune-CLAWDWIRE-any-token.sql) with those two TEXT params, or keep 8180604 and only Trip CLAWD (start route will retry without params)."
            : "Create two TEXT parameters on this Dune query: token_address and token_name (defaults CLAWD address / CLAWD).",
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

/**
 * Admin: cancel a stuck Dune execution by id.
 * Body: { executionId: "01HK..." }
 */
export async function POST(req) {
  if (!requireAdmin(req)) return unauthorized();

  const key = process.env.DUNE_API_KEY;
  if (!key) {
    return Response.json({ error: "DUNE_API_KEY is not set" }, { status: 503 });
  }

  let executionId = null;
  try {
    const body = await req.json();
    executionId = body?.executionId || null;
  } catch {
    executionId = null;
  }
  if (!executionId) {
    return Response.json({ error: "executionId required" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.dune.com/api/v1/execution/${encodeURIComponent(executionId)}/cancel`,
      {
        method: "POST",
        headers: { "X-Dune-API-Key": key },
      }
    );
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      return Response.json(
        { error: json?.error || `Dune cancel failed: ${res.status}`, duneStatus: res.status },
        { status: 502 }
      );
    }
    return Response.json({ ok: true, cancelled: json?.success !== false, raw: json });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
