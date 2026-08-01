import { fetchClawdWireLatestFromDune } from "@/lib/clawdWireFetch";

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

/** Admin: latest ClawdWire Dune result (Result Read only — no execute). */
export async function GET(req) {
  const secret = req.headers.get("x-admin-secret") || "";
  const expected = process.env.ADMIN_SECRET || "";
  if (!expected || secret !== expected) return unauthorized();

  try {
    const data = await fetchClawdWireLatestFromDune();
    return Response.json(data);
  } catch (err) {
    const status = err?.status || 500;
    return Response.json({ error: String(err?.message || err) }, { status });
  }
}
