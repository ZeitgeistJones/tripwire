/** Plain-text share copies (Discord / Twitter / etc.) — used by admin. */

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

export function buildShareText(d) {
  if (!d) return "";
  const f = fmtHelpers();
  const tag = tokenTag(d);
  const signal = d.signal || "—";
  const note = d.signalNote ? " \u00b7 " + d.signalNote : "";
  const prof = d.Prof || "—";
  const read = d.read || "—";

  return [
    "\ud83d\udd17 " + tag + " \u2014 Under the Hood",
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
  ].join("\n");
}

export function buildObjectiveText(d) {
  if (!d) return "";
  const f = fmtHelpers();
  const tag = tokenTag(d);
  const asOf = new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  const whaleMin = f(d["Whale Min $"], "usd");

  return [
    tag + " — On-chain facts (Base)",
    "As of " + asOf + " · sources: Dune (DEX + contract activity) + CoinGecko/DexScreener (price)",
    "Facts only — no score, signal, or opinion.",
    "",
    "PRICE & SIZE",
    "  Price (live): " + f(d.priceUsd, "price"),
    "  Market cap (live): " + f(d.marketCapUsd, "usd2"),
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
    "  Buy/Sell wallet ratio, last 7 days: " + f(d["Buy/Sell Ratio"], "dec")
      + "  (unique buyer wallets ÷ unique seller wallets; 1.0 = equal counts)",
    "  Buy volume share, last 7 days: " + f(d["Buy Vol %"], "pct")
      + "  (buy-side $ ÷ total DEX $ volume)",
    "",
    "WALLET COHORTS",
    "  Retention (week over week): " + f(d["Retention %"], "pct")
      + "  (wallets active both this week and last week ÷ this week's active wallets)",
    "  New wallet share, last 30 days: " + f(d["New %"], "pct")
      + "  (first seen on this token in 30d, with no activity on it in the prior 31–90d, ÷ wallets 30d)",
    "",
    "LARGE-TRADE FLOW (DEX only, last 7 days)",
    "  How sizes are labeled for THIS token (not a fixed $10k rule):",
    "  · Whale = trade in the top 10% of this token's own DEX trade sizes over the last 30 days (floor $100).",
    "    → Current whale threshold: " + whaleMin + "+ per trade.",
    "  · Mega-trade / humpback = top 1% of those sizes (floor $1,000). Every mega-trade is also a whale.",
    "  · Non-large / retail = all other DEX trades (below the whale threshold).",
    "  Flows below are USD buy notional minus USD sell notional in each bucket over 7 days.",
    "",
    "  Whale net flow: " + f(d["Whale Net 7d"], "usdSign")
      + "  (" + f(d["Whale Buyers 7d"], "int") + " distinct whale buyers / "
      + f(d["Whale Sellers 7d"], "int") + " sellers)",
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

export function buildCondensedText(d) {
  if (!d) return "";
  const f = fmtHelpers();
  const tag = tokenTag(d);
  const signal = d.signal || "—";
  const note = d.signalNote ? " \u00b7 " + d.signalNote : "";

  return [
    tag + " " + f(d.priceUsd, "price") + " | " + (d.Prof || "") + " | " + signal + note,
    "\ud83d\udc33 Whale net " + f(d["Whale Net 7d"], "usdSign") + " | Accum " + f(d["Accum %"], "pct") + " | Retail " + f(d["Retail Net 7d"], "usdSign"),
    "\ud83d\udcc8 " + f(d["Wallets 7d"], "int") + " wallets | " + f(d["Retention %"], "pct") + " retention | Vol " + f(d["Vol Grw %"], "pct"),
    "tripwire.vercel.app",
  ].join("\n");
}
