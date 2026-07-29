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

  return [
    tag + " \u2014 On-Chain Data (Base)",
    "As of " + asOf + " \u00b7 source: Dune + CoinGecko/DexScreener",
    "",
    "PRICE & SIZE",
    "  Price: " + f(d.priceUsd, "price"),
    "  Market cap: " + f(d.marketCapUsd, "usd2"),
    "  30d DEX volume: " + f(d["Vol 30d"], "usd2"),
    "  30d volume change (WoW): " + f(d["Vol Grw %"], "pct"),
    "",
    "ACTIVITY (7d)",
    "  Transactions: " + f(d["Txs 7d"], "int"),
    "  Active wallets: " + f(d["Wallets 7d"], "int"),
    "  Unique DEX traders (30d): " + f(d["Traders"], "int"),
    "  Buyers: " + f(d["Buyers 7d"], "int") + " | Buy/Sell ratio (wallets): " + f(d["Buy/Sell Ratio"], "int"),
    "  Buyer $ share of volume: " + f(d["Buy Vol %"], "pct"),
    "",
    "WALLET RETENTION (7d vs prior week)",
    "  Retention: " + f(d["Retention %"], "pct") + " of last week's wallets returned",
    "  New wallet share (30d): " + f(d["New %"], "pct"),
    "",
    "LARGE-TRADE FLOW (7d, DEX only)",
    "  Whale threshold for this token: " + f(d["Whale Min $"], "usd") + "+ per trade",
    "  Whale net flow: " + f(d["Whale Net 7d"], "usdSign") + " (" + f(d["Whale Buyers 7d"], "int") + " buyers / " + f(d["Whale Sellers 7d"], "int") + " sellers)",
    "  Mega-trade (top 1%) net flow: " + f(d["Hump Net 7d"], "usdSign") + " (" + f(d["Hump Buyers 7d"], "int") + " buyers / " + f(d["Hump Sellers 7d"], "int") + " sellers)",
    "  Non-large-trade net flow: " + f(d["Retail Net 7d"], "usdSign"),
    "  Large trades as % of 7d volume: " + f(d["Whale Vol %"], "pct"),
    "",
    "Contract: " + (d.Address || "\u2014"),
    "Verify independently: basescan.org / dexscreener.com",
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
