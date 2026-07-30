/** Shared CLAWD analysis prompt builder (client copy + server Gemini). */

import { formatSnapshotTime } from "./snapshotTime";

export function buildAnalysisPrompt(d, history, meta = {}) {
  if (!d) return "";
  const j = (v) => (v == null || v === "" ? null : Number(v));
  const name = d.Project || "TOKEN";
  const symbol = d.Symbol ? ` (${d.Symbol})` : "";
  const scoresLastUpdated = meta?.scoresLastUpdated ?? null;
  const asOfIso = scoresLastUpdated
    ? (formatSnapshotTime(scoresLastUpdated, { style: "iso" }) || String(scoresLastUpdated))
    : null;
  const payload = {
    token: `${name}${symbol} — Base chain`,
    snapshotAsOf: asOfIso,
    asOf: asOfIso ? asOfIso.slice(0, 10) : null,
    price: { usd: j(d.priceUsd), marketCapUsd: j(d.marketCapUsd), change24hPct: j(d.priceChange7d) },
    tripwireScores: {
      opp: j(d.Opp), mom: j(d.Mom), sus: j(d.Sus), profile: d.Prof,
      signal: d.signal, signalNote: d.signalNote, read: d.read,
      qltyPct: j(d["Qlty %"]), riskPct: j(d["Risk %"]),
    },
    activity7d: {
      txs: j(d["Txs 7d"]), wallets: j(d["Wallets 7d"]), retentionPct: j(d["Retention %"]),
      newWalletPct: j(d["New %"]), txGrwPct: j(d["Tx Grw %"]), userGrwPct: j(d["User Grw %"]),
    },
    volume: {
      vol30dUsd: j(d["Vol 30d"]), volGrwWoWPct: j(d["Vol Grw %"]),
      volPerWallet: j(d["Vol/Wlt"]), buyVolPct: j(d["Buy Vol %"]),
    },
    buyers: {
      buyers7d: j(d["Buyers 7d"]), buySellRatio: j(d["Buy/Sell Ratio"]),
      firstBuyers7d: j(d["1st Buyers 7d"]), firstSellers7d: j(d["1st Sellers 7d"]),
    },
    whaleFlow7d: {
      whaleMinTradeUsd: j(d["Whale Min $"]),
      humpbackMinTradeUsd: j(d["Hump Min $"]),
      whaleNetUsd: j(d["Whale Net 7d"]), accumPct: j(d["Accum %"]),
      whaleBuyers: j(d["Whale Buyers 7d"]), whaleSellers: j(d["Whale Sellers 7d"]),
      humpbackNetUsd: j(d["Hump Net 7d"]), humpbackBuyers: j(d["Hump Buyers 7d"]),
      humpbackSellers: j(d["Hump Sellers 7d"]),
      retailNetUsd: j(d["Retail Net 7d"]), whaleVolSharePct: j(d["Whale Vol %"]),
      whaleRetailDivergenceBps: j(d["Divergence Bps"]),
    },
    concentration: { top10TxSharePct: j(d["Top10 %"]) },
    behavioralHistory: (history || []).slice(-8).map((r) => ({
      date: r["Snapshot Date"],
      opp: j(r["Opp"]), mom: j(r["Mom"]), sus: j(r["Sus"]),
      retentionPct: j(r["Retention %"]), volGrwPct: j(r["Vol Grw %"]),
    })),
  };

  return [
    `You are writing an analyst report on the token ${name} for its holder community.`,
    "",
    "SNAPSHOT TIMING:",
    asOfIso
      ? `- All stats in DATA are from the Tripwire / Dune query snapshot at ${asOfIso}. Treat the whole report as that moment in time — do not invent a newer "as of" date.`
      : "- Snapshot time unknown; say timing is approximate and do not invent a precise clock time.",
    "",
    "METRIC DEFINITIONS (all on-chain, Base network, DEX trades via Dune):",
    "- Opp/Mom/Sus: composite 0-100ish behavioral scores (opportunity, momentum, sustainability). Profile buckets tokens by Mom/Sus vs cohort median; Signal compares volume growth vs 24h price direction; Read is the Profile\u00d7Signal label.",
    "- Retention %: share of last week's active wallets that returned this week.",
    "- Whale trade: a DEX trade in the top 10% of sizes for this token over 30d (threshold given as whaleMinTradeUsd). Humpback: top 1% with a $1k floor (humpbackMinTradeUsd — if it equals 1000, the token is on that floor). Retail net = all non-whale flow.",
    "- Accum %: whale buy volume / all whale volume. 50 = neutral.",
    "- whaleRetailDivergenceBps: (whaleNet - retailNet) / marketCap in basis points. Negative = retail net-buying more than whales.",
    "- whaleVolSharePct: whale trades as % of all 7d volume - how much whale flow dominates.",
    "- Top10 %: share of 30d transactions from the 10 most active wallets.",
    "",
    "DATA:",
    JSON.stringify(payload, null, 2),
    "",
    "TASK: Write a report in this structure:",
    "1. HEADLINE - one sentence on the overall state.",
    "2. THE NUMBERS - walk the key metrics, plain language, note what's strong/weak.",
    "3. WHALE STORY - read the whale/humpback/retail flows together. Who is doing what?",
    "4. BEST GUESS - your single most probable interpretation of what is happening with this token right now, stated plainly, with a confidence level (low/medium/high) and what evidence would change your mind.",
    "5. WATCH NEXT - 2-3 specific metrics to watch and what movement in them would mean.",
    "Keep it under 400 words. Be honest about ambiguity - do not spin negative data. This is community information, not financial advice, and should say so in one closing line.",
  ].join("\n");
}

/** Compact fingerprint so we only regenerate when scores meaningfully change. */
export function analysisFingerprint(d, scoresLastUpdated) {
  if (!d) return "empty";
  const parts = [
    scoresLastUpdated || "",
    d.read, d.signal, d.signalNote, d.Prof,
    d.Opp, d.Mom, d.Sus,
    d["Whale Net 7d"], d["Retail Net 7d"], d["Accum %"], d["Divergence Bps"],
  ];
  return parts.map((x) => (x == null ? "" : String(x))).join("|");
}
