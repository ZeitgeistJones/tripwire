/** Admin whale-card prompt — paste into an LLM to draft a sharable graphic. */

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

/**
 * @param {object} row - dashboard row
 * @param {"7d"|"24h"} window
 * @param {{ scoresLastUpdated?: string|null, generatedAt?: string }} meta
 */
export function buildWhaleCardPrompt(row, window = "7d", meta = {}) {
  if (!row) return "";
  const win = window === "24h" ? "24h" : "7d";

  const whaleNet = num(win === "24h" ? row["Whale Net 24h"] : row["Whale Net 7d"]);
  const accum = num(win === "24h" ? row["Accum % 24h"] : row["Accum %"]);
  const wBuy = num(win === "24h" ? row["Whale Buyers 24h"] : row["Whale Buyers 7d"]);
  const wSell = num(win === "24h" ? row["Whale Sellers 24h"] : row["Whale Sellers 7d"]);
  const humpNet = num(win === "24h" ? row["Hump Net 24h"] : row["Hump Net 7d"]);
  const humpBuy = num(win === "24h" ? row["Hump Buyers 24h"] : row["Hump Buyers 7d"]);
  const humpSell = num(win === "24h" ? row["Hump Sellers 24h"] : row["Hump Sellers 7d"]);
  const retailNet = num(win === "24h" ? row["Retail Net 24h"] : row["Retail Net 7d"]);
  const whaleVol = num(win === "24h" ? row["Whale Vol % 24h"] : row["Whale Vol %"]);
  const buyVol = num(win === "24h" ? row["Buy Vol % 24h"] : row["Buy Vol %"]);
  const divBps = num(win === "24h" ? row["Divergence Bps 24h"] : row["Divergence Bps"]);
  const whaleMin = num(row["Whale Min $"]);
  const mcap = num(row.marketCapUsd);
  const read = row.read || null;
  const prof = row.Prof || null;
  const signal = row.signal || null;
  const signalNote = row.signalNote || null;

  const scoresAsOf = meta.scoresLastUpdated
    ? new Date(meta.scoresLastUpdated).toISOString()
    : null;
  const generatedAt = meta.generatedAt || new Date().toISOString();

  const stats = {
    window: win,
    project: row.Project,
    symbol: row.Symbol,
    address: row.Address || null,
    marketCapUsd: mcap,
    marketCapLabel: fmtUsd(mcap),
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
    read,
    profile: prof,
    signal,
    signalNote,
  };

  return [
    "You are designing a sharable social card (Discord / Twitter / Farcaster) about WHALE FLOW for one Base token.",
    "Audience: crypto holders who like clear on-chain stories — not traders hunting entries.",
    "",
    "=== TIMESTAMPS (must appear on the card) ===",
    `Prompt generated (UTC): ${generatedAt}`,
    scoresAsOf
      ? `On-chain scores / Dune snapshot as of (UTC): ${scoresAsOf}`
      : "On-chain scores / Dune snapshot as of: unknown — say data timing is approximate",
    `Flow window on this card: trailing ${win}`,
    "",
    "=== DISCLAIMER (must appear, one short line on the card) ===",
    "Community interpretation of Tripwire on-chain stats — not financial advice. DYOR.",
    "",
    "=== HOW WHALES & HUMPBACKS ARE DEFINED (explain plainly on the card — this is the hook) ===",
    "Tripwire does NOT use a fixed dollar cutoff like \"$10k = whale.\"",
    "For THIS token only:",
    `- A WHALE trade = a DEX trade in the top 10% of that token's own trade sizes over the last 30 days (floor $100).`,
    whaleMin != null
      ? `  → Right now that threshold is about ${fmtUsd(whaleMin)} for ${row.Symbol || row.Project}.`
      : "  → Threshold is listed as whaleThresholdUsd when available.",
    "- A HUMPBACK trade = the mega subset: top 1% of that token's trade sizes (floor $1,000). Every humpback is also a whale.",
    "- RETAIL net = everyone else (non-whale trades).",
    "Why it matters: a $2k trade can be a whale on a microcap and noise on a major — the bar scales per token.",
    "",
    "=== PLAIN-ENGLISH STAT CHEAT SHEET (use these labels on the card) ===",
    "- Whale net: buys minus sells among whale-sized trades. Positive = large wallets accumulating; negative = distributing.",
    "- Accum %: whale buy volume ÷ all whale volume. ~50% = balanced; higher leans accumulation; lower leans distribution.",
    "- Whale buyers / sellers: how many distinct large wallets — one whale vs a crowd.",
    "- Humpback net / buyers / sellers: same idea for the top 1% (usually a handful of very large players).",
    "- Retail net: flow from everyone who isn't a whale. Read WITH whale net (same direction = agreement; opposite = tension).",
    "- Whale vol %: share of all dollar volume that was whale-sized. Very high = retail is thin and the story is mostly big wallets.",
    "- Buy vol %: buys as a share of dollar volume (money-weighted).",
    "- W/R Div (bps): (whale net − retail net) ÷ market cap × 10,000. Positive = whales lean harder than retail; negative = retail lean / possible exit-liquidity pattern.",
    "",
    "=== DATA (use only these numbers; do not invent) ===",
    JSON.stringify(stats, null, 2),
    "",
    "=== CARD TASK ===",
    "Produce copy AND a tight visual brief for one sharable card:",
    "1. TITLE — project name + symbol (e.g. CLAWD · whale flow).",
    "2. ONE-LINE READ — plain English, no hype. What large wallets did in this window.",
    "3. THREE STAT CALLOUTS — pick the three most interesting numbers from the data; each with a short human label (not raw field names).",
    "4. DEFINITION FOOTNOTE — 1–2 sentences that teach whale vs humpback (per-token threshold).",
    "5. TIMESTAMP LINE — include both data-as-of and that this is a trailing " + win + " window.",
    "6. DISCLAIMER LINE — exactly or nearly the disclaimer above.",
    "",
    "Visual brief (for an image tool or designer): dark Tripwire-ish slate, one accent color, big net flow number, small definition strip at bottom, no charts required, no price targets, no emojis overload.",
    "Also give a paste-ready caption (≤ 280 chars) that can stand alone if there's no image.",
    "Be honest if the print is ambiguous. Do not invent causes (hacks, listings, etc.) unless present in the data.",
  ].join("\n");
}

/** Sorted options for admin token picker. */
export function whalePromptTokenOptions(rows) {
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
