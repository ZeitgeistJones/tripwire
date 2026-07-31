import { cache } from "react";
import tokens from "./tokens";
import {
  readDashboardSnapshot,
  writeDashboardSnapshot,
} from "./dashboardSnapshot";

const DUNE_QUERY_ID = "7762446";

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
  // Always no-store — shared cache is Upstash (dashboard snapshot), not Next Data Cache.
  const res = await fetch(
    `https://api.dune.com/api/v1/query/${DUNE_QUERY_ID}/results`,
    {
      headers: { "X-Dune-API-Key": process.env.DUNE_API_KEY },
      cache: "no-store",
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

/** Dune execution time from the published snapshot only (same clock as the table). */
export async function getScoresLastUpdated() {
  const snap = await readDashboardSnapshot();
  return snap?.lastUpdated ?? null;
}

/** Full snapshot meta for banner alignment (builtAt changes on every admin publish). */
export async function getDashboardSnapshotMeta() {
  const snap = await readDashboardSnapshot();
  if (!snap) return { lastUpdated: null, builtAt: null };
  return { lastUpdated: snap.lastUpdated ?? null, builtAt: snap.builtAt ?? null };
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

/**
 * Public + admin SSR: always serve the Upstash snapshot when it exists so every
 * surface (movers, dashboard, admin, banner) sees the same rows + lastUpdated.
 * Only rebuilds when no snapshot is published yet (first boot / empty KV).
 * Admin Refresh is the only path that publishes a newer snapshot on demand.
 */
export const getDashboardData = cache(async function getDashboardData() {
  const snap = await readDashboardSnapshot();
  if (snap) {
    return {
      rows: snap.rows,
      lastUpdated: snap.lastUpdated,
      builtAt: snap.builtAt,
    };
  }
  return publishDashboardData();
});

/** Admin Refresh — rebuild from Dune + prices and publish as the new shared snapshot. */
export async function getDashboardDataFresh() {
  const data = await buildDashboardData();
  const snap = await writeDashboardSnapshot(data);
  return { ...data, builtAt: snap.builtAt };
}

async function publishDashboardData() {
  const data = await buildDashboardData();
  try {
    const snap = await writeDashboardSnapshot(data);
    return { ...data, builtAt: snap.builtAt };
  } catch (err) {
    console.error("[getData] snapshot publish failed:", String(err));
    return { ...data, builtAt: null };
  }
}

async function buildDashboardData() {
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
    // "Absorbed" (volume up, price flat/down) is ambiguous on its own:
    // accumulation or quiet distribution. Whale net flow disambiguates.
    let signalNote = null;
    if (signal === "Absorbed") {
      const wn = toFloat(duneRow?.["Whale Net 7d"]);
      if (wn != null && Math.abs(wn) >= 250) signalNote = wn > 0 ? "whales in" : "whales out";
    }

    // Whale-retail divergence as basis points of market cap.
    // Positive = whales net buying more aggressively than retail.
    // Negative = retail buying more than whales (potential exit liquidity pattern).
    const whaleNet = toFloat(duneRow?.["Whale Net 7d"]);
    const retailNet = toFloat(duneRow?.["Retail Net 7d"]);
    const whaleNet24h = toFloat(duneRow?.["Whale Net 24h"]);
    const retailNet24h = toFloat(duneRow?.["Retail Net 24h"]);
    const mcapVal = cg?.marketCapUsd ?? null;
    let divergenceBps = null;
    if (whaleNet != null && retailNet != null && mcapVal != null && mcapVal > 0) {
      divergenceBps = Math.round(((whaleNet - retailNet) / mcapVal) * 10000 * 10) / 10;
    }
    let divergenceBps24h = null;
    if (whaleNet24h != null && retailNet24h != null && mcapVal != null && mcapVal > 0) {
      divergenceBps24h = Math.round(((whaleNet24h - retailNet24h) / mcapVal) * 10000 * 10) / 10;
    }
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
      "Vol 7d":            toFloat(duneRow?.["Vol 7d"]),
      "Vol 24h":           toFloat(duneRow?.["Vol 24h"]),
      "Vol/Tx":            toFloat(duneRow?.["Vol/Tx"] ?? duneRow?.["VolTx"]),
      "Vol/Tx 7d":         toFloat(duneRow?.["Vol/Tx 7d"]),
      "Vol/Tx 24h":        toFloat(duneRow?.["Vol/Tx 24h"]),
      "Vol/Wlt":           toFloat(duneRow?.["Vol/Wlt"] ?? duneRow?.["VolWlt"]),
      "Vol/Wlt 7d":        toFloat(duneRow?.["Vol/Wlt 7d"]),
      "Vol/Wlt 24h":       toFloat(duneRow?.["Vol/Wlt 24h"]),
      "Vol Grw %":         volumeGrowth,
      "Txs 30d":           toFloat(duneRow?.["Txs 30d"]),
      "Txs 7d":            toFloat(duneRow?.["Txs 7d"]),
      "Txs 24h":           toFloat(duneRow?.["Txs 24h"]),
      "Tx Grw %":          toFloat(duneRow?.["Tx Grw %"] ?? duneRow?.["Tx Grw"]),
      "Txs/User":          toFloat(duneRow?.["Txs/User"] ?? duneRow?.["TxsUser"]),
      "Txs/User 7d":       toFloat(duneRow?.["Txs/User 7d"]),
      "Txs/User 24h":      toFloat(duneRow?.["Txs/User 24h"]),
      "Wallets 30d":       toFloat(duneRow?.["Wallets 30d"]),
      "Wallets 7d":        toFloat(duneRow?.["Wallets 7d"]),
      "Wallets 24h":       toFloat(duneRow?.["Wallets 24h"]),
      "User Grw %":        toFloat(duneRow?.["User Grw %"] ?? duneRow?.["User Grw"]),
      "New Wallets":       toFloat(duneRow?.["New Wallets"] ?? duneRow?.["New 30d"]),
      "Returning Wallets": toFloat(duneRow?.["Returning Wallets"] ?? duneRow?.["Return 30d"]),
      "New %":             newPct,
      "Retention %":       toFloat(duneRow?.["Retention %"] ?? duneRow?.["Retention"]),
      "Avg Txs Ret":       toFloat(duneRow?.["Avg Txs Ret"]),
      Traders:             toFloat(duneRow?.["Traders"]),
      "Buyers 30d":        toFloat(duneRow?.["Buyers 30d"]),
      "Buyers 7d":         toFloat(duneRow?.["Buyers 7d"]),
      "Buyers 24h":        toFloat(duneRow?.["Buyers 24h"]),
      "1st Buyers 30d":    toFloat(duneRow?.["1st Buyers 30d"]),
      "1st Buyers 7d":     toFloat(duneRow?.["1st Buyers 7d"]),
      "1st Buyers 24h":    toFloat(duneRow?.["1st Buyers 24h"]),
      "1st Sellers 30d":   toFloat(duneRow?.["1st Sellers 30d"]),
      "1st Sellers 7d":    toFloat(duneRow?.["1st Sellers 7d"]),
      "1st Sellers 24h":   toFloat(duneRow?.["1st Sellers 24h"]),
      "Buy/Sell Ratio":    toFloat(duneRow?.["Buy/Sell Ratio"]),
      "Buy/Sell Ratio 24h": toFloat(duneRow?.["Buy/Sell Ratio 24h"]),
      "Token Age Days":    toFloat(duneRow?.["Token Age Days"]),
      "Non-Trade New 30d": toFloat(duneRow?.["Non-Trade New 30d"]),
      "Whale Net 7d":      whaleNet,
      "Whale Net 24h":     whaleNet24h,
      "Accum %":           toFloat(duneRow?.["Accum %"]),
      "Accum % 24h":       toFloat(duneRow?.["Accum % 24h"]),
      "Whale Buyers 7d":   toFloat(duneRow?.["Whale Buyers 7d"]),
      "Whale Sellers 7d":  toFloat(duneRow?.["Whale Sellers 7d"]),
      "Whale Buyers 24h":  toFloat(duneRow?.["Whale Buyers 24h"]),
      "Whale Sellers 24h": toFloat(duneRow?.["Whale Sellers 24h"]),
      "Hump Net 7d":       toFloat(duneRow?.["Hump Net 7d"]),
      "Hump Net 24h":      toFloat(duneRow?.["Hump Net 24h"]),
      "Hump Buyers 7d":    toFloat(duneRow?.["Hump Buyers 7d"]),
      "Hump Sellers 7d":   toFloat(duneRow?.["Hump Sellers 7d"]),
      "Hump Buyers 24h":   toFloat(duneRow?.["Hump Buyers 24h"]),
      "Hump Sellers 24h":  toFloat(duneRow?.["Hump Sellers 24h"]),
      "Retail Net 7d":     retailNet,
      "Retail Net 24h":    retailNet24h,
      "Whale Vol %":       toFloat(duneRow?.["Whale Vol %"]),
      "Whale Vol % 24h":   toFloat(duneRow?.["Whale Vol % 24h"]),
      "Buy Vol %":         toFloat(duneRow?.["Buy Vol %"]),
      "Buy Vol % 24h":     toFloat(duneRow?.["Buy Vol % 24h"]),
      "Whale Min $":       toFloat(duneRow?.["Whale Min $"]),
      "Hump Min $":        toFloat(duneRow?.["Hump Min $"]),
      "Top10 %":           toFloat(duneRow?.["Top10 %"] ?? duneRow?.["Top10"]),
      "Risk %":            toFloat(duneRow?.["Risk %"] ?? duneRow?.["Risk"]),
      priceUsd:            cg?.priceUsd ?? null,
      marketCapUsd:        cg?.marketCapUsd ?? null,
      priceChange7d:       priceChange,
      priceSource,
      signal,
      signalNote,
      "Divergence Bps":    divergenceBps,
      "Divergence Bps 24h": divergenceBps24h,
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
    "Vol 7d":            null,
    "Vol 24h":           null,
    "Vol/Tx":            null,
    "Vol/Tx 7d":         null,
    "Vol/Tx 24h":        null,
    "Vol/Wlt":           null,
    "Vol/Wlt 7d":        null,
    "Vol/Wlt 24h":       null,
    "Vol Grw %":         null,
    "Txs 30d":           null,
    "Txs 7d":            null,
    "Txs 24h":           null,
    "Tx Grw %":          null,
    "Txs/User":          null,
    "Txs/User 7d":       null,
    "Txs/User 24h":      null,
    "Wallets 30d":       null,
    "Wallets 7d":        null,
    "Wallets 24h":       null,
    "User Grw %":        null,
    "New Wallets":       null,
    "Returning Wallets": null,
    "New %":             null,
    "Retention %":       null,
    "Avg Txs Ret":       null,
    Traders:             null,
    "Buyers 30d":        null,
    "Buyers 7d":         null,
    "Buyers 24h":        null,
    "1st Buyers 30d":    null,
    "1st Buyers 7d":     null,
    "1st Buyers 24h":    null,
    "1st Sellers 30d":   null,
    "1st Sellers 7d":    null,
    "1st Sellers 24h":   null,
    "Buy/Sell Ratio":    null,
    "Buy/Sell Ratio 24h": null,
    "Token Age Days":    null,
    "Non-Trade New 30d": null,
    "Whale Net 7d":      null,
    "Whale Net 24h":     null,
    "Accum %":           null,
    "Accum % 24h":       null,
    "Whale Buyers 7d":   null,
    "Whale Sellers 7d":  null,
    "Whale Buyers 24h":  null,
    "Whale Sellers 24h": null,
    "Hump Net 7d":       null,
    "Hump Net 24h":      null,
    "Hump Buyers 7d":    null,
    "Hump Sellers 7d":   null,
    "Hump Buyers 24h":   null,
    "Hump Sellers 24h":  null,
    "Retail Net 7d":     null,
    "Retail Net 24h":    null,
    "Whale Vol %":       null,
    "Whale Vol % 24h":   null,
    "Buy Vol %":         null,
    "Buy Vol % 24h":     null,
    "Whale Min $":       null,
    "Hump Min $":        null,
    "Top10 %":           null,
    "Risk %":            null,
    priceUsd:            null,
    marketCapUsd:        null,
    priceChange7d:       null,
    priceSource:         null,
    signal:              "No Address",
    signalNote:          null,
    "Divergence Bps":    null,
    "Divergence Bps 24h": null,
    signalScore:         null,
    read:                null,
  }));

  return {
    rows: [...enrichedWithAddress, ...enrichedWithout],
    lastUpdated,
  };
}