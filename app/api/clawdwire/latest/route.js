import { isWireTester } from "@/lib/wireAccess";
import { fetchClawdWireLatestFromDune } from "@/lib/clawdWireFetch";

/**
 * Latest ClawdWire results without executing — picks up runs from Dune UI or Trip button.
 * ~0.003 credits per call (tiny result set).
 */
export async function GET(request) {
  const wallet = request.headers.get("x-wallet-address") || "";
  if (!isWireTester(wallet)) {
    return Response.json(
      { error: "ClawdWire is under construction — tester access only." },
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
