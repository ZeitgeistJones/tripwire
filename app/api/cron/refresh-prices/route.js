import { refreshDashboardPrices } from "@/lib/getData";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Keeps the free half of the dashboard live.
 *
 * The site has two data speeds with very different costs: prices and market
 * caps come from CoinGecko/DexScreener and cost nothing, while the on-chain
 * behavioural metrics come from a full-token Dune scan that is expensive to
 * execute. Nothing was automated, so the cheap half went stale for the same
 * reason the expensive half did — and there was never a good reason for that.
 *
 * This refreshes prices only. It deliberately calls refreshDashboardPrices()
 * rather than getDashboardDataFresh(), because the latter would spend Dune
 * credits on a schedule, which is exactly what we are avoiding. Re-running the
 * expensive scan stays a deliberate, manual act.
 */
export async function GET(request) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without the secret
  // set this endpoint stays closed rather than defaulting to open, since an
  // open refresh endpoint is a free way for anyone to burn our rate limits.
  const expected = process.env.CRON_SECRET || "";
  if (!expected) {
    return Response.json(
      { error: "CRON_SECRET is not set — refusing to run an unauthenticated refresh." },
      { status: 503 }
    );
  }

  const auth = request.headers.get("authorization") || "";
  if (auth !== `Bearer ${expected}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  try {
    const data = await refreshDashboardPrices();
    return Response.json({
      ok: true,
      rows: data.rows?.length ?? 0,
      pricesUpdatedAt: data.pricesUpdatedAt ?? null,
      duneLastUpdated: data.lastUpdated ?? null,
      duneCreditsSpent: 0,
      ms: Date.now() - startedAt,
    });
  } catch (err) {
    console.error("[cron/refresh-prices]", String(err));
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
