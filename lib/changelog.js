/** Plain-language product notes for About → Changelog.
 *  Newest first. Skip deploy noise — what a holder would actually notice.
 */

export const CHANGELOG = [
  {
    date: "2026-08-02",
    title: "Board is open — Trip still needs 10M CLAWD",
    bullets: [
      "Snapshot, CLAWD, Movers, and cached ClawdWire pulses are public — no wallet required to look.",
      "Only Trip ClawdWire (fresh Dune run) still needs a wallet holding 10M+ CLAWD.",
      "Watchlist just needs any connected wallet to save stars.",
    ],
  },
  {
    date: "2026-08-02",
    title: "ClawdWire feels like a live dashboard",
    bullets: [
      "Opening Tripwire lands on ClawdWire first — the live “what’s happening now” view.",
      "Big number up top is buy money minus sell money. Tabs underneath cover flow, who’s trading, when it spiked, and trade shape.",
      "Clock times (peak hour, charts) use your timezone, not UTC.",
      "You can Trip the same coin again after 5 minutes (was 15).",
      "Price and market cap refresh from CoinGecko when a pulse finishes — one coin at a time so we don’t burn API credits.",
      "Pick a look in the header (Bone is the default). Tables stretch across the screen.",
    ],
  },
  {
    date: "2026-08-01",
    title: "See who bought the rip and who sold the dump",
    bullets: [
      "Lists of top buyers and sellers with links to Basescan.",
      "Shows which hour price peaked and what money did before, during, and after.",
      "“Round-trip” / trade-shape stuff is a research guess about odd trading patterns — not a call-out that someone is cheating.",
      "Profit/loss style numbers are for curiosity only — not for taxes.",
      "Trip ClawdWire (fresh Dune run) needs 10M+ CLAWD; browsing cached pulses does not.",
    ],
  },
  {
    date: "2026-07-31",
    title: "Live pulse for any tracked coin",
    bullets: [
      "ClawdWire works on every token Tripwire already tracks, not just CLAWD.",
      "Sync reads a free cached result. Trip pays for a fresh on-chain pull.",
      "You can see big wallets vs everyone else, and whether they’re leaning opposite ways.",
      "Admin can refresh prices without spending Dune credits; Pull Dune is the step after you re-run the big query.",
      "The score clock on Snapshot/Movers matches what admin published — one shared copy of the data.",
    ],
  },
  {
    date: "2026-07-31",
    title: "Movers got smarter (and a name bug got fixed)",
    bullets: [
      "Activity lists don’t crown tiny coins just because their % move looks huge on empty volume.",
      "Whale lists weigh size vs market cap and whether whales disagree with retail — not who printed the biggest raw dollar number.",
      "Fixed names and signal labels showing as “—” by mistake.",
    ],
  },
  {
    date: "2026-07-30",
    title: "Phone-friendly + clearer share cards",
    bullets: [
      "On phones: tap a header to sort, long-press for what a column means, Compact packs more on screen.",
      "Share cards break “large wallet” flow into mega trades vs the rest so the pieces add up to the headline.",
      "You can see whether the mega-whale bar is stuck at the $1,000 floor or sitting higher for that coin.",
    ],
  },
  {
    date: "2026-07-28",
    title: "Clearer time windows",
    bullets: [
      "Same metrics for 24 hours, 7 days, and 30 days where it matters — pick the window with the toggle.",
      "Every column says which window it uses so you’re not guessing.",
      "Movers is “who’s moving on-chain,” not a price heat map.",
    ],
  },
];
