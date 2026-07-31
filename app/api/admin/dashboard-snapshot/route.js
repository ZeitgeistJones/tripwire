import { getDashboardDataFresh } from "@/lib/getData";

export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

/**
 * Rebuild from Dune + prices and publish to Upstash.
 * Public pages / banner read that same snapshot — admin Refresh is the alignment lever.
 */
export async function GET(req) {
  const secret = req.headers.get("x-admin-secret") || "";
  const expected = process.env.ADMIN_SECRET || "";
  if (!expected || secret !== expected) return unauthorized();

  try {
    const { rows, lastUpdated } = await getDashboardDataFresh();
    return Response.json({ rows, lastUpdated });
  } catch (err) {
    console.error("[admin/dashboard-snapshot]", String(err));
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
