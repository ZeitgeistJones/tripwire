import { getDashboardData, getDashboardDataFresh, refreshDashboardPrices } from "@/lib/getData";

export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

/**
 * ?read=1     → shared Upstash snapshot (no rebuild)
 * ?mode=dune  → Dune Result Read + prices (costs ~2 credits)
 * default     → prices only on existing snapshot (no Dune credits)
 */
export async function GET(req) {
  const secret = req.headers.get("x-admin-secret") || "";
  const expected = process.env.ADMIN_SECRET || "";
  if (!expected || secret !== expected) return unauthorized();

  try {
    const url = new URL(req.url);
    const readOnly = url.searchParams.get("read") === "1";
    const mode = url.searchParams.get("mode");

    let data;
    if (readOnly) {
      data = await getDashboardData();
    } else if (mode === "dune") {
      data = await getDashboardDataFresh();
    } else {
      data = await refreshDashboardPrices();
    }

    return Response.json({
      rows: data.rows,
      lastUpdated: data.lastUpdated,
      pricesUpdatedAt: data.pricesUpdatedAt ?? null,
      builtAt: data.builtAt ?? null,
    });
  } catch (err) {
    console.error("[admin/dashboard-snapshot]", String(err));
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
