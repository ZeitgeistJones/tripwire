import { canUseClawdWire } from "@/lib/gateAccess";
import { fetchClawdWireLatestFromDune } from "@/lib/clawdWireFetch";

/**
 * Latest ClawdWire results without executing — picks up runs from Dune UI or Trip button.
 * ~0.003 credits per call (tiny result set).
 */
export async function GET(request) {
  const wallet = request.headers.get("x-wallet-address") || "";
  if (!(await canUseClawdWire(wallet))) {
    return Response.json(
      { error: "Connect a Tripwire-eligible wallet (CLAWD holder access) to use ClawdWire." },
      { status: 403 }
    );
  }

  try {
    const data = await fetchClawdWireLatestFromDune();
    return Response.json(data);
  } catch (err) {
    const status = err?.status || 500;
    return Response.json({ error: String(err?.message || err) }, { status });
  }
}
