import { isWireTester } from "@/lib/wireAccess";

async function fetchCoinGeckoMarketCap(address) {
  try {
    const res = await fetch(
      `https://api.coingecko.com/api/v3/coins/base/contract/${address}`,
      {
        headers: { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY },
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.market_data?.market_cap?.usd || null;
  } catch {
    return null;
  }
}

export async function GET(request) {
  const wallet = request.headers.get("x-wallet-address") || "";
  if (!isWireTester(wallet)) {
    return Response.json(
      { error: "The Wire is under construction — tester access only." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const executionId = searchParams.get("executionId");
  if (!executionId) {
    return Response.json({ error: "Missing executionId" }, { status: 400 });
  }

  try {
    const statusRes = await fetch(
      `https://api.dune.com/api/v1/execution/${executionId}/status`,
      { headers: { "X-Dune-API-Key": process.env.DUNE_API_KEY } }
    );
    const statusJson = await statusRes.json();

    if (statusJson.state !== "QUERY_STATE_COMPLETED") {
      return Response.json({ state: statusJson.state });
    }

    const resultsRes = await fetch(
      `https://api.dune.com/api/v1/execution/${executionId}/results`,
      { headers: { "X-Dune-API-Key": process.env.DUNE_API_KEY } }
    );
    const resultsJson = await resultsRes.json();
    const rows = resultsJson.result?.rows || [];

    const enriched = await Promise.all(
      rows.map(async (row) => {
        const address = row["Address"];
        const marketCapUsd = address ? await fetchCoinGeckoMarketCap(address) : null;
        return { ...row, marketCapUsd };
      })
    );

    return Response.json({ state: "QUERY_STATE_COMPLETED", rows: enriched });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
