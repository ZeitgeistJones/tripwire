/** Admin share-card prompts — paste into an image-capable LLM (ChatGPT / Gemini / Claude).
 *  Cards stick to dollars, counts, and simple volume shares with plain English labels.
 */

import { activityKeys, buyerKeys, moversHighlightForToken, whaleKeys, whaleWindow } from "./moversRank";

const ALL_WINDOWS = ["24h", "7d", "30d"];
/** Whale flow twins exist for 24h + 7d only (30d falls back to 7d in single-window mode). */
const WHALE_FLOW_WINDOWS = ["24h", "7d"];

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

function isAllWindows(period) {
  return period === "all";
}

function metaBlock(meta = {}, windowLabel) {
  const scoresAsOf = meta.scoresLastUpdated
    ? new Date(meta.scoresLastUpdated).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZoneName: "short",
      })
    : null;
  return [
    "=== TIMESTAMPS (must appear on the image — data time only) ===",
    scoresAsOf
      ? `Data snapshot (viewer local time): ${scoresAsOf}`
      : "Data snapshot: unknown — say timing is approximate; do NOT invent a clock time",
    "Use ONLY this snapshot time on the card. Do not put 'generated now' / copy-time on the image.",
    "Every number on the card is from that same Tripwire / Dune query snapshot (on-chain + price/mcap joined at refresh).",
    windowLabel ? `Window on this card: ${windowLabel}` : null,
    "",
    "=== DISCLAIMER (must appear, one short line on the image) ===",
    "Community on-chain stats from Tripwire (tripwire-app.vercel.app) — not financial advice. DYOR.",
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
  "- If DATA has byWindow / sections, lay out clear columns or stacked bands per window — do not blend windows into one unlabeled number.",
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

function megaDefLines(row) {
  const whaleMin = num(row["Whale Min $"]);
  const humpMin = num(row["Hump Min $"]);
  const megaDef =
    humpMin != null && humpMin > 1000
      ? `- Mega-trades = the top 1% of those same sizes (definition includes a $1,000 floor) → about ${fmtUsd(humpMin)}+ right now. Every mega-trade is also a large-wallet trade — a subset, not a separate group.`
      : humpMin != null
        ? `- Mega-trades = the top 1% with a $1,000 minimum — currently at that floor. Every mega-trade is also a large-wallet trade — a subset, not a separate group.`
        : "- Mega-trades = the top 1% with a $1,000 minimum. Every mega-trade is also a large-wallet trade — a subset, not a separate group.";
  return [
    "Tripwire does NOT use a fixed cutoff like \"$10k = whale.\"",
    "For THIS token:",
    `- Large-wallet trades = DEX trades in the top 10% of this token's own trade sizes over 30 days (floor $100)${whaleMin != null ? ` → about ${fmtUsd(whaleMin)}+ right now` : ""}.`,
    megaDef,
    "- Other large wallets = large-wallet trades that are NOT mega (top 10% but below top 1%).",
    "- Everyone else = all smaller DEX trades (below the large-wallet bar).",
    "Net flow = dollars bought minus dollars sold in that group — not a pile you carve a share from. Mega net + other-large-wallet net ALWAYS equals large-wallet net (same window). Mega net can be larger in magnitude than large-wallet net when the other tier offsets it.",
  ];
}

function whaleFlowSlice(row, period) {
  const win = whaleWindow(period);
  const wk = whaleKeys(period);
  const whaleNet = num(row[wk.net]);
  const megaNet = num(win === "24h" ? row["Hump Net 24h"] : row["Hump Net 7d"]);
  // Same snapshot row — other = whale − mega (mid-tier large wallets).
  const otherNet =
    whaleNet != null && megaNet != null ? whaleNet - megaNet
      : whaleNet != null && megaNet == null ? whaleNet
        : null;
  return {
    flowWindow: win,
    largeWalletNetFlow: fmtUsd(whaleNet),
    largeWalletBuyers: fmtInt(num(row[wk.buyers])),
    largeWalletSellers: fmtInt(num(row[wk.sellers])),
    // Two children that sum to largeWalletNetFlow — not "of which" carve-outs
    withinLargeWalletNet: {
      note: "Mega net + otherLargeWalletNetFlow = largeWalletNetFlow (same window). Net is not a pile; the two tiers can offset.",
      megaTrades: {
        label: "Mega-trades (top 1%, subset of large-wallet)",
        netFlow: fmtUsd(megaNet),
        buyers: fmtInt(num(win === "24h" ? row["Hump Buyers 24h"] : row["Hump Buyers 7d"])),
        sellers: fmtInt(num(win === "24h" ? row["Hump Sellers 24h"] : row["Hump Sellers 7d"])),
      },
      otherLargeWallets: {
        label: "Other large wallets (top 10% but not top 1%)",
        netFlow: fmtUsd(otherNet),
      },
    },
    everyoneElseNetFlow: fmtUsd(num(row[wk.retail])),
    largeTradesShareOfVolume: fmtPct(num(row[wk.whaleVol])),
    _dir: whaleNet == null ? "quiet" : whaleNet > 0 ? "inflow" : whaleNet < 0 ? "outflow" : "flat",
  };
}

function buyersSlice(row, period) {
  const bk = buyerKeys(period);
  const buyers = num(row[bk.buyers]);
  const ratio = bk.buySellRatio ? num(row[bk.buySellRatio]) : null;
  const sellers =
    buyers != null && ratio != null && ratio > 0 ? buyers / ratio : null;
  return {
    window: bk.win,
    dexBuyers: fmtInt(buyers),
    dexSellers: fmtInt(sellers),
    buyerToSellerWalletRatio: ratio == null ? null : Number(ratio.toFixed(2)),
    buyShareOfDexVolume: bk.buyVolPct ? fmtPct(num(row[bk.buyVolPct])) : null,
    firstTimeBuyers: fmtInt(num(row[bk.firstBuyers])),
    firstTimeSellers: fmtInt(num(row[bk.firstSellers])),
    dexTraders30d: period === "30d" ? fmtInt(num(row.Traders)) : null,
  };
}

function activitySlice(row, period) {
  const ak = activityKeys(period);
  const buyersKey = period === "24h" ? "Buyers 24h" : period === "30d" ? "Buyers 30d" : "Buyers 7d";
  return {
    window: ak.win,
    dexVolume: fmtUsd(num(row[ak.vol])),
    transactions: fmtInt(num(row[ak.txs])),
    activeWallets: fmtInt(num(row[ak.wallets])),
    dexBuyers: fmtInt(num(row[buyersKey])),
    volumeChangeVsLastWeek: period === "7d" ? fmtPct(num(row["Vol Grw %"])) : null,
  };
}

/**
 * Whale-themed flow card — image generation.
 * @param {object} row
 * @param {"24h"|"7d"|"30d"|"all"} period — 30d falls back to 7d; all = 24h + 7d bands
 * @param {{ scoresLastUpdated?: string|null }} meta
 */
export function buildWhaleCardPrompt(row, period = "7d", meta = {}) {
  if (!row) return "";
  const multi = isAllWindows(period);
  const whaleMin = num(row["Whale Min $"]);
  const humpMin = num(row["Hump Min $"]);

  let stats;
  let dirHint;
  let windowLabel;

  if (multi) {
    const byWindow = {};
    for (const w of WHALE_FLOW_WINDOWS) {
      const slice = whaleFlowSlice(row, w);
      const { _dir, ...rest } = slice;
      byWindow[w] = rest;
      if (w === "7d") dirHint = _dir;
    }
    stats = {
      ...plainTokenHeader(row),
      largeTradeMinSize: fmtUsd(whaleMin),
      megaTradeMinSize: fmtUsd(humpMin),
      byWindow,
      note: "No 30d large-wallet flow twin — only 24h and 7d.",
    };
    windowLabel = "large-wallet flow · 24h + 7d (no 30d twin)";
  } else {
    const slice = whaleFlowSlice(row, period);
    dirHint = slice._dir;
    const { _dir, ...rest } = slice;
    stats = {
      ...plainTokenHeader(row),
      largeTradeMinSize: fmtUsd(whaleMin),
      megaTradeMinSize: fmtUsd(humpMin),
      ...rest,
    };
    windowLabel = `trailing large-wallet flow ${rest.flowWindow}${period === "30d" ? " (no 30d twin — using 7d)" : ""}`;
  }

  return [
    ...imageOutputRules(
      multi
        ? "THEME: deep-ocean WHALE card with TWO clear time bands (24h | 7d) — navy/black water, soft teal accents. Compare windows; not a price chart."
        : "THEME: deep-ocean WHALE card — navy/black water, soft bioluminescent teal accents, subtle whale silhouette or ripple motif (tasteful, not cartoon spam). Big-wallet money story, not a price chart."
    ),
    "",
    ...metaBlock(meta, windowLabel),
    "",
    "=== PLAIN DEFINITIONS (1–2 lines on the card) ===",
    ...megaDefLines(row),
    "",
    "=== DATA (only these numbers may appear on the image) ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    `Direction hint from large-wallet net${multi ? " (7d)" : ""}: ${dirHint}.`,
    "HIERARCHY (must follow — this is the #1 layout rule):",
    "- Large-wallet net is the hero. Under it, show a nested BREAKDOWN with BOTH children from withinLargeWalletNet:",
    "  (1) Mega-trades net + buyers/sellers, (2) Other large wallets net.",
    "- Those two must visibly add up to the hero large-wallet net. Do NOT use \"of which\" / carve-out wording alone — net is not a pile.",
    "- If mega net is larger in magnitude than large-wallet net (or opposite sign), the summary MUST say the tiers offset (e.g. megas sold while other large wallets bought).",
    "- Never promote mega to a peer column equal to buyers/sellers, everyone-else, or volume share.",
    "On-image layers:",
    multi
      ? "1. TITLE — project · \"Large wallet flow\" · 24h vs 7d."
      : "1. TITLE — project · \"Large wallet flow\" (or \"Whale flow\" if you keep the theme).",
    multi
      ? "2. TWO BANDS (24h | 7d) — each band's hero is large-wallet net; nested under it: mega + other large wallets (both lines)."
      : "2. HERO — large-wallet net flow with clear in/out. Nested under it: mega + other large wallets (both lines from withinLargeWalletNet).",
    "3. UP TO TWO peer callouts (not mega) — e.g. large-wallet buyers vs sellers, everyone-else net, or large-trades share of volume.",
    "4. Tiny definition: large-wallet bar + mega as subset + other large wallets + note that mega net + other = large-wallet net.",
    "5. Snapshot time + disclaimer.",
  ].join("\n");
}

/**
 * Buyers / sellers breadth card — wallet counts, not price %.
 * @param {object} row
 * @param {"24h"|"7d"|"30d"|"all"} period
 * @param {{ scoresLastUpdated?: string|null }} meta
 */
export function buildBuyersCardPrompt(row, period = "7d", meta = {}) {
  if (!row) return "";
  const multi = isAllWindows(period);

  let stats;
  let lean = "unknown";
  let windowNote;

  if (multi) {
    const byWindow = {};
    for (const w of ALL_WINDOWS) {
      byWindow[w] = buyersSlice(row, w);
    }
    const r7 = byWindow["7d"]?.buyerToSellerWalletRatio;
    if (r7 != null) {
      lean = r7 > 1.05 ? "more buying wallets than selling (7d)"
        : r7 < 0.95 ? "more selling wallets than buying (7d)"
          : "roughly balanced wallet counts (7d)";
    }
    stats = {
      ...plainTokenHeader(row),
      byWindow,
      note: "Buy/sell ratio + buy volume share exist for 24h & 7d only; 30d shows buyer / first-trade counts (+ traders).",
    };
    windowNote = "DEX buyer / seller breadth · 24h + 7d + 30d";
  } else {
    const bk = buyerKeys(period);
    const slice = buyersSlice(row, period);
    const ratio = slice.buyerToSellerWalletRatio;
    lean =
      ratio == null ? "unknown"
        : ratio > 1.05 ? "more buying wallets than selling"
          : ratio < 0.95 ? "more selling wallets than buying"
            : "roughly balanced wallet counts";
    stats = { ...plainTokenHeader(row), ...slice };
    windowNote = bk.hasRatioTwins
      ? `DEX buyer / seller breadth · ${bk.win}`
      : `DEX buyer / seller breadth · ${bk.win} (buy/sell ratio + buy volume share only exist for 24h & 7d — omitted here)`;
  }

  return [
    ...imageOutputRules(
      multi
        ? "THEME: buyer/seller breadth card with THREE time bands (24h | 7d | 30d) — dark slate, clear buy vs sell contrast. Who showed up across windows."
        : "THEME: buyer/seller breadth card — dark slate, clear two-column contrast (buy side vs sell side), no price chart. Story is who showed up to trade, not candle moves."
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
    multi
      ? "1. TITLE — project · \"Buyers & sellers\" · 24h / 7d / 30d."
      : "1. TITLE — project · \"Buyers & sellers\" · window.",
    multi
      ? "2. THREE BANDS — one per window; hero each band with buyers (and sellers/ratio when present)."
      : "2. HERO — DEX buyers (and sellers if present), or the buyer-to-seller ratio if that is the clearest story.",
    "3. UP TO THREE CALLOUTS — e.g. first-time buyers vs sellers, buy share of volume, traders (30d only).",
    "4. Tiny note that ratio = wallet counts (not dollars); buy share of volume is the money side.",
    "5. Snapshot time + disclaimer.",
    "Do not invent sellers when dexSellers is null. Do not invent ratio or buy volume share when null.",
  ].join("\n");
}

/** Status / health card. */
export function buildHealthCardPrompt(row, period = "7d", meta = {}) {
  if (!row) return "";
  const multi = isAllWindows(period);
  const age = num(row["Token Age Days"]);
  const wk = whaleKeys(multi ? "7d" : period);

  let stats;
  if (multi) {
    const byWindow = {};
    for (const w of ALL_WINDOWS) {
      const ak = activityKeys(w);
      const buyersKey = w === "24h" ? "Buyers 24h" : w === "30d" ? "Buyers 30d" : "Buyers 7d";
      byWindow[w] = {
        dexVolume: fmtUsd(num(row[ak.vol])),
        transactions: fmtInt(num(row[ak.txs])),
        activeWallets: fmtInt(num(row[ak.wallets])),
        dexBuyers: fmtInt(num(row[buyersKey])),
        largeWalletNetFlow: w === "30d" ? null : fmtUsd(num(row[whaleKeys(w).net])),
      };
    }
    stats = {
      ...plainTokenHeader(row),
      tokenAgeDays: age == null ? null : Math.round(age),
      walletsThatCameBackPct: fmtPct(num(row["Retention %"])),
      byWindow,
      note: "Retention is week-over-week only. Large-wallet net shown for 24h & 7d.",
    };
  } else {
    const ak = activityKeys(period);
    stats = {
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
  }

  return [
    ...imageOutputRules(
      multi
        ? "THEME: clean status card with 24h | 7d | 30d bands — dark slate, big readable numbers."
        : "THEME: clean status card — dark slate, big readable numbers, calm editorial type."
    ),
    "",
    ...metaBlock(meta, multi ? `status · 24h + 7d + 30d` : `status at query snapshot · period ${period}`),
    "",
    "=== DATA (only these numbers may appear on the image) ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    "On-image layers:",
    "1. TITLE — project · \"On-chain status\".",
    "2. HERO — price or market cap.",
    multi
      ? "3. THREE window bands with 1–2 numbers each (wallets / volume / large-wallet net when present)."
      : "3. THREE callouts from DATA (e.g. active wallets, DEX volume, large-wallet net flow).",
    "4. Optional one-liner that restates a number — no bullish/bearish spin.",
    "5. Snapshot time + disclaimer.",
  ].join("\n");
}

/**
 * Activity snapshot card for a period window.
 */
export function buildActivityCardPrompt(row, period = "7d", meta = {}) {
  if (!row) return "";
  const multi = isAllWindows(period);

  const stats = multi
    ? {
        ...plainTokenHeader(row),
        byWindow: Object.fromEntries(ALL_WINDOWS.map((w) => [w, activitySlice(row, w)])),
      }
    : { ...plainTokenHeader(row), ...activitySlice(row, period) };

  return [
    ...imageOutputRules(
      multi
        ? "THEME: kinetic activity card with THREE time bands (24h | 7d | 30d) — dark background, one hot accent, oversized volume / wallet counts."
        : "THEME: kinetic activity card — dark background, one hot accent, oversized volume / wallet counts. Pulse of usage, not a trading terminal."
    ),
    "",
    ...metaBlock(meta, multi ? "activity · 24h + 7d + 30d" : `activity ${period}`),
    "",
    "=== DATA (only these numbers may appear on the image) ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    "On-image layers:",
    multi
      ? "1. TITLE — project · \"Activity\" · 24h / 7d / 30d."
      : `1. TITLE — project · \"Activity · ${period}\".`,
    multi
      ? "2. THREE BANDS — DEX volume hero each window; txs / wallets / buyers as support."
      : "2. HERO — DEX volume.",
    multi
      ? "3. Optional: volume vs last week only under the 7d band."
      : "3. THREE stats: transactions, active wallets, DEX buyers (plus volume vs last week only if present and window is 7d).",
    "4. Snapshot time + disclaimer.",
    "If showing volume vs last week, label it exactly that way — not \"Vol Grw %\".",
  ].join("\n");
}

/**
 * Movers highlight card — flags if token is on the Movers board for this window.
 */
export function buildMoversCardPrompt(row, allRows, period = "7d", meta = {}) {
  if (!row) return "";
  const multi = isAllWindows(period);

  if (multi) {
    const byWindow = {};
    for (const w of ALL_WINDOWS) {
      const highlight = moversHighlightForToken(allRows, row.Address || row.Project, w);
      const wk = whaleKeys(w);
      const ak = activityKeys(w);
      byWindow[w] = {
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
          activeWallets: fmtInt(num(row[ak.wallets])),
          largeWalletNetFlow: w === "30d" ? fmtUsd(num(row[wk.net])) : fmtUsd(num(row[wk.net])),
        },
      };
    }
    const stats = { ...plainTokenHeader(row), byWindow };
    return [
      ...imageOutputRules(
        "THEME: Movers multi-window board — dark board, small rank badges per 24h / 7d / 30d band. Honest if off-board on some windows."
      ),
      "",
      ...metaBlock(meta, "movers · 24h + 7d + 30d (30d whale list uses 7d flow)"),
      "",
      "=== DATA (only these numbers may appear on the image) ===",
      JSON.stringify(stats, null, 2),
      "",
      "=== CARD TASK ===",
      "On-image layers:",
      "1. TITLE — \"Movers\" · project · multi-window.",
      "2. THREE BANDS — rank badge per window only when on that window's list; otherwise mark off-board for that band.",
      "3. One plain number per band for THIS token.",
      "4. Snapshot time + disclaimer.",
      "Do NOT fake a top rank for any window.",
    ].join("\n");
  }

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

/**
 * Combined card — Whale + Buyers + Activity in one image.
 * Window "all" stacks every available twin; a single window keeps that slice for each section.
 */
export function buildAllCardPrompt(row, period = "all", meta = {}) {
  if (!row) return "";
  const multi = isAllWindows(period);
  const windows = multi ? ALL_WINDOWS : [period === "30d" ? "30d" : period === "24h" ? "24h" : "7d"];
  const whaleWindows = multi ? WHALE_FLOW_WINDOWS : [whaleWindow(period)];

  const whaleByWindow = {};
  for (const w of whaleWindows) {
    const { _dir, ...rest } = whaleFlowSlice(row, w);
    whaleByWindow[w] = rest;
  }
  const buyersByWindow = {};
  for (const w of windows) {
    buyersByWindow[w] = buyersSlice(row, w);
  }
  const activityByWindow = {};
  for (const w of windows) {
    activityByWindow[w] = activitySlice(row, w);
  }

  const stats = {
    ...plainTokenHeader(row),
    largeTradeMinSize: fmtUsd(num(row["Whale Min $"])),
    megaTradeMinSize: fmtUsd(num(row["Hump Min $"])),
    sections: {
      largeWalletFlow: {
        byWindow: whaleByWindow,
        note: "Large-wallet flow twins: 24h & 7d only.",
      },
      buyersSellers: { byWindow: buyersByWindow },
      activity: { byWindow: activityByWindow },
    },
  };

  const windowLabel = multi
    ? "ALL sections · windows 24h + 7d + 30d (whale flow 24h + 7d only)"
    : `ALL sections · single window ${windows[0]}${period === "30d" ? " (whale flow uses 7d)" : ""}`;

  return [
    ...imageOutputRules(
      "THEME: dense Tripwire summary card — three labeled sections (Large wallet flow · Buyers & sellers · Activity), dark slate, tight hierarchy. Readable at a glance; not a spreadsheet dump."
    ),
    "",
    ...metaBlock(meta, windowLabel),
    "",
    "=== PLAIN DEFINITIONS (keep tiny on-image) ===",
    ...megaDefLines(row).slice(0, 4),
    "- Buyers/sellers = unique DEX wallets; ratio is wallet counts; buy share of volume is dollars.",
    "",
    "=== DATA (only these numbers may appear on the image) ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    "On-image layers:",
    "1. TITLE — project · \"On-chain snapshot\" (or \"Tripwire summary\").",
    multi
      ? "2. THREE SECTIONS stacked — Large wallet flow (24h|7d) · Buyers & sellers (24h|7d|30d) · Activity (24h|7d|30d). One hero number per window band; skip nulls."
      : "2. THREE SECTIONS stacked — Large wallet flow · Buyers & sellers · Activity for the selected window. One hero + one support number each.",
    "3. In the Large wallet section only: nested breakdown under the hero — mega net AND other large-wallet net (both), summing to the hero. Never \"of which\" alone; never a peer tile to buyers/sellers or activity.",
    "4. Keep labels plain English. Do not invent missing windows or ratios.",
    "5. Snapshot time + disclaimer.",
    "Prefer a tall 4:5 card if needed for three sections.",
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
  { value: "all", label: "All", blurb: "Whale + Buyers + Activity on one card" },
  { value: "health", label: "Health", blurb: "Status snapshot" },
  { value: "movers", label: "Movers", blurb: "Board highlight with peer numbers" },
];

export const SHARE_PROMPT_WINDOWS = [
  { value: "24h", label: "24h" },
  { value: "7d", label: "7d" },
  { value: "30d", label: "30d" },
  { value: "all", label: "24·7·30" },
];

export function buildShareCardPrompt(kind, row, allRows, period, meta) {
  if (kind === "all") return buildAllCardPrompt(row, period, meta);
  if (kind === "buyers") return buildBuyersCardPrompt(row, period, meta);
  if (kind === "health") return buildHealthCardPrompt(row, period, meta);
  if (kind === "activity") return buildActivityCardPrompt(row, period, meta);
  if (kind === "movers") return buildMoversCardPrompt(row, allRows, period, meta);
  return buildWhaleCardPrompt(row, period, meta);
}

function dirFromNet(n) {
  if (n == null) return "unknown";
  if (n > 0) return "inflow";
  if (n < 0) return "outflow";
  return "flat";
}

/**
 * ClawdWire live-pulse share card — CLAWD-only Dune pulse row (+ optional dashboard row for mcap/price).
 * Soft language only: no wash/manipulation accusations.
 */
export function buildClawdWireCardPrompt(wireRow, dashRow = null, meta = {}) {
  if (!wireRow) return "";

  const whaleNet = num(wireRow["Whale Net 24h"]);
  const retailNet = num(wireRow["Retail Net 24h"]);
  const humpNet = num(wireRow["Hump Net 24h"]);
  const otherLarge =
    whaleNet != null && humpNet != null ? whaleNet - humpNet : null;
  const net24 = num(wireRow["Net USD 24h"]);
  const roundTripVol = num(
    wireRow["Round-trip Vol % 24h"] ?? wireRow["Wash Vol % 24h"]
  );
  const roundTripWallets = num(
    wireRow["Round-trip Wallets 24h"] ?? wireRow["Wash Wallets 24h"]
  );

  const mcap =
    fmtUsd(num(wireRow.marketCapUsd)) ||
    fmtUsd(num(dashRow?.marketCapUsd));
  const price =
    fmtPrice(num(dashRow?.priceUsd)) ||
    fmtPrice(num(wireRow.priceUsd));

  const stats = {
    project: wireRow.Project || dashRow?.Project || "CLAWD",
    symbol: dashRow?.Symbol || "CLAWD",
    address: wireRow.Address || dashRow?.Address || null,
    marketCap: mcap,
    price,
    largeTradeMinSize: fmtUsd(num(wireRow["Whale Min $"])),
    megaTradeMinSize: fmtUsd(num(wireRow["Hump Min $"])),
    flowWindow: "24h",
    netFlow24h: fmtUsd(net24),
    largeWalletNetFlow: fmtUsd(whaleNet),
    largeWalletBuyers: fmtInt(num(wireRow["Whale Buyers 24h"])),
    largeWalletSellers: fmtInt(num(wireRow["Whale Sellers 24h"])),
    withinLargeWalletNet: {
      note: "Mega net + other large-wallet net = large-wallet net (same window). Tiers can offset.",
      megaTrades: {
        label: "Mega-trades (top 1%, subset of large-wallet)",
        netFlow: fmtUsd(humpNet),
        buyers: fmtInt(num(wireRow["Hump Buyers 24h"])),
        sellers: fmtInt(num(wireRow["Hump Sellers 24h"])),
      },
      otherLargeWallets: {
        label: "Other large wallets (top 10% but not top 1%)",
        netFlow: fmtUsd(otherLarge),
      },
    },
    everyoneElseNetFlow: fmtUsd(retailNet),
    largeTradesShareOfVolume: fmtPct(num(wireRow["Whale Vol % 24h"])),
    pulse: {
      net15m: fmtUsd(num(wireRow["Net USD 15m"])),
      net1h: fmtUsd(num(wireRow["Net USD 1h"])),
      net6h: fmtUsd(num(wireRow["Net USD 6h"])),
      net24h: fmtUsd(net24),
    },
    timing: {
      peakPriceHourUtc: wireRow["Peak Price Hour"] || null,
      netAtPeakHour: fmtUsd(num(wireRow["Net At Peak Hour"])),
      largeWalletNetAtPeakHour: fmtUsd(num(wireRow["Whale Net At Peak Hour"])),
      netHourAfterPeak: fmtUsd(num(wireRow["Net Hour After Peak"])),
      largeWalletNetHourAfterPeak: fmtUsd(num(wireRow["Whale Net Hour After Peak"])),
      worstNetHourUtc: wireRow["Worst Net Hour"] || null,
      worstHourNet: fmtUsd(num(wireRow["Worst Hour Net $"])),
      runUpNet: fmtUsd(num(wireRow["Run-up Net $"])),
      dumpHourNet: fmtUsd(num(wireRow["Dump Hour Net $"])),
    },
    tradeShapeSignals: {
      note: "Research heuristics only — short-window round-trips and size clustering. Not proof of intent.",
      sizeUniformityPct: fmtPct(num(wireRow["Size Uniformity %"])),
      roundTripVolPct24h: fmtPct(roundTripVol),
      roundTripWallets24h: fmtInt(roundTripWallets),
      survive1hPct: fmtPct(num(wireRow["Survive 1h %"])),
      survive1dPct: fmtPct(num(wireRow["Survive 1d %"])),
    },
  };

  const pulseAsOf = meta.clawdWireLastRunAt
    ? new Date(meta.clawdWireLastRunAt).toLocaleString(undefined, {
        dateStyle: "medium",
        timeStyle: "short",
        timeZoneName: "short",
      })
    : meta.scoresLastUpdated
      ? new Date(meta.scoresLastUpdated).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
          timeZoneName: "short",
        })
      : null;

  return [
    ...imageOutputRules(
      "THEME: deep-ocean CLAWD pulse card — navy/black water, soft bioluminescent teal, subtle whale/ripple motif (tasteful). Live flow story, not a price chart."
    ),
    "",
    "=== TIMESTAMPS (must appear on the image — data time only) ===",
    pulseAsOf
      ? `Data snapshot (viewer local time): ${pulseAsOf}`
      : "Data snapshot: unknown — say timing is approximate; do NOT invent a clock time",
    "Use ONLY this snapshot time on the card. Do not put 'generated now' / copy-time on the image.",
    "Numbers are from Tripwire ClawdWire (CLAWD-only Dune pulse) joined with live mcap/price when present.",
    "Window on this card: ClawdWire live pulse · trailing 24h large-wallet flow + timing",
    "",
    "=== DISCLAIMER (must appear, one short line on the image) ===",
    "Community on-chain stats from Tripwire (tripwire-app.vercel.app) — not financial advice. DYOR.",
    "",
    "=== LANGUAGE RULES (legal / trust — mandatory) ===",
    "- NEVER say wash trading, fake volume, manipulation, scam, illegal, or accuse anyone of fraud.",
    "- Soft labels only: \"large-wallet flow\", \"round-trip activity\", \"trade-shape signal\", \"research heuristic\".",
    "- If showing round-trip stats, frame as \"short-window matched buy/sell patterns (research)\" — not guilt.",
    "- NEVER present matched trade results / VWAP figures as tax numbers, realized gains, cost basis, IRS/CRA amounts, or accounting PnL.",
    "- If those fields appear in DATA, label them \"experiment / don't take it to the bank\" — cool humble vibe, not tax implications.",
    "",
    "=== PLAIN DEFINITIONS (1–2 lines on the card) ===",
    ...megaDefLines(wireRow),
    "Round-trip activity = wallets with repeated near-matched buy+sell pairs inside ~5 minutes (3+ pairs). Research signal only.",
    "",
    "=== DATA (only these numbers may appear on the image) ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    `Direction hint from large-wallet net 24h: ${dirFromNet(whaleNet)}.`,
    "HIERARCHY:",
    "1. TITLE — CLAWD · \"Live pulse\" or \"Large wallet flow\".",
    "2. HERO — large-wallet net 24h (in/out). Nested: mega + other large wallets (both; they add to hero).",
    "3. UP TO TWO peers — e.g. everyone-else net, large-trades share of volume, or pulse nets 1h/6h.",
    "4. OPTIONAL timing strip (if present) — peak hour vs hour-after / dump-hour net (plain English).",
    "5. Tiny definition + snapshot time + disclaimer.",
    "6. Do NOT invent wallets, causes, or entry/exit calls.",
  ].join("\n");
}
