/** Admin share-card prompts — paste into an image-capable LLM (ChatGPT / Gemini / Claude). */

import { activityKeys, moversHighlightForToken, whaleKeys, whaleWindow } from "./moversRank";

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
  const generatedAt = meta.generatedAt || new Date().toISOString();
  return [
    "=== TIMESTAMPS (must appear on the image) ===",
    `Prompt generated (UTC): ${generatedAt}`,
    scoresAsOf
      ? `On-chain scores / Dune snapshot as of (UTC): ${scoresAsOf}`
      : "On-chain scores / Dune snapshot as of: unknown — say timing is approximate",
    windowLabel ? `Window on this card: ${windowLabel}` : null,
    "",
    "=== DISCLAIMER (must appear, one short line on the image) ===",
    "Community interpretation of Tripwire on-chain stats — not financial advice. DYOR.",
  ].filter((x) => x != null);
}

function imageOutputRules(themeLine) {
  return [
    "=== OUTPUT (image-first) ===",
    "You are generating ONE sharable social IMAGE (Discord / Twitter / Farcaster / Telegram).",
    "Prefer: produce the image directly if you can. Otherwise give (1) a ready-to-paste image prompt for Midjourney/Flux/DALL-E and (2) exact on-image text layers.",
    themeLine,
    "Rules:",
    "- Use ONLY the numbers in DATA. Never invent prices, flows, ranks, or causes.",
    "- No entry/exit calls, no price targets, no emojis overload.",
    "- Include timestamp + disclaimer on the image.",
    "- Also give a paste-ready caption (≤ 280 chars) that works without the image.",
    "- Aspect: 1:1 or 4:5 social card. Dark Tripwire-ish slate unless theme says otherwise.",
  ];
}

function tokenHeader(row) {
  return {
    project: row.Project,
    symbol: row.Symbol || null,
    address: row.Address || null,
    marketCapUsd: num(row.marketCapUsd),
    marketCapLabel: fmtUsd(num(row.marketCapUsd)),
    priceUsd: num(row.priceUsd),
    priceLabel: fmtPrice(num(row.priceUsd)),
    read: row.read || null,
    profile: row.Prof || null,
    signal: row.signal || null,
    signalNote: row.signalNote || null,
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
        whaleNetLabel: fmtUsd(num(t[wk.net])),
        accumLabel: fmtPct(num(t[wk.accum])),
      };
    }
    return {
      rank: i + 1,
      project: t.Project,
      symbol: t.Symbol,
      volLabel: fmtUsd(num(t[ak.vol])),
      txsLabel: fmtInt(num(t[ak.txs])),
      volGrwLabel: period === "7d" ? fmtPct(num(t["Vol Grw %"])) : null,
    };
  });
}

/**
 * Whale-themed flow card — image generation.
 * @param {object} row
 * @param {"24h"|"7d"|"30d"} period — 30d falls back to 7d whale twins
 * @param {{ scoresLastUpdated?: string|null, generatedAt?: string }} meta
 */
export function buildWhaleCardPrompt(row, period = "7d", meta = {}) {
  if (!row) return "";
  const win = whaleWindow(period);
  const wk = whaleKeys(period);

  const whaleNet = num(row[wk.net]);
  const accum = num(row[wk.accum]);
  const wBuy = num(row[wk.buyers]);
  const wSell = num(row[wk.sellers]);
  const humpNet = num(win === "24h" ? row["Hump Net 24h"] : row["Hump Net 7d"]);
  const humpBuy = num(win === "24h" ? row["Hump Buyers 24h"] : row["Hump Buyers 7d"]);
  const humpSell = num(win === "24h" ? row["Hump Sellers 24h"] : row["Hump Sellers 7d"]);
  const retailNet = num(row[wk.retail]);
  const whaleVol = num(row[wk.whaleVol]);
  const buyVol = num(win === "24h" ? row["Buy Vol % 24h"] : row["Buy Vol %"]);
  const divBps = num(win === "24h" ? row["Divergence Bps 24h"] : row["Divergence Bps"]);
  const whaleMin = num(row["Whale Min $"]);

  const stats = {
    ...tokenHeader(row),
    window: win,
    whaleThresholdUsd: whaleMin,
    whaleThresholdLabel: fmtUsd(whaleMin),
    whaleNetUsd: whaleNet,
    whaleNetLabel: fmtUsd(whaleNet),
    accumPct: accum,
    accumLabel: fmtPct(accum),
    whaleBuyers: wBuy,
    whaleBuyersLabel: fmtInt(wBuy),
    whaleSellers: wSell,
    whaleSellersLabel: fmtInt(wSell),
    humpbackNetUsd: humpNet,
    humpbackNetLabel: fmtUsd(humpNet),
    humpbackBuyers: humpBuy,
    humpbackBuyersLabel: fmtInt(humpBuy),
    humpbackSellers: humpSell,
    humpbackSellersLabel: fmtInt(humpSell),
    retailNetUsd: retailNet,
    retailNetLabel: fmtUsd(retailNet),
    whaleVolSharePct: whaleVol,
    whaleVolShareLabel: fmtPct(whaleVol),
    buyVolPct: buyVol,
    buyVolLabel: fmtPct(buyVol),
    whaleRetailDivergenceBps: divBps,
  };

  const dir = whaleNet == null ? "quiet" : whaleNet > 0 ? "inflow" : whaleNet < 0 ? "outflow" : "flat";

  return [
    ...imageOutputRules(
      "THEME: deep-ocean WHALE card — navy/black water, soft bioluminescent teal accents, subtle whale silhouette or ripple motif in the background (tasteful, not cartoon mascot spam). Big-wallet story, not a price chart."
    ),
    "",
    ...metaBlock(meta, `trailing whale flow ${win}${period === "30d" ? " (no 30d twin — using 7d)" : ""}`),
    "",
    "=== HOW WHALES & HUMPBACKS ARE DEFINED (teach on the card) ===",
    "Tripwire does NOT use a fixed dollar cutoff like \"$10k = whale.\"",
    "For THIS token only:",
    "- WHALE trade = DEX trade in the top 10% of that token's own trade sizes over 30d (floor $100).",
    whaleMin != null
      ? `  → Right now that threshold is about ${fmtUsd(whaleMin)} for ${row.Symbol || row.Project}.`
      : "  → Threshold listed as whaleThresholdUsd when available.",
    "- HUMPBACK = top 1% mega trades (floor $1,000). Every humpback is also a whale.",
    "- RETAIL net = everyone else.",
    "",
    "=== DATA (use only these numbers) ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    `Mood hint from whale net: ${dir}.`,
    "On-image layers:",
    "1. TITLE — project · symbol · \"Whale flow\".",
    "2. HERO NUMBER — whale net with clear in/out direction.",
    "3. THREE CALLOUTS — pick the three most interesting stats; human labels only.",
    "4. DEFINITION FOOTNOTE — 1–2 lines teaching whale vs humpback (per-token threshold).",
    "5. TIMESTAMP + DISCLAIMER.",
    "Visual: whale/ocean motif, oversized net-flow number, definition strip at bottom, no candlesticks.",
  ].join("\n");
}

/**
 * Health / scores card — Opp Mom Sus + read.
 */
export function buildHealthCardPrompt(row, period = "7d", meta = {}) {
  if (!row) return "";
  const ak = activityKeys(period);
  const wk = whaleKeys(period);
  const stats = {
    ...tokenHeader(row),
    scores: {
      opportunity: num(row.Opp),
      momentum: num(row.Mom),
      sustainability: num(row.Sus),
      qualityPct: num(row["Qlty %"]),
      riskPct: num(row["Risk %"]),
    },
    snapshot: {
      window: period,
      walletsLabel: fmtInt(num(row[ak.wallets])),
      volLabel: fmtUsd(num(row[ak.vol])),
      txsLabel: fmtInt(num(row[ak.txs])),
      whaleNetLabel: fmtUsd(num(row[wk.net])),
      retentionPct: period === "7d" ? fmtPct(num(row["Retention %"])) : null,
    },
  };

  return [
    ...imageOutputRules(
      "THEME: clean Tripwire health card — dark slate, three colored score orbs (green Opp / blue Mom / amber Sus), quiet editorial type. Feels like a status dashboard, not a meme."
    ),
    "",
    ...metaBlock(meta, `scores live · activity snapshot ${period}`),
    "",
    "=== DATA ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    "On-image layers:",
    "1. TITLE — project · \"Health check\".",
    "2. READ / PROFILE / SIGNAL pills if present — exact strings from data.",
    "3. THREE BIG SCORES — Opportunity, Momentum, Sustainability with the numbers given.",
    "4. ONE SUBLINE — plain English from read+signal (no hype).",
    "5. TINY FOOTER — market cap + period activity snapshot (wallets / vol) + timestamp + disclaimer.",
    "Do not invent 8-week history charts if not provided.",
  ].join("\n");
}

/**
 * Activity snapshot card for a period window.
 */
export function buildActivityCardPrompt(row, period = "7d", meta = {}) {
  if (!row) return "";
  const ak = activityKeys(period);
  const stats = {
    ...tokenHeader(row),
    window: period,
    volUsd: num(row[ak.vol]),
    volLabel: fmtUsd(num(row[ak.vol])),
    txs: num(row[ak.txs]),
    txsLabel: fmtInt(num(row[ak.txs])),
    wallets: num(row[ak.wallets]),
    walletsLabel: fmtInt(num(row[ak.wallets])),
    buyers: num(period === "24h" ? row["Buyers 24h"] : period === "30d" ? row["Buyers 30d"] : row["Buyers 7d"]),
    buyersLabel: fmtInt(num(period === "24h" ? row["Buyers 24h"] : period === "30d" ? row["Buyers 30d"] : row["Buyers 7d"])),
    wow: period === "7d"
      ? {
          volGrwPct: num(row["Vol Grw %"]),
          volGrwLabel: fmtPct(num(row["Vol Grw %"])),
          txGrwPct: num(row["Tx Grw %"]),
          txGrwLabel: fmtPct(num(row["Tx Grw %"])),
          userGrwPct: num(row["User Grw %"]),
          userGrwLabel: fmtPct(num(row["User Grw %"])),
          retentionPct: num(row["Retention %"]),
          retentionLabel: fmtPct(num(row["Retention %"])),
        }
      : null,
  };

  return [
    ...imageOutputRules(
      "THEME: kinetic activity card — dark background, one hot accent (ember or electric blue), big volume/txs numbers, subtle motion lines or pulse rings. Feels like a \"what's moving\" pulse, not a trading terminal."
    ),
    "",
    ...metaBlock(meta, `activity ${period}${period === "7d" ? " (+ WoW growth when present)" : " (absolute levels)"}`),
    "",
    "=== DATA ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    "On-image layers:",
    `1. TITLE — project · \"Activity · ${period}\".`,
    "2. HERO — volume (or the most striking activity number).",
    "3. THREE STATS — txs, wallets, buyers (and WoW % if window is 7d and present).",
    "4. ONE PLAIN LINE — what the activity says without calling a trade.",
    "5. TIMESTAMP + DISCLAIMER.",
  ].join("\n");
}

/**
 * Movers highlight card — flags if token is on the Movers board for this window.
 * @param {object} row
 * @param {object[]} allRows
 * @param {"24h"|"7d"|"30d"} period
 */
export function buildMoversCardPrompt(row, allRows, period = "7d", meta = {}) {
  if (!row) return "";
  const highlight = moversHighlightForToken(allRows, row.Address || row.Project, period);
  const wk = whaleKeys(period);
  const ak = activityKeys(period);

  const stats = {
    ...tokenHeader(row),
    window: period,
    whaleFlowWindow: highlight.whaleFlowWindow,
    highlight: {
      isOnMoversBoard: highlight.isHighlighted,
      onActivityBoard: highlight.onActivityBoard,
      activityRank: highlight.activityRank,
      activityPoolRank: highlight.activityPoolRank,
      onWhaleBoard: highlight.onWhaleBoard,
      whaleRank: highlight.whaleRank,
      whalePoolRank: highlight.whalePoolRank,
    },
    tokenStats: {
      volLabel: fmtUsd(num(row[ak.vol])),
      txsLabel: fmtInt(num(row[ak.txs])),
      walletsLabel: fmtInt(num(row[ak.wallets])),
      volGrwLabel: period === "7d" ? fmtPct(num(row["Vol Grw %"])) : null,
      whaleNetLabel: fmtUsd(num(row[wk.net])),
      accumLabel: fmtPct(num(row[wk.accum])),
    },
    board: {
      activityLeaders: briefPeers(highlight.activity, period, "activity"),
      whaleLeaders: briefPeers(highlight.whales, period, "whale"),
    },
  };

  const headline = highlight.isHighlighted
    ? highlight.onActivityBoard && highlight.onWhaleBoard
      ? `ON BOTH BOARDS — activity #${highlight.activityRank} and whale #${highlight.whaleRank} for ${period}`
      : highlight.onActivityBoard
        ? `ON ACTIVITY MOVERS — #${highlight.activityRank} of top activity swings (${period})`
        : `ON WHALE MOVERS — #${highlight.whaleRank} of top whale flows (${highlight.whaleFlowWindow})`
    : `NOT on the top Movers cards for ${period} — still make a \"watchlist / quiet relative to leaders\" card using board context`;

  return [
    ...imageOutputRules(
      "THEME: Movers spotlight poster — dark board, neon rank badge, token name oversized, faint leaderboard strip of peer names. Energy of a sports \"player of the window\" card, not a price pump flyer."
    ),
    "",
    ...metaBlock(
      meta,
      period === "30d"
        ? `movers ${period} (activity absolute; whale board uses 7d)`
        : `movers ${period}`
    ),
    "",
    "=== HIGHLIGHT STATUS (must drive the layout) ===",
    headline,
    "",
    "=== DATA ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    "On-image layers:",
    "1. TITLE — \"Movers\" · window · project/symbol.",
    "2. RANK BADGE — only if on a board; otherwise a quiet \"off-board\" mark (honest).",
    "3. HERO FACT — the single best on-chain fact for THIS token in this window.",
    "4. PEER STRIP — 3–5 other leaders from the matching board (names + one number each). If off-board, show leaders and place this token as a contrast callout.",
    "5. TIMESTAMP + DISCLAIMER.",
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
  { value: "whale", label: "Whale", blurb: "Ocean / whale-flow image card" },
  { value: "health", label: "Health", blurb: "Opp · Mom · Sus status card" },
  { value: "activity", label: "Activity", blurb: "Volume / txs / wallets pulse" },
  { value: "movers", label: "Movers", blurb: "Board highlight for this window" },
];

export function buildShareCardPrompt(kind, row, allRows, period, meta) {
  if (kind === "health") return buildHealthCardPrompt(row, period, meta);
  if (kind === "activity") return buildActivityCardPrompt(row, period, meta);
  if (kind === "movers") return buildMoversCardPrompt(row, allRows, period, meta);
  return buildWhaleCardPrompt(row, period, meta);
}
