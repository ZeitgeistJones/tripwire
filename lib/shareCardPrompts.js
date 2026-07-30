/** Admin share-card prompts — paste into an image-capable LLM (ChatGPT / Gemini / Claude).
 *  Cards stick to dollars, counts, and simple volume shares with plain English labels.
 */

import { activityKeys, buyerKeys, moversHighlightForToken, whaleKeys, whaleWindow } from "./moversRank";

function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function fmtUsd(n) {
  if (n == null) return null;
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(abs).toLocaleString()}`;
}

function fmtPct(n) {
  if (n == null) return null;
  return `${n.toFixed(1)}%`;
}

function fmtInt(n) {
  if (n == null) return null;
  return Math.round(n).toLocaleString();
}

function fmtPrice(n) {
  if (n == null) return null;
  return `$${Number(n).toPrecision(4)}`;
}

function metaBlock(meta = {}, windowLabel) {
  const scoresAsOf = meta.scoresLastUpdated
    ? new Date(meta.scoresLastUpdated).toISOString()
    : null;
  return [
    "=== TIMESTAMPS (must appear on the image — data time only) ===",
    scoresAsOf
      ? `Data snapshot (UTC): ${scoresAsOf}`
      : "Data snapshot: unknown — say timing is approximate; do NOT invent a clock time",
    "Use ONLY this snapshot time on the card. Do not put 'generated now' / copy-time on the image.",
    "Every number on the card is from that same Tripwire / Dune query snapshot (on-chain + price/mcap joined at refresh).",
    windowLabel ? `Window on this card: ${windowLabel}` : null,
    "",
    "=== DISCLAIMER (must appear, one short line on the image) ===",
    "Community on-chain stats from Tripwire — not financial advice. DYOR.",
  ].filter((x) => x != null);
}

const PLAIN_NUMBER_RULES = [
  "- Use ONLY the numbers in DATA. Never invent prices, flows, ranks, or causes.",
  "- Prefer dollars, wallet/trade counts, and simple shares of volume.",
  "- Labels in plain English (e.g. \"Large-wallet net flow\", \"Active wallets\", \"DEX volume\") — never raw field names.",
  "- No entry/exit calls, no price targets, no emoji overload.",
  "- Include the data snapshot timestamp (query time) + disclaimer on the image — never copy-time.",
  "- Also give a paste-ready caption (≤ 280 chars) that works without the image.",
  "- Aspect: 1:1 or 4:5 social card. Dark Tripwire-ish slate unless theme says otherwise.",
];

function imageOutputRules(themeLine) {
  return [
    "=== OUTPUT (image-first) ===",
    "You are generating ONE sharable social IMAGE (Discord / Twitter / Farcaster / Telegram).",
    "Prefer: produce the image directly if you can. Otherwise give (1) a ready-to-paste image prompt for Midjourney/Flux/DALL-E and (2) exact on-image text layers.",
    themeLine,
    "Rules:",
    ...PLAIN_NUMBER_RULES,
  ];
}

/** Identity + size for share cards. */
function plainTokenHeader(row) {
  return {
    project: row.Project,
    symbol: row.Symbol || null,
    address: row.Address || null,
    marketCap: fmtUsd(num(row.marketCapUsd)),
    price: fmtPrice(num(row.priceUsd)),
  };
}

function briefPeers(list, period, kind) {
  const wk = whaleKeys(period);
  const ak = activityKeys(period);
  return (list || []).slice(0, 6).map((t, i) => {
    if (kind === "whale") {
      return {
        rank: i + 1,
        project: t.Project,
        symbol: t.Symbol,
        largeWalletNetFlow: fmtUsd(num(t[wk.net])),
      };
    }
    return {
      rank: i + 1,
      project: t.Project,
      symbol: t.Symbol,
      dexVolume: fmtUsd(num(t[ak.vol])),
      transactions: fmtInt(num(t[ak.txs])),
    };
  });
}

/**
 * Whale-themed flow card — image generation.
 * @param {object} row
 * @param {"24h"|"7d"|"30d"} period — 30d falls back to 7d whale twins
 * @param {{ scoresLastUpdated?: string|null }} meta
 */
export function buildWhaleCardPrompt(row, period = "7d", meta = {}) {
  if (!row) return "";
  const win = whaleWindow(period);
  const wk = whaleKeys(period);

  const whaleNet = num(row[wk.net]);
  const wBuy = num(row[wk.buyers]);
  const wSell = num(row[wk.sellers]);
  const humpNet = num(win === "24h" ? row["Hump Net 24h"] : row["Hump Net 7d"]);
  const humpBuy = num(win === "24h" ? row["Hump Buyers 24h"] : row["Hump Buyers 7d"]);
  const humpSell = num(win === "24h" ? row["Hump Sellers 24h"] : row["Hump Sellers 7d"]);
  const retailNet = num(row[wk.retail]);
  const whaleVol = num(row[wk.whaleVol]);
  const whaleMin = num(row["Whale Min $"]);
  const humpMin = num(row["Hump Min $"]);

  const stats = {
    ...plainTokenHeader(row),
    flowWindow: win,
    // Plain labels intentionally — these are the only numbers allowed on the card
    largeTradeMinSize: fmtUsd(whaleMin),
    megaTradeMinSize: fmtUsd(humpMin),
    largeWalletNetFlow: fmtUsd(whaleNet),
    largeWalletBuyers: fmtInt(wBuy),
    largeWalletSellers: fmtInt(wSell),
    megaTradeNetFlow: fmtUsd(humpNet),
    megaTradeBuyers: fmtInt(humpBuy),
    megaTradeSellers: fmtInt(humpSell),
    everyoneElseNetFlow: fmtUsd(retailNet),
    largeTradesShareOfVolume: fmtPct(whaleVol),
  };

  const dir = whaleNet == null ? "quiet" : whaleNet > 0 ? "inflow" : whaleNet < 0 ? "outflow" : "flat";

  const megaDef =
    humpMin != null && humpMin > 1000
      ? `- A mega-trade = the top 1% of those sizes (definition includes a $1,000 floor) → about ${fmtUsd(humpMin)}+ right now.`
      : humpMin != null
        ? `- A mega-trade = the top 1% of those sizes with a $1,000 minimum — currently at that floor (true top-1% is at or below $1,000; do not imply $1,000 is a higher live p99).`
        : "- A mega-trade = the top 1% of those sizes with a $1,000 minimum.";

  return [
    ...imageOutputRules(
      "THEME: deep-ocean WHALE card — navy/black water, soft bioluminescent teal accents, subtle whale silhouette or ripple motif (tasteful, not cartoon spam). Big-wallet money story, not a price chart."
    ),
    "",
    ...metaBlock(meta, `trailing large-wallet flow ${win}${period === "30d" ? " (no 30d twin — using 7d)" : ""}`),
    "",
    "=== PLAIN DEFINITIONS (1–2 lines on the card) ===",
    "Tripwire does NOT use a fixed cutoff like \"$10k = whale.\"",
    "For THIS token:",
    `- A large wallet trade = a DEX trade in the top 10% of this token's own trade sizes over 30 days (floor $100)${whaleMin != null ? ` → about ${fmtUsd(whaleMin)}+ right now` : ""}.`,
    megaDef,
    "- Everyone else = all smaller DEX trades.",
    "Net flow = dollars bought minus dollars sold in that group.",
    "",
    "=== DATA (only these numbers may appear on the image) ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    `Direction hint from large-wallet net: ${dir}.`,
    "On-image layers:",
    "1. TITLE — project · \"Large wallet flow\" (or \"Whale flow\" if you keep the theme).",
    "2. HERO — large-wallet net flow with clear in/out.",
    "3. UP TO THREE CALLOUTS from DATA only — e.g. buyers vs sellers counts, mega-trade net, everyone-else net, large-trades share of volume, min sizes.",
    "4. Tiny definition of large vs mega trade + current min sizes (if mega is at the $1,000 floor, say so as the definition floor — not as a special live threshold above p99).",
    "5. Snapshot time + disclaimer.",
  ].join("\n");
}

/**
 * Buyers / sellers breadth card — wallet counts, not price %.
 * @param {object} row
 * @param {"24h"|"7d"|"30d"} period
 * @param {{ scoresLastUpdated?: string|null }} meta
 */
export function buildBuyersCardPrompt(row, period = "7d", meta = {}) {
  if (!row) return "";
  const bk = buyerKeys(period);
  const buyers = num(row[bk.buyers]);
  const ratio = bk.buySellRatio ? num(row[bk.buySellRatio]) : null;
  // Unique sellers = buyers ÷ ratio when ratio exists (same definition as the dashboard).
  const sellers =
    buyers != null && ratio != null && ratio > 0 ? buyers / ratio : null;

  const stats = {
    ...plainTokenHeader(row),
    window: bk.win,
    dexBuyers: fmtInt(buyers),
    dexSellers: fmtInt(sellers),
    buyerToSellerWalletRatio: ratio == null ? null : Number(ratio.toFixed(2)),
    buyShareOfDexVolume: bk.buyVolPct ? fmtPct(num(row[bk.buyVolPct])) : null,
    firstTimeBuyers: fmtInt(num(row[bk.firstBuyers])),
    firstTimeSellers: fmtInt(num(row[bk.firstSellers])),
    dexTraders30d: period === "30d" ? fmtInt(num(row.Traders)) : null,
  };

  const lean =
    ratio == null ? "unknown"
      : ratio > 1.05 ? "more buying wallets than selling"
        : ratio < 0.95 ? "more selling wallets than buying"
          : "roughly balanced wallet counts";

  const windowNote = bk.hasRatioTwins
    ? `DEX buyer / seller breadth · ${bk.win}`
    : `DEX buyer / seller breadth · ${bk.win} (buy/sell ratio + buy volume share only exist for 24h & 7d — omitted here)`;

  return [
    ...imageOutputRules(
      "THEME: buyer/seller breadth card — dark slate, clear two-column contrast (buy side vs sell side), no price chart. Story is who showed up to trade, not candle moves."
    ),
    "",
    ...metaBlock(meta, windowNote),
    "",
    "=== PLAIN DEFINITIONS (1–2 lines on the card) ===",
    "- DEX buyers / sellers = unique wallets that bought or sold this token on a DEX in the window.",
    "- Buyer-to-seller ratio = buyer wallets ÷ seller wallets (1.0 = equal counts). This is wallet breadth, not dollar size.",
    "- Buy share of volume = buy-side dollars ÷ all DEX dollars in the window (money-weighted).",
    "- First-time buyers / sellers = wallets whose first buy or sell in the lookback landed in this window.",
    "",
    "=== DATA (only these numbers may appear on the image) ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    `Wallet-count lean hint: ${lean}.`,
    "On-image layers:",
    "1. TITLE — project · \"Buyers & sellers\" · window.",
    "2. HERO — DEX buyers (and sellers if present), or the buyer-to-seller ratio if that is the clearest story.",
    "3. UP TO THREE CALLOUTS — e.g. first-time buyers vs sellers, buy share of volume, traders (30d only).",
    "4. Tiny note that ratio = wallet counts (not dollars); buy share of volume is the money side.",
    "5. Snapshot time + disclaimer.",
    "Do not invent sellers when dexSellers is null. Do not invent ratio or buy volume share when null.",
  ].join("\n");
}

/** Status / health card. */
export function buildHealthCardPrompt(row, period = "7d", meta = {}) {
  if (!row) return "";
  const ak = activityKeys(period);
  const wk = whaleKeys(period);
  const age = num(row["Token Age Days"]);

  const stats = {
    ...plainTokenHeader(row),
    window: period,
    tokenAgeDays: age == null ? null : Math.round(age),
    dexVolume: fmtUsd(num(row[ak.vol])),
    transactions: fmtInt(num(row[ak.txs])),
    activeWallets: fmtInt(num(row[ak.wallets])),
    dexBuyers: fmtInt(num(period === "24h" ? row["Buyers 24h"] : period === "30d" ? row["Buyers 30d"] : row["Buyers 7d"])),
    largeWalletNetFlow: fmtUsd(num(row[wk.net])),
    walletsThatCameBackPct: period === "7d" ? fmtPct(num(row["Retention %"])) : null,
  };

  return [
    ...imageOutputRules(
      "THEME: clean status card — dark slate, big readable numbers, calm editorial type."
    ),
    "",
    ...metaBlock(meta, `status at query snapshot · period ${period}`),
    "",
    "=== DATA (only these numbers may appear on the image) ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    "On-image layers:",
    "1. TITLE — project · \"On-chain status\".",
    "2. HERO — price or market cap.",
    "3. THREE callouts from DATA (e.g. active wallets, DEX volume, large-wallet net flow).",
    "4. Optional one-liner that restates a number — no bullish/bearish spin.",
    "5. Snapshot time + disclaimer.",
  ].join("\n");
}

/**
 * Activity snapshot card for a period window.
 */
export function buildActivityCardPrompt(row, period = "7d", meta = {}) {
  if (!row) return "";
  const ak = activityKeys(period);
  const buyersKey = period === "24h" ? "Buyers 24h" : period === "30d" ? "Buyers 30d" : "Buyers 7d";

  const stats = {
    ...plainTokenHeader(row),
    window: period,
    dexVolume: fmtUsd(num(row[ak.vol])),
    transactions: fmtInt(num(row[ak.txs])),
    activeWallets: fmtInt(num(row[ak.wallets])),
    dexBuyers: fmtInt(num(row[buyersKey])),
    volumeChangeVsLastWeek: period === "7d" ? fmtPct(num(row["Vol Grw %"])) : null,
  };

  return [
    ...imageOutputRules(
      "THEME: kinetic activity card — dark background, one hot accent, oversized volume / wallet counts. Pulse of usage, not a trading terminal."
    ),
    "",
    ...metaBlock(meta, `activity ${period}`),
    "",
    "=== DATA (only these numbers may appear on the image) ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    "On-image layers:",
    `1. TITLE — project · \"Activity · ${period}\".`,
    "2. HERO — DEX volume.",
    "3. THREE stats: transactions, active wallets, DEX buyers (plus volume vs last week only if present and window is 7d).",
    "4. Snapshot time + disclaimer.",
    "If showing volume vs last week, label it exactly that way — not \"Vol Grw %\".",
  ].join("\n");
}

/**
 * Movers highlight card — flags if token is on the Movers board for this window.
 */
export function buildMoversCardPrompt(row, allRows, period = "7d", meta = {}) {
  if (!row) return "";
  const highlight = moversHighlightForToken(allRows, row.Address || row.Project, period);
  const wk = whaleKeys(period);
  const ak = activityKeys(period);

  const stats = {
    ...plainTokenHeader(row),
    window: period,
    whaleFlowWindow: highlight.whaleFlowWindow,
    highlight: {
      isOnMoversBoard: highlight.isHighlighted,
      onActivityBoard: highlight.onActivityBoard,
      activityRank: highlight.activityRank,
      onWhaleBoard: highlight.onWhaleBoard,
      whaleRank: highlight.whaleRank,
    },
    thisToken: {
      dexVolume: fmtUsd(num(row[ak.vol])),
      transactions: fmtInt(num(row[ak.txs])),
      activeWallets: fmtInt(num(row[ak.wallets])),
      largeWalletNetFlow: fmtUsd(num(row[wk.net])),
      volumeChangeVsLastWeek: period === "7d" ? fmtPct(num(row["Vol Grw %"])) : null,
    },
    board: {
      busiestByActivity: briefPeers(highlight.activity, period, "activity"),
      largestWalletFlows: briefPeers(highlight.whales, period, "whale"),
    },
  };

  const headline = highlight.isHighlighted
    ? highlight.onActivityBoard && highlight.onWhaleBoard
      ? `ON BOTH LISTS — activity #${highlight.activityRank} and large-wallet flow #${highlight.whaleRank} for ${period}`
      : highlight.onActivityBoard
        ? `ON ACTIVITY LIST — #${highlight.activityRank} for ${period}`
        : `ON LARGE-WALLET LIST — #${highlight.whaleRank} for ${highlight.whaleFlowWindow}`
    : `NOT on the top Movers lists for ${period} — still make an honest \"not on the board\" card with peer context`;

  return [
    ...imageOutputRules(
      "THEME: Movers spotlight — dark board, clear rank badge, token name big, peer strip with one simple number each. Sports-card energy, not a pump flyer."
    ),
    "",
    ...metaBlock(
      meta,
      period === "30d"
        ? `movers ${period} (activity absolute; large-wallet list uses 7d)`
        : `movers ${period}`
    ),
    "",
    "=== HIGHLIGHT STATUS (must drive the layout) ===",
    headline,
    "",
    "=== DATA (only these numbers may appear on the image) ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    "On-image layers:",
    "1. TITLE — \"Movers\" · window · project.",
    "2. RANK BADGE — only if on a list; otherwise mark off-board honestly.",
    "3. HERO FACT — one plain number for THIS token (volume, wallets, or large-wallet net flow).",
    "4. PEER STRIP — 3–5 names + one simple number each (volume or large-wallet net).",
    "5. Snapshot time + disclaimer.",
    "If not highlighted, do NOT fake a top rank.",
  ].join("\n");
}

/** Sorted options for admin token picker. */
export function sharePromptTokenOptions(rows) {
  return (rows || [])
    .filter((r) => r?.Project && r?.Address)
    .map((r) => ({
      project: r.Project,
      symbol: r.Symbol || "",
      address: r.Address,
      label: r.Symbol ? `${r.Project} (${r.Symbol})` : r.Project,
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** @deprecated alias */
export const whalePromptTokenOptions = sharePromptTokenOptions;

export const SHARE_PROMPT_KINDS = [
  { value: "whale", label: "Whale", blurb: "Large-wallet flow — dollars & counts" },
  { value: "buyers", label: "Buyers", blurb: "DEX buyers / sellers — wallet breadth" },
  { value: "activity", label: "Activity", blurb: "Volume / txs / wallets" },
  { value: "health", label: "Health", blurb: "Status snapshot" },
  { value: "movers", label: "Movers", blurb: "Board highlight with peer numbers" },
];

export function buildShareCardPrompt(kind, row, allRows, period, meta) {
  if (kind === "buyers") return buildBuyersCardPrompt(row, period, meta);
  if (kind === "health") return buildHealthCardPrompt(row, period, meta);
  if (kind === "activity") return buildActivityCardPrompt(row, period, meta);
  if (kind === "movers") return buildMoversCardPrompt(row, allRows, period, meta);
  return buildWhaleCardPrompt(row, period, meta);
}
