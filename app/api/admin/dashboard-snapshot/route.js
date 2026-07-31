import { getDashboardData, getDashboardDataFresh } from "@/lib/getData";

export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

/**
 * ?read=1 → return the shared Upstash snapshot (no Dune rebuild).
 * default → rebuild from Dune + prices and publish (Admin "Refresh snapshot").
 */
export async function GET(req) {
  const secret = req.headers.get("x-admin-secret") || "";
  const expected = process.env.ADMIN_SECRET || "";
  if (!expected || secret !== expected) return unauthorized();

  try {
    const url = new URL(req.url);
    const readOnly = url.searchParams.get("read") === "1";
    const data = readOnly ? await getDashboardData() : await getDashboardDataFresh();
    return Response.json({
      rows: data.rows,
      lastUpdated: data.lastUpdated,
      builtAt: data.builtAt ?? null,
    });
  } catch (err) {
    console.error("[admin/dashboard-snapshot]", String(err));
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
