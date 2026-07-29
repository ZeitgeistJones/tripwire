/** Shared Movers ranking — used by MoversPanel and admin share prompts. */

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

export function activityNotability(t, period) {
  if (period === "7d") {
    return (
      Math.abs(t["Vol Grw %"] ?? 0) +
      Math.abs(t["User Grw %"] ?? 0) * 0.9 +
      Math.abs(t["Tx Grw %"] ?? 0) * 0.7
    );
  }
  const ak = activityKeys(period);
  const vol = Math.max(0, Number(t[ak.vol]) || 0);
  const txs = Math.max(0, Number(t[ak.txs]) || 0);
  const wallets = Math.max(0, Number(t[ak.wallets]) || 0);
  return Math.log10(vol + 1) * 18 + Math.log10(txs + 1) * 14 + Math.log10(wallets + 1) * 10;
}

export function whaleNotability(t, period) {
  const wk = whaleKeys(period);
  const wNet = Math.abs(t[wk.net] ?? 0);
  const mcap = t.marketCapUsd > 0 ? t.marketCapUsd : null;
  const bps = mcap ? (wNet / mcap) * 10000 : wNet / 100;
  return Math.min(bps, 250) + Math.min(wNet / 500, 80);
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
  const activityMin = period === "7d" ? 35 : 55;

  const activityPool = [...withData]
    .filter((t) => activityNotability(t, period) >= activityMin)
    .sort((a, b) => activityNotability(b, period) - activityNotability(a, period));

  const whalePool = [...withData]
    .filter((t) => Math.abs(t[wk.net] ?? 0) >= whaleMin)
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
