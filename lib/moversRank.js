/** Shared Movers ranking — used by MoversPanel and admin share prompts.
 *
 * Design: notable relative to size, with real dollar floors.
 * Prefer asymmetric whale-vs-retail flow over raw mega-cap dollar prints.
 */

export function whaleWindow(period) {
  return period === "24h" ? "24h" : "7d";
}

export function whaleKeys(period) {
  const win = whaleWindow(period);
  return {
    win,
    net: `Whale Net ${win}`,
    buyers: `Whale Buyers ${win}`,
    sellers: `Whale Sellers ${win}`,
    retail: `Retail Net ${win}`,
    accum: win === "24h" ? "Accum % 24h" : "Accum %",
    whaleVol: win === "24h" ? "Whale Vol % 24h" : "Whale Vol %",
  };
}

export function activityKeys(period) {
  if (period === "24h") {
    return { vol: "Vol 24h", txs: "Txs 24h", wallets: "Wallets 24h", win: "24h" };
  }
  if (period === "30d") {
    return { vol: "Vol 30d", txs: "Txs 30d", wallets: "Wallets 30d", win: "30d" };
  }
  return { vol: "Vol 7d", txs: "Txs 7d", wallets: "Wallets 7d", win: "7d" };
}

/** DEX buyer / first-trade twins. Buy/Sell Ratio + Buy Vol % exist for 24h & 7d only. */
export function buyerKeys(period) {
  if (period === "24h") {
    return {
      win: "24h",
      buyers: "Buyers 24h",
      firstBuyers: "1st Buyers 24h",
      firstSellers: "1st Sellers 24h",
      buySellRatio: "Buy/Sell Ratio 24h",
      buyVolPct: "Buy Vol % 24h",
      hasRatioTwins: true,
    };
  }
  if (period === "30d") {
    return {
      win: "30d",
      buyers: "Buyers 30d",
      firstBuyers: "1st Buyers 30d",
      firstSellers: "1st Sellers 30d",
      buySellRatio: null,
      buyVolPct: null,
      hasRatioTwins: false,
    };
  }
  return {
    win: "7d",
    buyers: "Buyers 7d",
    firstBuyers: "1st Buyers 7d",
    firstSellers: "1st Sellers 7d",
    buySellRatio: "Buy/Sell Ratio",
    buyVolPct: "Buy Vol %",
    hasRatioTwins: true,
  };
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function num(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Soft damp so microcap % spikes don't dominate without banning small caps. */
function mcapDamp(t) {
  const mcap = num(t.marketCapUsd, 0);
  if (!(mcap > 0)) return 1;
  return clamp(1 / Math.log10(mcap / 1e5 + 10), 0.55, 1.15);
}

/**
 * Activity notability — size-aware.
 * 7d: WoW % growth × volume credibility × soft mcap damp.
 * 24h/30d: turnover-aware (vol/mcap) + txs/wallets; raw size only if no mcap.
 */
export function activityNotability(t, period) {
  if (period === "7d") {
    const base =
      Math.abs(num(t["Vol Grw %"])) +
      Math.abs(num(t["User Grw %"])) * 0.9 +
      Math.abs(num(t["Tx Grw %"])) * 0.7;
    const vol7 = Math.max(0, num(t["Vol 7d"]));
    const volCredibility = clamp(Math.log10(vol7 + 1) / 5, 0.25, 1.2);
    return base * volCredibility * mcapDamp(t);
  }

  const ak = activityKeys(period);
  const vol = Math.max(0, num(t[ak.vol]));
  const txs = Math.max(0, num(t[ak.txs]));
  const wallets = Math.max(0, num(t[ak.wallets]));
  const mcap = num(t.marketCapUsd, 0);

  let volTerm;
  if (mcap > 0) {
    const volTurnover = vol / mcap;
    volTerm = Math.log10(volTurnover * 1e4 + 1) * 20;
  } else {
    volTerm = Math.log10(vol + 1) * 18;
  }

  return volTerm + Math.log10(txs + 1) * 10 + Math.log10(wallets + 1) * 8;
}

/** True if token clears the absolute activity volume floor for this window. */
export function activityEligible(t, period) {
  if (period === "7d") {
    // Credibility is in the score; still require a little real 7d volume.
    return Math.max(0, num(t["Vol 7d"])) >= 2000;
  }
  const ak = activityKeys(period);
  const vol = Math.max(0, num(t[ak.vol]));
  const minVol = period === "24h" ? 5000 : 25000;
  return vol >= minVol;
}

/**
 * Whale notability — mcap-relative flow + whale-vs-retail divergence + breadth.
 */
export function whaleNotability(t, period) {
  const wk = whaleKeys(period);
  const wNetSigned = num(t[wk.net], null);
  const wNet = Math.abs(wNetSigned ?? 0);
  const mcap = num(t.marketCapUsd, 0) > 0 ? num(t.marketCapUsd) : null;
  const whaleBps = mcap ? (wNet / mcap) * 10000 : wNet / 100;
  const primary = Math.min(whaleBps, 300);

  const divKey = wk.win === "24h" ? "Divergence Bps 24h" : "Divergence Bps";
  const divBps = t[divKey] != null && Number.isFinite(Number(t[divKey])) ? Math.abs(Number(t[divKey])) : 0;
  const divBoost = Math.min(divBps, 200) * 0.35;

  const retail = num(t[wk.retail], null);
  const whaleMin = wk.win === "24h" ? 1500 : 2500;
  let disagreeBoost = 0;
  if (
    wNetSigned != null &&
    retail != null &&
    Math.sign(wNetSigned) !== 0 &&
    Math.sign(retail) !== 0 &&
    Math.sign(wNetSigned) !== Math.sign(retail) &&
    Math.abs(wNetSigned) >= whaleMin &&
    Math.abs(retail) >= whaleMin
  ) {
    disagreeBoost = 40;
  }

  const buyers = Math.max(0, num(t[wk.buyers]));
  const sellers = Math.max(0, num(t[wk.sellers]));
  const breadth = Math.min(Math.max(buyers, sellers), 25);

  return primary + divBoost + disagreeBoost + breadth;
}

/**
 * @param {object[]} rows
 * @param {"24h"|"7d"|"30d"} period
 * @param {{ activityLimit?: number, whaleLimit?: number }} opts
 */
export function rankMovers(rows, period = "7d", opts = {}) {
  const activityLimit = opts.activityLimit ?? 6;
  const whaleLimit = opts.whaleLimit ?? 6;
  const withData = (rows || []).filter((t) => t?.Opp != null && t?.Project);
  const wk = whaleKeys(period);
  const whaleMin = period === "24h" ? 1500 : 2500;
  // After size damp, raw growth scores compress — slightly lower 7d floor; absolute windows stay higher.
  const activityMin = period === "7d" ? 28 : 40;

  const activityPool = [...withData]
    .filter((t) => activityEligible(t, period) && activityNotability(t, period) >= activityMin)
    .sort((a, b) => activityNotability(b, period) - activityNotability(a, period));

  const whalePool = [...withData]
    .filter((t) => Math.abs(num(t[wk.net])) >= whaleMin)
    .sort((a, b) => whaleNotability(b, period) - whaleNotability(a, period));

  const activity = activityPool.slice(0, activityLimit);
  const activityNames = new Set(activity.map((t) => t.Project));
  const whalesDeduped = whalePool.filter((t) => !activityNames.has(t.Project)).slice(0, whaleLimit);
  const whales = whalesDeduped.length >= 3 ? whalesDeduped : whalePool.slice(0, whaleLimit);

  return {
    period,
    whaleFlowWindow: wk.win,
    activity,
    whales,
    activityPool,
    whalePool,
  };
}

/** Where a token sits on the Movers board for this window. */
export function moversHighlightForToken(rows, projectOrAddress, period = "7d") {
  const ranked = rankMovers(rows, period, { activityLimit: 6, whaleLimit: 6 });
  const needle = String(projectOrAddress || "").toLowerCase();
  const match = (t) =>
    (t.Project && t.Project.toLowerCase() === needle) ||
    (t.Address && t.Address.toLowerCase() === needle);

  const activityIdx = ranked.activity.findIndex(match);
  const whaleIdx = ranked.whales.findIndex(match);
  const activityPoolIdx = ranked.activityPool.findIndex(match);
  const whalePoolIdx = ranked.whalePool.findIndex(match);

  return {
    ...ranked,
    onActivityBoard: activityIdx >= 0,
    activityRank: activityIdx >= 0 ? activityIdx + 1 : null,
    activityPoolRank: activityPoolIdx >= 0 ? activityPoolIdx + 1 : null,
    onWhaleBoard: whaleIdx >= 0,
    whaleRank: whaleIdx >= 0 ? whaleIdx + 1 : null,
    whalePoolRank: whalePoolIdx >= 0 ? whalePoolIdx + 1 : null,
    isHighlighted: activityIdx >= 0 || whaleIdx >= 0,
  };
}
