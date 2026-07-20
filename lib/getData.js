import { cache } from "react";
import tokens from "./tokens";

const DUNE_QUERY_ID = "7762446";
const DUNE_REVALIDATE_SECONDS = 3600;

async function fetchCoinGeckoJSON(
  url,
  { retries = 2, retryDelayMs = 1500, revalidate } = {}
) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const fetchOptions = {
        headers: { "x-cg-demo-api-key": process.env.COINGECKO_API_KEY },
      };

      if (revalidate) {
        fetchOptions.next = { revalidate };
      } else {
        fetchOptions.cache = "no-store";
      }

      const res = await fetch(url, fetchOptions);

      if (res.status === 429) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
          continue;
        }
        return { ok: false, status: 429, data: null };
      }

      if (!res.ok) {
        return { ok: false, status: res.status, data: null };
      }

      const data = await res.json();
      return { ok: true, status: res.status, data };
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelayMs * (attempt + 1)));
        continue;
      }
      return { ok: false, status: 0, data: null, error: String(err) };
    }
  }

  return { ok: false, status: 0, data: null };
}

async function fetchDuneData() {
  // Shared Next.js Data Cache across routes so lastUpdated matches everywhere.
  const res = await fetch(
    `https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/results`,
    {
      headers: { "X-Dune-API-Key": process.env.DUNE_API_KEY },
      next: { revalidate: DUNE_REVALIDATE_SECONDS, tags: ["dune-dashboard"] },
    }
  );

  if (!res.ok) {
    console.error(`Dune API error: ${res.status}`);
    return { rows: [], lastUpdated: null };
  }

  const json = await res.json();
  return {
    rows: json.result?.rows || [],
    lastUpdated:
      json.execution_ended_at ||
      json.execution_started_at ||
      json.submitted_at ||
      null,
  };
}

export async function getScoresLastUpdated() {
  const { lastUpdated } = await fetchDuneData();
  return lastUpdated;
}

async function fetchCoinGeckoPrices(addresses) {
  const lookup = {};
  const batchSize = 100;

  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize).map((a) => a.toLowerCase());
    const joined = batch.join(",");

    const url =
      `https://api.coingecko.com/api/v3/simple/token_price/base` +
      `?contract_addresses=${joined}` +
      `&vs_currencies=usd` +
      `&include_market_cap=true` +
      `&include_24hr_vol=true` +
      `&include_24hr_change=true`;

    const res = await fetchCoinGeckoJSON(url, { retries: 2 });
    if (!res.ok) {
      console.error(`[CoinGecko] batch fetch failed: status=${res.status}`, res.error ?? "");
      continue;
    }

    const data = res.data || {};
    for (const addr of batch) {
      const entry = data[addr] ?? null;
      lookup[addr] = {
        priceUsd:      entry?.usd ?? null,
        marketCapUsd:  entry?.usd_market_cap ?? null,
        volume24h:     entry?.usd_24h_vol ?? null,
        priceChange24h:entry?.usd_24h_change ?? null,
      };
    }
  }

  return lookup;
}

// Fallback price source for tokens CoinGecko doesn't index.
// DexScreener has much better long-tail Base coverage. No API key needed.
// Returns pairs, not tokens — so for each token we pick the pair with the
// highest USD liquidity as the canonical price.
async function fetchDexScreenerPrices(addresses) {
  const lookup = {};
  const batchSize = 30; // DexScreener max per request

  for (let i = 0; i < addresses.length; i += batchSize) {
    const batch = addresses.slice(i, i + batchSize).map((a) => a.toLowerCase());
    const url = `https://api.dexscreener.com/tokens/v1/base/${batch.join(",")}`;

    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        console.error(`[DexScreener] batch fetch failed: status=${res.status}`);
        continue;
      }

      const pairs = await res.json();
      if (!Array.isArray(pairs)) continue;

      for (const pair of pairs) {
        const addr = pair?.baseToken?.address?.toLowerCase();
        if (!addr) continue;

        const liquidity = pair?.liquidity?.usd ?? 0;
        const existing = lookup[addr];
        if (existing && existing._liquidityUsd >= liquidity) continue;

        const parsedPrice =
          pair?.priceUsd != null ? parseFloat(pair.priceUsd) : null;

        lookup[addr] = {
          priceUsd:       parsedPrice != null && !Number.isNaN(parsedPrice) ? parsedPrice : null,
          marketCapUsd:   pair?.marketCap ?? pair?.fdv ?? null,
          volume24h:      pair?.volume?.h24 ?? null,
          priceChange24h: pair?.priceChange?.h24 ?? null,
          _liquidityUsd:  liquidity,
        };
      }
    } catch (err) {
      console.error("[DexScreener] fetch error:", String(err));
    }
  }

  return lookup;
}

function getSignal(volumeChangePct, priceChangePct) {
  if (volumeChangePct == null || priceChangePct == null) return "No Data";
  const volUp   = volumeChangePct > 0;
  const priceUp = priceChangePct > 0;
  if (volUp && priceUp)   return "Confirmed Growth";
  if (volUp && !priceUp)  return "Absorbed";
  if (!volUp && priceUp)  return "Thin Rally";
  return "Cooling";
}

function getSignalScore(volumeChangePct, priceChangePct) {
  if (volumeChangePct == null || priceChangePct == null) return null;
  const clip = (v) => Math.max(-100, Math.min(100, v));
  return Math.round((clip(priceChangePct) * 0.6 + clip(volumeChangePct) * 0.4) * 10) / 10;
}

function getRead(prof, signal) {
  if (!prof || !signal || signal === "No Data" || signal === "No CG Data") return null;
  const map = {
    Breakout:      { "Confirmed Growth": "Beacon", Absorbed: "Undercurrent", "Thin Rally": "Overshoot",    Cooling: "Quiet Beacon" },
    "Quick Mover": { "Confirmed Growth": "Flare",  Absorbed: "Backdraft",    "Thin Rally": "Flashpoint",   Cooling: "Afterglow" },
    "Slow Burner": { "Confirmed Growth": "Low Hum",Absorbed: "Low Signal",   "Thin Rally": "Soft Ping",    Cooling: "Standby" },
    Cold:          { "Confirmed Growth": "Mirage", Absorbed: "Bleed",        "Thin Rally": "False Flare",  Cooling: "Flatline" },
  };
  return map[prof]?.[signal] ?? null;
}

function toFloat(v) {
  if (v == null || v === "") return null;
  const n = parseFloat(v);
  return Number.isNaN(n) ? null : n;
}

export const getDashboardData = cache(async function getDashboardData() {
  const { rows: duneRows, lastUpdated } = await fetchDuneData();
  const duneByAddress = {};

  for (const row of duneRows) {
    const addr = row["Address"]?.toLowerCase();
    if (addr) duneByAddress[addr] = row;
  }

  const allAddresses = tokens.filter((t) => t.address).map((t) => t.address);
  const priceLookup  = await fetchCoinGeckoPrices(allAddresses);

  // Any address CoinGecko returned nothing for gets a second chance via DexScreener
  const missingAddresses = allAddresses
    .map((a) => a.toLowerCase())
    .filter((a) => priceLookup[a]?.priceUsd == null);

  const dexLookup = missingAddresses.length
    ? await fetchDexScreenerPrices(missingAddresses)
    : {};

  const tokensWithAddress = tokens.filter((t) => t.address);
  const tokensWithout     = tokens.filter((t) => !t.address);

  const enrichedWithAddress = tokensWithAddress.map((token) => {
    const addrKey     = token.address.toLowerCase();
    const duneRow     = duneByAddress[addrKey];

    const cgEntry  = priceLookup[addrKey];
    const hasCg    = cgEntry?.priceUsd != null;
    const dexEntry = !hasCg ? dexLookup[addrKey] : null;
    const hasDex   = dexEntry?.priceUsd != null;

    const cg          = hasCg ? cgEntry : hasDex ? dexEntry : null;
    const priceSource = hasCg ? "coingecko" : hasDex ? "dexscreener" : null;

    const priceChange   = cg?.priceChange24h ?? null;
    const volumeGrowth  = toFloat(duneRow?.["Vol Grw %"] ?? duneRow?.["Vol Grw"] ?? null);

    const signal = cg ? getSignal(volumeGrowth, priceChange) : "No Data";
    const prof   = duneRow?.["Prof"] ?? null;
    const read   = getRead(prof, signal);

    const rawNewPct = toFloat(duneRow?.["New %"] ?? duneRow?.["New Wallet %"] ?? duneRow?.["New"] ?? null);
    const newPct    = rawNewPct != null && rawNewPct <= 1.5 ? rawNewPct * 100 : rawNewPct;

    return {
      Project:             duneRow?.["Project"] ?? token.name,
      Symbol:              token.symbol,
      Address:             token.address,
      Tag:                 token.tag,
      "O Rk":              duneRow?.["O Rk"] ?? null,
      Opp:                 toFloat(duneRow?.["Opp"]),
      "M Rk":              duneRow?.["M Rk"] ?? null,
      Mom:                 toFloat(duneRow?.["Mom"]),
      "S Rk":              duneRow?.["S Rk"] ?? null,
      Sus:                 toFloat(duneRow?.["Sus"]),
      Prof:                prof,
      "Qlty %":            toFloat(duneRow?.["Qlty %"] ?? duneRow?.["Qlty"]),
      "Vol 30d":           toFloat(duneRow?.["Vol 30d"]),
      "Vol/Tx":            toFloat(duneRow?.["Vol/Tx"] ?? duneRow?.["VolTx"]),
      "Vol/Wlt":           toFloat(duneRow?.["Vol/Wlt"] ?? duneRow?.["VolWlt"]),
      "Vol Grw %":         volumeGrowth,
      "Txs 30d":           toFloat(duneRow?.["Txs 30d"]),
      "Txs 7d":            toFloat(duneRow?.["Txs 7d"]),
      "Tx Grw %":          toFloat(duneRow?.["Tx Grw %"] ?? duneRow?.["Tx Grw"]),
      "Txs/User":          toFloat(duneRow?.["Txs/User"] ?? duneRow?.["TxsUser"]),
      "Wallets 30d":       toFloat(duneRow?.["Wallets 30d"]),
      "Wallets 7d":        toFloat(duneRow?.["Wallets 7d"]),
      "User Grw %":        toFloat(duneRow?.["User Grw %"] ?? duneRow?.["User Grw"]),
      "New Wallets":       toFloat(duneRow?.["New Wallets"] ?? duneRow?.["New 30d"]),
      "Returning Wallets": toFloat(duneRow?.["Returning Wallets"] ?? duneRow?.["Return 30d"]),
      "New %":             newPct,
      "Retention %":       toFloat(duneRow?.["Retention %"] ?? duneRow?.["Retention"]),
      "Avg Txs Ret":       toFloat(duneRow?.["Avg Txs Ret"]),
      Traders:             toFloat(duneRow?.["Traders"]),
      "Buyers 30d":        toFloat(duneRow?.["Buyers 30d"]),
      "Buyers 7d":         toFloat(duneRow?.["Buyers 7d"]),
      "1st Buyers 30d":    toFloat(duneRow?.["1st Buyers 30d"]),
      "1st Buyers 7d":     toFloat(duneRow?.["1st Buyers 7d"]),
      "1st Sellers 30d":   toFloat(duneRow?.["1st Sellers 30d"]),
      "1st Sellers 7d":    toFloat(duneRow?.["1st Sellers 7d"]),
      "Buy/Sell Ratio":    toFloat(duneRow?.["Buy/Sell Ratio"]),
      "Token Age Days":    toFloat(duneRow?.["Token Age Days"]),
      "Non-Trade New 30d": toFloat(duneRow?.["Non-Trade New 30d"]),
      "Whale Net 7d":      toFloat(duneRow?.["Whale Net 7d"]),
      "Accum %":           toFloat(duneRow?.["Accum %"]),
      "Whale Buyers 7d":   toFloat(duneRow?.["Whale Buyers 7d"]),
      "Whale Sellers 7d":  toFloat(duneRow?.["Whale Sellers 7d"]),
      "Top10 %":           toFloat(duneRow?.["Top10 %"] ?? duneRow?.["Top10"]),
      "Risk %":            toFloat(duneRow?.["Risk %"] ?? duneRow?.["Risk"]),
      priceUsd:            cg?.priceUsd ?? null,
      marketCapUsd:        cg?.marketCapUsd ?? null,
      priceChange7d:       priceChange,
      priceSource,
      signal,
      signalScore:         cg ? getSignalScore(volumeGrowth, priceChange) : null,
      read,
    };
  });

  const enrichedWithout = tokensWithout.map((token) => ({
    Project:             token.name,
    Symbol:              token.symbol,
    Address:             null,
    Tag:                 token.tag,
    "O Rk":              null,
    Opp:                 null,
    "M Rk":              null,
    Mom:                 null,
    "S Rk":              null,
    Sus:                 null,
    Prof:                null,
    "Qlty %":            null,
    "Vol 30d":           null,
    "Vol/Tx":            null,
    "Vol/Wlt":           null,
    "Vol Grw %":         null,
    "Txs 30d":           null,
    "Txs 7d":            null,
    "Tx Grw %":          null,
    "Txs/User":          null,
    "Wallets 30d":       null,
    "Wallets 7d":        null,
    "User Grw %":        null,
    "New Wallets":       null,
    "Returning Wallets": null,
    "New %":             null,
    "Retention %":       null,
    "Avg Txs Ret":       null,
    Traders:             null,
    "Buyers 30d":        null,
    "Buyers 7d":         null,
    "1st Buyers 30d":    null,
    "1st Buyers 7d":     null,
    "1st Sellers 30d":   null,
    "1st Sellers 7d":    null,
    "Non-Trade New 30d": null,
    "Whale Net 7d":      null,
    "Accum %":           null,
    "Whale Buyers 7d":   null,
    "Whale Sellers 7d":  null,
    "Top10 %":           null,
    "Risk %":            null,
    priceUsd:            null,
    marketCapUsd:        null,
    priceChange7d:       null,
    priceSource:         null,
    signal:              "No Address",
    signalScore:         null,
    read:                null,
  }));

  return {
    rows: [...enrichedWithAddress, ...enrichedWithout],
    lastUpdated,
  };
});
