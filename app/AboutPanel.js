"use client";

import { useState } from "react";
import { CHANGELOG } from "@/lib/changelog";

const GLOSSARY_ROWS = [
  ["Window tokens", "24h = trailing day · 7d = trailing week · 30d = trailing month · WoW = this 7d vs prior 7d · live = CoinGecko now · score = composite Tripwire score (not a calendar window) · 30d thr = whale size threshold from 30d trade distribution"],
  ["O Rk / M Rk / S Rk", "Rank by Opportunity / Momentum / Sustainability score, across all tracked tokens"],
  ["Opp / Mom / Sus · score", "The three core behavioral scores — see scoring section above"],
  ["Prof · score", "Profile category — Breakout / Quick Mover / Slow Burner / Cold — based on position relative to cohort median"],
  ["Qlty % · score", "Activity Quality % — starts at 100, penalised for bot-like patterns, high concentration, or unrealistic retention"],
  ["Risk % · score", "Volume Concentration Risk % — how concentrated trading volume is in a few wallets"],
  ["Vol · 24h / 7d / 30d", "Total DEX trading volume in USD for the window shown under the column header"],
  ["Vol/Tx · 24h / 7d / 30d", "Average dollar value per transaction for that window"],
  ["Vol/Wlt · 24h / 7d / 30d", "Average dollar volume per unique wallet for that window"],
  ["Vol Grw % · WoW", "DEX volume change: most recent 7 days vs the 7 days before that"],
  ["Tx Grw % · WoW", "Transaction count change: most recent 7 days vs the 7 days before that"],
  ["User Grw % · WoW", "Unique wallet count change: most recent 7 days vs the 7 days before that"],
  ["Txs · 24h / 7d / 30d", "Total on-chain transaction count to this token's contract"],
  ["Txs/User · 24h / 7d / 30d", "Average transactions per unique wallet for that window"],
  ["Wallets · 24h / 7d / 30d", "Unique wallets that sent at least one transaction to this token's contract"],
  ["New Wallets · 30d", "Wallets active in the last 30 days with no activity in the prior 31–90 day window"],
  ["Returning · 30d", "Wallets active in both the last 30 days and the prior 31–90 day window"],
  ["New Wallet % · 30d", "New Wallets ÷ total Wallets 30d"],
  ["Retention % · WoW", "Wallets retained from last week ÷ this week's active wallets"],
  ["Avg Txs Ret · 7d", "Average transactions by wallets active both this week and last week"],
  ["Traders · 30d", "Unique wallets that bought or sold on DEX in the last 30 days"],
  ["Buyers · 24h / 7d / 30d", "Unique wallets that bought this token on a DEX in the window"],
  ["1st Buyers · 24h / 7d / 30d", "New buyers in that window — wallets that bought this token for the first time (in our 90-day scan) during the last 24h / 7d / 30d. Different from Buyers, which also counts people who bought before. Not lifetime first buy"],
  ["1st Sellers · 24h / 7d / 30d", "New sellers in that window — wallets that sold this token for the first time (in our 90-day scan) during the last 24h / 7d / 30d. Different from all sellers. Not lifetime first sell"],
  ["Survive · 1h / 1d / 3d / 7d (ClawdWire)", "Of wallets whose first buy in the last 30 days is old enough to measure: share that still hadn't sold by that horizon. Cohort size = those new-in-30d buyers — not first buy ever"],
  ["Buy/Sell Ratio · 24h / 7d", "Buyers ÷ unique sellers in that window. Above 1.0 means more buying wallets than selling"],
  ["Buy Vol % · 24h / 7d", "Buys as a share of dollar volume — money-weighted complement to Buy/Sell Ratio"],
  ["Whale Net · 24h / 7d", "Net USD from large trades (buys minus sells). Positive = whales accumulating"],
  ["Accum % · 24h / 7d", "Whale buys as a share of all whale volume. ~50% neutral; higher suggests accumulation"],
  ["Whale Buyers / Sellers · 24h / 7d", "Distinct wallets making top-decile-sized buys or sells"],
  ["Mega Whale Net / Buyers / Sellers · 24h / 7d", "Same idea as whales, but top 1% of trade sizes (min $1,000) — the mega-whale subset"],
  ["Retail Net · 24h / 7d", "Net USD from all non-whale trades. Read it against Whale Net"],
  ["Whale Vol % · 24h / 7d", "Whale trades as a share of all volume in that window — how much whale flow actually matters"],
  ["Whale Min $ · 30d thr", "This token's whale threshold — top-10% trade size over 30d (min $100). Scales per token"],
  ["Mega Min $ · 30d thr", "This token's mega-whale threshold — top-1% over 30d, floored at $1,000. $1,000 means sitting on the floor; higher = live p99"],
  ["W/R Div (bps) · 24h / 7d", "(Whale Net − Retail Net) ÷ Market Cap × 10,000. Positive = whales lean harder than retail"],
  ["Non-Trade New · 30d", "New wallets with no first buy or sell — likely airdrop/transfer. New − 1st Buyers − 1st Sellers, floored at 0"],
  ["Top10 % · 30d", "Share of 30-day transactions from the top 10 most active wallets. Lower is healthier"],
  ["Age (days)", "Days since this token's contract was first deployed on Base"],
  ["Price / Market Cap · live", "Live from CoinGecko when available; DexScreener fallback marked with *"],
  ["Signal / Signal Score · WoW", "Price vs volume agreement this week — see Signal section above"],
  ["whales in / whales out", "On Absorbed only: Whale Net ≥ +$250 → whales in; ≤ −$250 → whales out. Disambiguates absorption"],
];

export default function AboutPanel() {
  return (
    <div style={{ display: "flex", gap: "40px", alignItems: "flex-start", flexWrap: "wrap", color: "var(--text)" }}>
      <div style={{ maxWidth: "800px", lineHeight: "1.7", flex: "1 1 500px" }}>
        <h2 style={{ marginTop: 0, color: "var(--text)" }}>About Tripwire</h2>
        <p style={{ color: "var(--text-muted)" }}>
          Tripwire tracks AI agent projects on Base — combining on-chain behavior (wallets, transactions,
          retention, whale flow) from Dune with live price and market cap from CoinGecko (DexScreener
          fallback). Core behavioral scores are deliberately <strong style={{ color: "var(--text)" }}>price-independent</strong>;
          Price, Market Cap, Signal, and Movers sit alongside as separate layers.
          This is an experiment — not financial advice; data may be incomplete.
        </p>

        <h3 style={{ color: "var(--text)" }}>Key Terms</h3>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Unique wallet</strong> — a distinct on-chain address
          that sent at least one transaction to a token&apos;s contract.
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>New / Returning wallet</strong> — new = active in last
          30d with no activity in the prior 31–90d on that token. Returning = active in both windows.
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Window tokens</strong> — every column header shows its window under the name:
          <code>24h</code> trailing day, <code>7d</code> trailing week, <code>30d</code> trailing month, <code>WoW</code> this week vs prior,
          <code>live</code> CoinGecko now, <code>score</code> composite (not a day count),
          <code>30d thr</code> whale-size threshold from 30d trades. Windows are never tooltip-only.
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Period toggle</strong> — Activity, Wallets, and Buyers use{" "}
          <code>24h | 7d | 30d</code> for apples-to-apples twins. Whales Flow uses <code>24h | 7d</code>.
          Growth metrics live on the Growth tab (WoW only — this 7d vs prior 7d).
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Wallets vs Traders</strong> — Wallets = any contract
          interaction (<code>base.transactions</code>). Traders = DEX buys/sells only (<code>dex.trades</code>).
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Whale trade</strong> — a trade in the top 10% of that
          token&apos;s own 30d trade sizes (minimum $100). <strong style={{ color: "var(--text)" }}>Mega whale</strong> =
          top 1% with a <strong style={{ color: "var(--text)" }}>$1,000 minimum</strong> (a subset of whale).{" "}
          <code>Mega Min $</code> shows the live bar — if it&apos;s $1,000 the token is on that floor; if higher, that&apos;s the true top‑1% size.
        </p>

        <h3 style={{ color: "var(--text)" }}>Whale &amp; Accumulation</h3>
        <p style={{ color: "var(--text-muted)" }}>
          Shown on <strong style={{ color: "var(--text)" }}>Whales &amp; Risk</strong>. A trade counts as a
          whale trade if its USD size is in the <strong style={{ color: "var(--text)" }}>top 10%</strong> of
          that token&apos;s own DEX trades over the last 30 days, floored at <strong style={{ color: "var(--text)" }}>$100</strong>.
          Metrics below then use only those whale-sized trades from the last <strong style={{ color: "var(--text)" }}>7 days</strong>.{" "}
          <strong style={{ color: "var(--text)" }}>Retail Net</strong> is the complementary flow — all non-whale
          trades. <strong style={{ color: "var(--text)" }}>Whale Vol %</strong> is how much of 7d volume those whale
          trades represent. Quality, concentration, Non-Trade New, and Age live on the same tab.
        </p>

        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Example — whale threshold (per token)</strong>
        </p>
        <ul style={{ paddingLeft: "20px", color: "var(--text-muted)" }}>
          <li>
            Microcap Token A: 30d trade sizes mostly $20–$80; 90th percentile = $95 → threshold ={" "}
            <code>max($95, $100) = $100</code>. A $120 buy counts; a $60 buy does not.
          </li>
          <li>
            Larger Token B: 90th percentile = $4,200 → threshold = $4,200. A $3,000 buy is{" "}
            <em>not</em> a whale trade here, even though it would be on Token A.
          </li>
        </ul>

        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Example — Whale Net &amp; Accum %</strong>
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          Suppose Token A&apos;s whale-sized trades in the last 7 days are:
        </p>
        <ul style={{ paddingLeft: "20px", color: "var(--text-muted)" }}>
          <li>Buys: $8,000 + $3,500 + $2,000 = <strong style={{ color: "var(--text)" }}>$13,500</strong> whale buy USD</li>
          <li>Sells: $4,000 + $1,500 = <strong style={{ color: "var(--text)" }}>$5,500</strong> whale sell USD</li>
        </ul>
        <ul style={{ paddingLeft: "20px", color: "var(--text-muted)" }}>
          <li>
            <strong style={{ color: "var(--text)" }}>Whale Net (7d)</strong> = buys − sells ={" "}
            <code>$13,500 − $5,500 = +$8,000</code> (net accumulation)
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Accum %</strong> = buys ÷ (buys + sells) ={" "}
            <code>$13,500 ÷ ($13,500 + $5,500) = 71.1%</code> (above ~65% leans accumulation; ~50% is neutral;
            below ~35% leans distribution)
          </li>
          <li>
            If those buys came from 2 wallets and sells from 1 wallet →{" "}
            <strong style={{ color: "var(--text)" }}>Whale Buyers (7d) = 2</strong>,{" "}
            <strong style={{ color: "var(--text)" }}>Whale Sellers (7d) = 1</strong>
          </li>
        </ul>
        <p style={{ color: "var(--text-muted)" }}>
          Flip the flows ($5,500 buys, $13,500 sells) → Whale Net ={" "}
          <code>−$8,000</code>, Accum % = <code>29.0%</code> (distribution).
        </p>

        <h3 style={{ color: "var(--text)" }}>Whale vs Retail reads</h3>
        <p style={{ color: "var(--text-muted)" }}>
          These columns exist so you can see whether big size and everyone else are on the same side.
          Always check <strong style={{ color: "var(--text)" }}>Whale Vol %</strong> before trusting a divergence:
        </p>
        <ul style={{ paddingLeft: "20px", color: "var(--text-muted)" }}>
          <li>
            <strong style={{ color: "var(--text)" }}>Whale Net + / Retail Net −</strong> — whales accumulating
            from weak hands (classically bullish when the split is real).
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Whale Net − / Retail Net +</strong> — distribution into
            retail buying (exit-liquidity pattern).
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Whale Vol % ~80%+</strong> — “retail” is a handful of small
            trades; the divergence read doesn&apos;t mean much.
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Whale Vol % ~30%</strong> — whale and retail are both
            meaningful; a split can mean two different crowds disagreeing.
          </li>
        </ul>

        <h3 style={{ color: "var(--text)" }}>W/R Div (bps)</h3>
        <p style={{ color: "var(--text-muted)" }}>
          Computed on the site (no Dune change):{" "}
          <code>(Whale Net − Retail Net) ÷ Market Cap × 10,000</code>. Scales the split by market cap so
          microcaps and large caps are comparable. Shown on <strong style={{ color: "var(--text)" }}>Whales &amp; Risk</strong> and CLAWD.
        </p>
        <ul style={{ paddingLeft: "20px", color: "var(--text-muted)" }}>
          <li><strong style={{ color: "var(--text)" }}>+500</strong> — whales net-bought ~0.05% of mcap more than retail — strong accumulation divergence</li>
          <li><strong style={{ color: "var(--text)" }}>+50</strong> — slight whale lean — not actionable alone</li>
          <li><strong style={{ color: "var(--text)" }}>~0</strong> — whales and retail agree — no divergence signal</li>
          <li><strong style={{ color: "var(--text)" }}>−200</strong> — retail net-buying ~0.02% of mcap more than whales — whales stepping back while retail pushes in</li>
          <li><strong style={{ color: "var(--text)" }}>−1000+</strong> — hard divergence — whales dumping while retail absorbs (classic exit-liquidity pattern)</li>
        </ul>

        <h3 style={{ color: "var(--text)" }}>Movers</h3>
        <p style={{ color: "var(--text-muted)" }}>
          The homepage (<strong style={{ color: "var(--text)" }}>Movers</strong> tab). Two short lists —
          Activity swings and Whale flow — for 24h / 7d / 30d. Not a price board and not “heating up”:
          a spike can be a dip bid, an exit, or noise. Second look, not a call.
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Activity</strong> — on 7d, week-over-week % moves in
          volume / wallets / txs, multiplied by real 7d volume credibility and soft-damped by market cap
          so empty microcap % spikes don’t dominate. On 24h / 30d, turnover-aware (volume vs mcap when
          known) plus txs and wallets, with a minimum absolute volume floor.
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Whale flow</strong> — dollar gate first, then rank by
          whale net as basis points of market cap, plus{" "}
          <strong style={{ color: "var(--text)" }}>W/R Div</strong> (whale-vs-retail divergence) and a
          boost when whales and retail disagree in sign, plus a small breadth crumb (distinct large
          buyers/sellers). Raw mega-cap dollar flow without relative size or disagreement ranks lower.
          30d whale list still uses the 7d flow twin.
        </p>
        <h3 style={{ color: "var(--text)" }}>The Three Core Scores</h3>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Momentum</strong> — growth-first (new wallets, WoW growth,
          retention, vol density).{" "}
          <strong style={{ color: "var(--text)" }}>Sustainability</strong> — same ingredients, retention-weighted.{" "}
          <strong style={{ color: "var(--text)" }}>Opportunity</strong> = (Mom×0.5 + Sus×0.5) × (Qlty÷100) × (1 − Risk÷100).
        </p>

        <h3 style={{ color: "var(--text)" }}>Profile</h3>
        <ul style={{ paddingLeft: "20px", color: "var(--text-muted)" }}>
          <li><strong style={{ color: "var(--text)" }}>Breakout</strong> — above median Mom and Sus</li>
          <li><strong style={{ color: "var(--text)" }}>Quick Mover</strong> — high Mom, low Sus</li>
          <li><strong style={{ color: "var(--text)" }}>Slow Burner</strong> — low Mom, high Sus</li>
          <li><strong style={{ color: "var(--text)" }}>Cold</strong> — below median on both</li>
        </ul>

        <h3 style={{ color: "var(--text)" }}>Signal &amp; Read</h3>
        <p style={{ color: "var(--text-muted)" }}>
          Signal compares volume growth vs price change: Confirmed Growth, Absorbed, Thin Rally, Cooling.
          <strong style={{ color: "var(--text)" }}> Read</strong> is the named verdict for Profile + Signal
          (e.g. Beacon, Flare, Flatline).
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Absorbed</strong> alone is ambiguous — volume up while price
          is flat/down could be accumulation or quiet dumping. When{" "}
          <strong style={{ color: "var(--text)" }}>Whale Net (7d)</strong> is at least ±$250, Overview shows a
          badge next to Absorbed:{" "}
          <strong style={{ color: "var(--text)" }}>whales in</strong> (net whale buying — leans genuine
          accumulation) or <strong style={{ color: "var(--text)" }}>whales out</strong> (net whale selling —
          possible distribution disguised as activity).
        </p>

        <h3 style={{ color: "var(--text)" }}>Column Glossary</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
          {GLOSSARY_ROWS.map(([term, def]) => (
            <div key={term} style={{ fontSize: "13px", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--text)" }}>{term}</strong>
              <span style={{ color: "var(--text-muted)" }}> — {def}</span>
            </div>
          ))}
        </div>

        <h3 style={{ color: "var(--text)", marginTop: "28px" }}>Tabs</h3>
        <ul style={{ paddingLeft: "20px", color: "var(--text-muted)" }}>
          <li><strong style={{ color: "var(--text)" }}>Movers</strong> — homepage: size-aware activity swings &amp; whale flow (mcap + W/R Div)</li>
          <li><strong style={{ color: "var(--text)" }}>Overview</strong> — scores, profile, price, signal</li>
          <li><strong style={{ color: "var(--text)" }}>Activity</strong> — volume and transaction twins (<code>24h | 7d | 30d</code>)</li>
          <li><strong style={{ color: "var(--text)" }}>Wallets</strong> — wallet counts by period; New/Returning on 30d; Avg Txs Ret on 7d</li>
          <li><strong style={{ color: "var(--text)" }}>Buyers</strong> — traders, buyers/sellers, first buyers/sellers, buy/sell ratio, Buy Vol %</li>
          <li><strong style={{ color: "var(--text)" }}>Growth</strong> — WoW rates: Vol/Tx/User Grw %, Retention %, Signal</li>
          <li><strong style={{ color: "var(--text)" }}>Whales &amp; Risk</strong> — Flow (<code>24h | 7d</code>) + Context (threshold, concentration, scores, age)</li>
          <li><strong style={{ color: "var(--text)" }}>Watchlist</strong> — saved tokens (wallet-gated)</li>
          <li><strong style={{ color: "var(--text)" }}>CLAWD</strong> — CLAWD-only health check from the board snapshot (scores, ranks, trends vs peers)</li>
          <li><strong style={{ color: "var(--text)" }}>ClawdWire</strong> — live on-chain pulse for any tracked Base token (holder-gated Trip); not the same as the CLAWD tab</li>
          <li><strong style={{ color: "var(--text)" }}>The Wire</strong> — on-demand pulse across tracked tokens (under construction; team testing)</li>
          <li><strong style={{ color: "var(--text)" }}>About</strong> — this page</li>
        </ul>

        <ChangelogDropdown />

        <h3 style={{ marginTop: "32px", color: "var(--text)" }}>Thanks</h3>
        <p style={{ color: "var(--text-muted)" }}>
          To the CLAWD community, to clawdbotatg, and to Austin — for lighting the builder fire that turned
          into this. Appreciate it.
        </p>

        <p style={{
          fontSize: "13px",
          color: "var(--text-faint)",
          marginTop: "32px",
          borderTop: "1px solid var(--border)",
          paddingTop: "16px",
        }}>
          Built by a community member. Not affiliated with CLAWD. Not financial advice. Data is best-effort.
          Verify on Basescan. DYOR.
        </p>
      </div>

      <div style={{ flex: "1 1 300px", display: "flex", justifyContent: "center", paddingTop: "8px" }}>
        <img
          src="/clawd-pfp.png"
          alt="CLAWD mascot"
          style={{
            width: "1152px",
            maxWidth: "100%",
            aspectRatio: "1 / 1",
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      </div>
    </div>
  );
}

function ChangelogDropdown() {
  const [open, setOpen] = useState(false);
  const latest = CHANGELOG[0]?.date;

  return (
    <div
      id="changelog"
      style={{
        marginTop: "28px",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        background: "var(--bg-subtle)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          appearance: "none",
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "14px 16px",
          border: "none",
          background: "transparent",
          cursor: "pointer",
          fontFamily: "inherit",
          textAlign: "left",
          color: "var(--text)",
        }}
      >
        <span>
          <strong style={{ fontSize: "14px", letterSpacing: "0.02em" }}>Changelog</strong>
          <span style={{ display: "block", marginTop: "2px", fontSize: "12px", color: "var(--text-faint)" }}>
            What’s new, in plain English{latest ? ` · latest ${latest}` : ""} — tap to expand
          </span>
        </span>
        <span aria-hidden="true" style={{ color: "var(--text-faint)", fontSize: "12px", flexShrink: 0 }}>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div
          style={{
            borderTop: "1px solid var(--border)",
            padding: "14px 16px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "18px",
          }}
        >
          {CHANGELOG.map((entry) => (
            <div key={`${entry.date}-${entry.title}`}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "baseline", marginBottom: "4px" }}>
                <time
                  dateTime={entry.date}
                  style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-faint)", letterSpacing: "0.02em" }}
                >
                  {entry.date}
                </time>
                <strong style={{ color: "var(--text)", fontSize: "14px" }}>{entry.title}</strong>
              </div>
              <ul style={{ margin: 0, paddingLeft: "20px", color: "var(--text-muted)", fontSize: "13px" }}>
                {entry.bullets.map((b) => (
                  <li key={b} style={{ marginBottom: "4px" }}>{b}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
