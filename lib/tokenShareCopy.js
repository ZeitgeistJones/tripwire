/** Plain-text share copies (Discord / Twitter / etc.) — used by admin. */

import { formatSnapshotTime, snapshotAsOfLine } from "./snapshotTime";

function fmtHelpers() {
  return (v, fmt) => {
    if (v == null || v === "") return "—";
    const n = Number(v);
    if (Number.isNaN(n)) return "—";
    if (fmt === "usd") {
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(1) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
      return "$" + Math.round(n).toLocaleString();
    }
    if (fmt === "usd2") {
      if (Math.abs(n) >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
      if (Math.abs(n) >= 1e3) return "$" + (n / 1e3).toFixed(1) + "K";
      return "$" + Math.round(n).toLocaleString();
    }
    if (fmt === "usdSign") return (n < 0 ? "\u2212" : "+") + "$" + Math.abs(Math.round(n)).toLocaleString();
    if (fmt === "price") return "$" + n.toPrecision(4);
    if (fmt === "pct") return n.toFixed(1) + "%";
    if (fmt === "dec") return n.toFixed(1);
    if (fmt === "int") return Math.round(n).toLocaleString();
    return String(n);
  };
}

function tokenTag(d) {
  const sym = (d?.Symbol || d?.Project || "TOKEN").replace(/^\$/, "");
  return "$" + sym.toUpperCase();
}

function metaOpts(meta) {
  return meta && typeof meta === "object" && !Array.isArray(meta) ? meta : {};
}

/** @param {object} d @param {{ scoresLastUpdated?: string|null }} [meta] */
export function buildShareText(d, meta = {}) {
  if (!d) return "";
  const f = fmtHelpers();
  const tag = tokenTag(d);
  const { scoresLastUpdated } = metaOpts(meta);
  const asOf = formatSnapshotTime(scoresLastUpdated, { style: "short" });
  const signal = d.signal || "—";
  const note = d.signalNote ? " \u00b7 " + d.signalNote : "";
  const prof = d.Prof || "—";
  const read = d.read || "—";

  return [
    "\ud83d\udd17 " + tag + " \u2014 Under the Hood",
    asOf ? "Snapshot: " + asOf : null,
    "",
    "\ud83d\udcb0 " + f(d.priceUsd, "price") + " | MCap " + f(d.marketCapUsd, "usd"),
    "\ud83d\udcca Opp " + f(d.Opp, "dec") + " | Mom " + f(d.Mom, "dec") + " | Sus " + f(d.Sus, "dec"),
    "",
    "\ud83d\udc33 Whale Flow (7d)",
    "  Net: " + f(d["Whale Net 7d"], "usdSign") + " | Accum: " + f(d["Accum %"], "pct") + " | Buyers: " + f(d["Whale Buyers 7d"], "int") + " / Sellers: " + f(d["Whale Sellers 7d"], "int"),
    "  Humpback Net: " + f(d["Hump Net 7d"], "usdSign") + " | Buyers: " + f(d["Hump Buyers 7d"], "int") + " / Sellers: " + f(d["Hump Sellers 7d"], "int"),
    "  Retail Net: " + f(d["Retail Net 7d"], "usdSign") + " | Whale Vol: " + f(d["Whale Vol %"], "pct"),
    "  W/R Divergence: " + f(d["Divergence Bps"], "dec") + " bps",
    "",
    "\ud83d\udcc8 Activity (7d)",
    "  Txs: " + f(d["Txs 7d"], "int") + " | Wallets: " + f(d["Wallets 7d"], "int"),
    "  Retention: " + f(d["Retention %"], "pct") + " | New: " + f(d["New %"], "pct"),
    "  Vol: " + f(d["Vol 30d"], "usd") + " (30d) | Vol Grw: " + f(d["Vol Grw %"], "pct"),
    "",
    "Signal: " + signal + note,
    "Profile: " + prof + " | Read: " + read,
    "",
    "tripwire.vercel.app",
  ].filter((line) => line != null).join("\n");
}

/** @param {object} d @param {{ scoresLastUpdated?: string|null }} [meta] */
export function buildObjectiveText(d, meta = {}) {
  if (!d) return "";
  const f = fmtHelpers();
  const tag = tokenTag(d);
  const { scoresLastUpdated } = metaOpts(meta);
  const whaleMin = f(d["Whale Min $"], "usd");
  const humpMinRaw = d["Hump Min $"];
  const humpMinNum = humpMinRaw == null || humpMinRaw === "" ? null : Number(humpMinRaw);
  const megaLine =
    humpMinNum != null && !Number.isNaN(humpMinNum) && humpMinNum > 1000
      ? "  · Mega-trade / humpback = top 1% of those sizes (definition includes a $1,000 floor). Every mega-trade is also a whale.\n    → Current mega threshold: " + f(d["Hump Min $"], "usd") + "+ per trade."
      : humpMinNum != null && !Number.isNaN(humpMinNum)
        ? "  · Mega-trade / humpback = top 1% of those sizes with a $1,000 minimum — currently at that floor (true top-1% is at or below $1,000). Every mega-trade is also a whale."
        : "  · Mega-trade / humpback = top 1% of those sizes with a $1,000 minimum. Every mega-trade is also a whale.";
  const age = d["Token Age Days"];
  const ageLabel = age == null || age === "" || Number.isNaN(Number(age))
    ? "—"
    : `${Math.round(Number(age)).toLocaleString()} days`;

  return [
    tag + " — On-chain facts (Base)",
    snapshotAsOfLine(scoresLastUpdated),
    "All numbers below are from that same Tripwire snapshot (Dune on-chain + price/mcap joined at refresh).",
    "Sources: Dune + CoinGecko/DexScreener. Facts only — no score, signal, or opinion.",
    "",
    "PRICE & SIZE",
    "  Price (at snapshot): " + f(d.priceUsd, "price"),
    "  Market cap (at snapshot): " + f(d.marketCapUsd, "usd2"),
    "  Token age on Base: " + ageLabel,
    "  DEX volume, last 30 days: " + f(d["Vol 30d"], "usd2"),
    "  DEX volume change, this week vs last week: " + f(d["Vol Grw %"], "pct"),
    "",
    "ACTIVITY",
    "  Contract txs, last 7 days: " + f(d["Txs 7d"], "int"),
    "  Active wallets, last 7 days: " + f(d["Wallets 7d"], "int")
      + "  (unique addresses that sent ≥1 tx to this token's contract)",
    "  DEX traders, last 30 days: " + f(d["Traders"], "int")
      + "  (unique wallets that bought or sold on a DEX)",
    "  DEX buyers, last 7 days: " + f(d["Buyers 7d"], "int"),
    "  First-time buyers, last 7 days: " + f(d["1st Buyers 7d"], "int")
      + "  (wallets whose first buy in the lookback landed this week)",
    "  First-time sellers, last 7 days: " + f(d["1st Sellers 7d"], "int")
      + "  (wallets whose first sell in the lookback landed this week)",
    "  Buy/Sell wallet ratio, last 7 days: " + f(d["Buy/Sell Ratio"], "dec")
      + "  (unique buyer wallets ÷ unique seller wallets; 1.0 = equal counts)",
    "  Buy volume share, last 7 days: " + f(d["Buy Vol %"], "pct")
      + "  (buy-side $ ÷ total DEX $ volume)",
    "  Top-10 wallet share of txs, last 30 days: " + f(d["Top10 %"], "pct")
      + "  (txs from the 10 most active wallets ÷ all txs; lower = less concentrated)",
    "",
    "WALLET COHORTS",
    "  Retention (week over week): " + f(d["Retention %"], "pct")
      + "  (wallets active both this week and last week ÷ this week's active wallets)",
    "  New wallet share, last 30 days: " + f(d["New %"], "pct")
      + "  (first seen on this token in 30d, with no activity on it in the prior 31–90d, ÷ wallets 30d)",
    "",
    "LAST 24 HOURS (as of snapshot)",
    "  DEX volume: " + f(d["Vol 24h"], "usd2"),
    "  Active wallets: " + f(d["Wallets 24h"], "int"),
    "  Whale net flow: " + f(d["Whale Net 24h"], "usdSign"),
    "",
    "LARGE-TRADE FLOW (DEX only, last 7 days as of snapshot)",
    "  How sizes are labeled for THIS token (not a fixed $10k rule):",
    "  · Whale = trade in the top 10% of this token's own DEX trade sizes over the last 30 days (floor $100).",
    "    → Current whale threshold: " + whaleMin + "+ per trade.",
    megaLine,
    "  · Non-large / retail = all other DEX trades (below the whale threshold).",
    "  Flows below are USD buy notional minus USD sell notional in each bucket over 7 days.",
    "",
    "  Whale net flow: " + f(d["Whale Net 7d"], "usdSign")
      + "  (" + f(d["Whale Buyers 7d"], "int") + " distinct whale buyers / "
      + f(d["Whale Sellers 7d"], "int") + " sellers)",
    "  Whale accum %: " + f(d["Accum %"], "pct")
      + "  (whale buy $ ÷ all whale $; ~50% = balanced buys/sells among whales)",
    "  Mega-trade net flow (top 1%): " + f(d["Hump Net 7d"], "usdSign")
      + "  (" + f(d["Hump Buyers 7d"], "int") + " / " + f(d["Hump Sellers 7d"], "int") + ")",
    "  Non-large-trade net flow: " + f(d["Retail Net 7d"], "usdSign"),
    "  Whale trades as % of 7d DEX $ volume: " + f(d["Whale Vol %"], "pct"),
    "",
    "REFERENCE",
    "  Contract: " + (d.Address || "—"),
    "  Verify: basescan.org · dexscreener.com · tripwire.vercel.app",
  ].join("\n");
}

/** @param {object} d @param {{ scoresLastUpdated?: string|null }} [meta] */
export function buildCondensedText(d, meta = {}) {
  if (!d) return "";
  const f = fmtHelpers();
  const tag = tokenTag(d);
  const { scoresLastUpdated } = metaOpts(meta);
  const asOf = formatSnapshotTime(scoresLastUpdated, { style: "short" });
  const signal = d.signal || "—";
  const note = d.signalNote ? " \u00b7 " + d.signalNote : "";

  return [
    tag + " " + f(d.priceUsd, "price") + " | " + (d.Prof || "") + " | " + signal + note,
    asOf ? "Snapshot: " + asOf : null,
    "\ud83d\udc33 Whale net " + f(d["Whale Net 7d"], "usdSign") + " | Accum " + f(d["Accum %"], "pct") + " | Retail " + f(d["Retail Net 7d"], "usdSign"),
    "\ud83d\udcc8 " + f(d["Wallets 7d"], "int") + " wallets | " + f(d["Retention %"], "pct") + " retention | Vol " + f(d["Vol Grw %"], "pct"),
    "tripwire.vercel.app",
  ].filter((line) => line != null).join("\n");
}
