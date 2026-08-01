/** Curated product / methodology notes for About → Changelog.
 *  Newest first. Not every deploy — focus on methodology, data integrity, and user-visible fixes.
 */

export const CHANGELOG = [
  {
    date: "2026-07-31",
    title: "ClawdWire — WoW, retention, heat (Chunk F)",
    bullets: [
      "Adds Vol/Tx/User growth % and retention vs the prior 7d week, plus median/P90 trade size, heat % (1h/6h of 24h vol), flippers, and whale persistence.",
      "Still one 30d CLAWD trade scan — no new table family.",
      "Re-paste docs/dune-CLAWDWIRE-paste-this.sql into Dune 8180604 after deploy.",
    ],
  },
  {
    date: "2026-07-31",
    title: "ClawdWire — wallet lens + intensity (Chunk E)",
    bullets: [
      "Top 5 buyers/sellers 24h now include wallet, $, tx count, net, and biggest-trade tx — with Basescan links.",
      "Also: top net accumulators, biggest single prints, Vol/Tx, Txs/Trader, buyers/sellers + 1st buy/sell 30d.",
      "Re-paste docs/dune-CLAWDWIRE-paste-this.sql into Dune 8180604 after deploy.",
    ],
  },
  {
    date: "2026-07-26",
    title: "ClawdWire — stickiness + top takers (Chunk D)",
    bullets: [
      "Adds 7d wallets/txs, vol 24h/7d/30d, traders new vs returning, 1st buyers/sellers, buy/sell ratios, and top-3 takers 24h.",
      "Still one 30d CLAWD trade scan — 1st buy/sell means first within that window, not all-time.",
      "Re-paste docs/dune-CLAWDWIRE-paste-this.sql into Dune 8180604 after deploy.",
    ],
  },
  {
    date: "2026-07-31",
    title: "ClawdWire — whale / hump / retail (Chunk C)",
    bullets: [
      "Live whale, humpback, and retail nets for 24h and 7d — same percentile tiers as the main dashboard (30d CLAWD trade scan).",
      "Includes accum %, whale vol %, buyer/seller counts, thresholds, and W/R divergence bps vs market cap.",
      "Re-paste docs/dune-CLAWDWIRE-paste-this.sql into Dune 8180604 (expect a higher execute than the 24h-only pulse).",
    ],
  },
  {
    date: "2026-07-31",
    title: "ClawdWire — scores overlay + 24h money stack",
    bullets: [
      "Shows Tripwire Opp/Mom/Sus, quality/risk, profile/signal from the shared snapshot (no extra Dune).",
      "Pulse query widened to 24h DEX: buy/sell/net $, buyers/sellers, buy-vol %, max trade, plus ≥$1k size prints.",
      "Re-paste docs/dune-CLAWDWIRE-paste-this.sql into Dune 8180604 after deploy.",
    ],
  },
  {
    date: "2026-07-31",
    title: "ClawdWire — auto-sync + CLAWD dashboard UI",
    bullets: [
      "ClawdWire loads the latest Dune result automatically (and every ~45s / on tab focus) — run the query on Dune and the page picks it up without pressing Trip.",
      "Trip ClawdWire still forces a fresh execute; Sync latest re-reads without re-running.",
      "Single-token UI: hero, net $ cards, and windowed stat grids instead of a wide table.",
    ],
  },
  {
    date: "2026-07-31",
    title: "ClawdWire — richer CLAWD pulse",
    bullets: [
      "Added 15m buy/sell/net $, unique buyers/sellers (1h/6h), and max trade $ (15m/1h/6h) on the same 6h DEX scan.",
      "Re-paste docs/dune-CLAWDWIRE-paste-this.sql into Dune query 8180604 to pick up the new columns.",
    ],
  },
  {
    date: "2026-07-31",
    title: "ClawdWire — CLAWD-only lab tab",
    bullets: [
      "New ClawdWire tab runs a one-token Dune pulse (wallets/txs + 1h/6h buy/sell/net USD) so flow metrics can be cost-tested before widening The Wire.",
      "Paste docs/dune-CLAWDWIRE-paste-this.sql into a new Dune query, then set CLAWD_WIRE_QUERY_ID in Vercel.",
    ],
  },
  {
    date: "2026-07-31",
    title: "Admin — prices refresh no longer burns Dune credits",
    bullets: [
      "Refresh prices updates CoinGecko/Dex on the existing snapshot (0 Dune Result Reads).",
      "Pull Dune is the separate action that downloads latest query results (~2 credits) — use after a new Dune run.",
      "Banner: on-chain scores stay the hero clock; CoinGecko prices are a small subtitle.",
    ],
  },
  {
    date: "2026-07-31",
    title: "The Wire — lean 24h pulse query",
    bullets: [
      "Dropped first-time wallets / new buyers / new sellers (those forced a 90d + dex.trades scan).",
      "Pulse is now wallets + txs for 15m / 1h / 6h / 24h from a single 24h base.transactions scan.",
      "Contract list synced to lib/tokens.js (removed AI Rig Complex, Atlas, Politics, airgap.finance, Fabric Protocol; fixed LYRA address).",
    ],
  },
  {
    date: "2026-07-31",
    title: "The Wire — tester-only while under construction",
    bullets: [
      "The Wire pulse UI is back for a single tester wallet; everyone else still sees under construction (team testing).",
      "Start/status APIs reject non-tester wallets.",
    ],
  },
  {
    date: "2026-07-31",
    title: "Methodology — Movers ranking (size + divergence)",
    bullets: [
      "Activity swings: 7d growth is weighted by real volume and soft-damped by market cap; 24h/30d use turnover vs mcap with minimum volume floors — empty % spikes no longer win by default.",
      "Whale flow: ranked by net vs market cap, W/R Div boost, whale–retail sign disagreement, and buyer/seller breadth — not raw mega-cap dollar prints alone.",
      "Short method note on the Movers page; fuller write-up under About → Movers.",
    ],
  },
  {
    date: "2026-07-31",
    title: "Data integrity — admin, dashboard, and banner alignment",
    bullets: [
      "Admin Refresh, the public dashboard, and “Scores last updated” now share one Upstash snapshot of rows + Dune time.",
      "Admin Refresh publishes that snapshot; the site no longer silently rebuilds a different copy while admin holds fresher numbers.",
      "Banner clock stays tied to the table on the page; it reloads when a newer snapshot is published.",
    ],
  },
  {
    date: "2026-07-31",
    title: "Bugfix — Project names and Signals blanking as dashes",
    bullets: [
      "formatValue treated non-numeric strings as invalid (NaN), so Project names and most Signal labels rendered as “—”.",
      "String columns (no numeric format) pass through again; Absorbed + whales in/out badges were never the only visible signals by design.",
    ],
  },
  {
    date: "2026-07-31",
    title: "Correction — LienFi ticker",
    bullets: [
      "Catalog ticker corrected from LIEN to LFI for contract 0x3722264a…A8ABA3 (same Base token; on-chain symbol is LFI).",
    ],
  },
  {
    date: "2026-07-30",
    title: "Methodology — whale share-card breakdown",
    bullets: [
      "Whale / All share cards nest mega-trades and other large-wallet nets under large-wallet net so the two children visibly sum to the hero (tiers can offset).",
      "Forecast v1 beta moved behind admin unlock and off public nav.",
    ],
  },
  {
    date: "2026-07-30",
    title: "Mobile UX",
    bullets: [
      "Touch: tap header to sort; long-press or ⓘ for column definitions; peer-rank expand on tap.",
      "More menu portals correctly; Compact densifies type; sticky Project/actions on tablet widths; phone Overview triage strip.",
    ],
  },
  {
    date: "2026-07-29",
    title: "Methodology — Hump Min $ and share timestamps",
    bullets: [
      "Hump Min $ exposed so cards can distinguish the $1,000 definition floor from a higher live top-1% bar.",
      "Admin share copies stamped with Dune query snapshot time; outsider-plain dollar/count labels on cards.",
    ],
  },
  {
    date: "2026-07-28",
    title: "Methodology — windows, twins, and Movers framing",
    bullets: [
      "24h twins wired alongside 7d/30d; period and Flow/Context toggles to shrink wide tables; every metric window labeled on the column.",
      "Movers reframed as on-chain swings / whale flow — not a heating/cooling price board.",
    ],
  },
];
