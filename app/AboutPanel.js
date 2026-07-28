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
  ["1st Buyers · 24h / 7d / 30d", "Wallets whose first buy in a longer lookback landed in that window — not the same as all buyers"],
  ["1st Sellers · 24h / 7d / 30d", "Wallets whose first sell in a longer lookback landed in that window"],
  ["Buy/Sell Ratio · 24h / 7d", "Buyers ÷ unique sellers in that window. Above 1.0 means more buying wallets than selling"],
  ["Buy Vol % · 24h / 7d", "Buys as a share of dollar volume — money-weighted complement to Buy/Sell Ratio"],
  ["Whale Net · 24h / 7d", "Net USD from large trades (buys minus sells). Positive = whales accumulating"],
  ["Accum % · 24h / 7d", "Whale buys as a share of all whale volume. ~50% neutral; higher suggests accumulation"],
  ["Whale Buyers / Sellers · 24h / 7d", "Distinct wallets making top-decile-sized buys or sells"],
  ["Humpback Net / Buyers / Sellers · 24h / 7d", "Same idea as whales, but top 1% of trade sizes (min $1,000) — the mega-whale subset"],
  ["Retail Net · 24h / 7d", "Net USD from all non-whale trades. Read it against Whale Net"],
  ["Whale Vol % · 24h / 7d", "Whale trades as a share of all volume in that window — how much whale flow actually matters"],
  ["Whale Min $ · 30d thr", "This token's whale threshold — top-10% trade size over 30d (min $100). Scales per token"],
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
          Price, Market Cap, Signal, Movers, and Forecast sit alongside as separate layers.
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
          token&apos;s own 30d trade sizes (minimum $100). <strong style={{ color: "var(--text)" }}>Humpback</strong> =
          top 1% (minimum $1,000), a subset of whale. Scales per token instead of one fixed dollar cutoff.
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
          The homepage (<strong style={{ color: "var(--text)" }}>Movers</strong> tab). Surfaces tokens that
          are heating up or cooling off using signal score, opportunity, volume/user growth, retention,
          and whale flow — explained in plain English. Not a ranked buy list; a quick read of what&apos;s
          moving on-chain right now.
        </p>

        <h3 style={{ color: "var(--text)" }}>Forecast <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--read-amber-text)", background: "var(--read-amber-bg)", padding: "2px 7px", borderRadius: "999px", marginLeft: "6px" }}>v1 beta</span></h3>
        <p style={{ color: "var(--text-muted)" }}>
          Four ongoing <strong style={{ color: "var(--text)" }}>paper portfolios</strong> race each other.
          No real money. Each starts at $100 with up to 10 holdings. Prices mark to market on every visit;
          the book only <em>trades</em> when Dune behavioral data refreshes (72h backstop if data is stale).
          Formulas live in <code>lib/predictions.js</code> — swap a <code>scoreFn</code>, keep the same{" "}
          <code>id</code>, bump <code>version</code> to mark an era without wiping history.
        </p>
        <ul style={{ paddingLeft: "20px", color: "var(--text-muted)" }}>
          <li>
            <strong style={{ color: "var(--text)" }}>Momentum Hunt</strong> — signal + vol/user/tx growth.
            Skips tokens with Qlty % below 60.
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Sticky Flow</strong> — retention, Sus, quality,
            Accum %, repeat-wallet activity (slow book).
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Whale Shadow</strong> — whale net flow scaled by
            market cap, Accum %, buy/sell breadth, Vol/Wlt.
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Top 10 Mcap</strong> — baseline: equal-weight the
            10 largest market caps. The do-nothing strategy the formulas must beat.
          </li>
        </ul>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Rules (all strategies)</strong>
        </p>
        <ul style={{ paddingLeft: "20px", color: "var(--text-muted)" }}>
          <li>
            <strong style={{ color: "var(--text)" }}>Liquidity gate</strong> — must have a live price and
            Vol 30d ≥ $25k
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Sizing</strong> — formulas use score-proportional
            weights (floor 5%, cap 20% per name). Baseline is pure equal weight (10% each)
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Hysteresis</strong> — sell only if a name falls
            below rank 15 in that strategy (or fails a gate). Resize a kept name only if weight drifted
            more than 3 points from target
          </li>
          <li>
            <strong style={{ color: "var(--text)" }}>Friction</strong> — 1% fee on traded notional
            (buys and sells), baseline included, so churn has a cost
          </li>
        </ul>
        <p style={{ color: "var(--text-muted)" }}>
          Example: if Momentum&apos;s book is worth $112 and it sells $20 notional / buys $20 notional
          into new names, fees ≈ <code>0.01 × $40 = $0.40</code>, taken from cash before the new
          weights are filled. Experiment only — not advice.
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
          <li><strong style={{ color: "var(--text)" }}>Movers</strong> — homepage: heating up / cooling off, plain English</li>
          <li><strong style={{ color: "var(--text)" }}>Forecast</strong> — v1 beta paper race: Momentum Hunt, Sticky Flow, Whale Shadow vs Top 10 Mcap</li>
          <li><strong style={{ color: "var(--text)" }}>Overview</strong> — scores, profile, price, signal</li>
          <li><strong style={{ color: "var(--text)" }}>Activity</strong> — volume and transaction twins (<code>24h | 7d | 30d</code>)</li>
          <li><strong style={{ color: "var(--text)" }}>Wallets</strong> — wallet counts by period; New/Returning on 30d</li>
          <li><strong style={{ color: "var(--text)" }}>Buyers</strong> — traders, buyers/sellers, first buyers/sellers, buy/sell ratio, Buy Vol %</li>
          <li><strong style={{ color: "var(--text)" }}>Growth</strong> — WoW rates: Vol/Tx/User Grw %, Retention %, Signal</li>
          <li><strong style={{ color: "var(--text)" }}>Whales &amp; Risk</strong> — Flow (<code>24h | 7d</code>) + Context (threshold, concentration, scores, age)</li>
          <li><strong style={{ color: "var(--text)" }}>Discover</strong> — CoinGecko AI-category candidates not yet tracked</li>
          <li><strong style={{ color: "var(--text)" }}>Watchlist</strong> — saved tokens (wallet-gated)</li>
          <li><strong style={{ color: "var(--text)" }}>CLAWD</strong> — deep health check for CLAWD</li>
          <li><strong style={{ color: "var(--text)" }}>The Wire</strong> — on-demand pulse across tracked tokens (temporarily under construction)</li>
          <li><strong style={{ color: "var(--text)" }}>About</strong> — this page</li>
        </ul>

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
