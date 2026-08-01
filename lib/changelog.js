/** Curated product / methodology notes for About → Changelog.
 *  Newest first. Not every deploy — focus on methodology, data integrity, and user-visible fixes.
 */

export const CHANGELOG = [
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
