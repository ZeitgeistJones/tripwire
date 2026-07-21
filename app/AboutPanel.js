const GLOSSARY_ROWS = [
  ["O Rk / M Rk / S Rk", "Rank by Opportunity / Momentum / Sustainability score, across all tracked tokens"],
  ["Opp / Mom / Sus", "The three core behavioral scores — see scoring section above"],
  ["Prof", "Profile category — Breakout / Quick Mover / Slow Burner / Cold — based on position relative to cohort median"],
  ["Qlty %", "Activity Quality % — starts at 100, penalised for bot-like patterns, high concentration, or unrealistic retention"],
  ["Risk %", "Volume Concentration Risk % — how concentrated trading volume is in a few wallets"],
  ["Vol (30d)", "Total DEX trading volume in USD over the last 30 days, from dex.trades on Base"],
  ["Vol/Tx (30d)", "Average dollar value per transaction over 30 days"],
  ["Vol/Wlt (30d)", "Average dollar volume per unique wallet over 30 days"],
  ["Vol Grw % (WoW)", "DEX volume change: most recent 7 days vs the 7 days before that"],
  ["Tx Grw % (WoW)", "Transaction count change: most recent 7 days vs the 7 days before that"],
  ["User Grw % (WoW)", "Unique wallet count change: most recent 7 days vs the 7 days before that"],
  ["Txs (30d) / Txs (7d)", "Total on-chain transaction count to this token's contract"],
  ["Txs/User (30d)", "Average transactions per unique wallet over 30 days"],
  ["Wallets (30d) / Wallets (7d)", "Unique wallets that sent at least one transaction to this token's contract"],
  ["New Wallets (30d)", "Wallets active in the last 30 days with no activity in the prior 31–90 day window"],
  ["Returning Wallets (30d)", "Wallets active in both the last 30 days and the prior 31–90 day window"],
  ["New Wallet % (30d)", "New Wallets ÷ total Wallets 30d"],
  ["Retention % (WoW)", "Wallets retained from last week ÷ this week's active wallets"],
  ["Avg Txs Ret (7d)", "Average transactions by wallets active both this week and last week"],
  ["Traders (30d)", "Unique wallets that bought or sold on DEX in the last 30 days"],
  ["Buyers (30d) / Buyers (7d)", "Unique wallets that bought this token on a DEX in the window"],
  ["1st Buyers (30d) / (7d)", "Wallets whose first buy in a longer lookback landed in that window — not the same as all buyers"],
  ["1st Sellers (30d) / (7d)", "Wallets whose first sell in a longer lookback landed in that window"],
  ["Buy/Sell Ratio (7d)", "Buyers 7d ÷ unique sellers this week. Above 1.0 means more buying wallets than selling"],
  ["Whale Net (7d)", "Net USD from large trades in the last 7 days (buys minus sells). Positive = whales accumulating"],
  ["Accum %", "Whale buys as a share of all whale volume (7d). ~50% neutral; higher suggests accumulation"],
  ["Whale Buyers / Sellers (7d)", "Distinct wallets making top-decile-sized buys or sells in the last 7 days"],
  ["Non-Trade New (30d)", "New wallets with no first buy or sell — likely airdrop/transfer. New − 1st Buyers − 1st Sellers, floored at 0"],
  ["Top10 % (30d)", "Share of 30-day transactions from the top 10 most active wallets. Lower is healthier"],
  ["Age (days)", "Days since this token's contract was first deployed on Base"],
  ["Price / Market Cap", "Live from CoinGecko when available; DexScreener fallback marked with *"],
  ["Signal / Signal Score", "Price vs volume agreement this week — see Signal section above"],
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
          <strong style={{ color: "var(--text)" }}>30d vs 7d windows</strong> — counts use 30d for
          stability. Growth metrics compare the most recent 7 days vs the 7 days before that.
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Wallets vs Traders</strong> — Wallets = any contract
          interaction (<code>base.transactions</code>). Traders = DEX buys/sells only (<code>dex.trades</code>).
        </p>
        <p style={{ color: "var(--text-muted)" }}>
          <strong style={{ color: "var(--text)" }}>Whale trade</strong> — a trade in the top 10% of that
          token&apos;s own 30d trade sizes (minimum $100). Scales per token instead of one fixed dollar cutoff.
        </p>

        <h3 style={{ color: "var(--text)" }}>Whale &amp; Accumulation</h3>
        <p style={{ color: "var(--text-muted)" }}>
          Shown on <strong style={{ color: "var(--text)" }}>Buyers &amp; Risk</strong>. Large trades over
          the last 7 days:
        </p>
        <ul style={{ paddingLeft: "20px", color: "var(--text-muted)" }}>
          <li><strong style={{ color: "var(--text)" }}>Whale Net (7d)</strong> — whale buy USD minus whale sell USD</li>
          <li><strong style={{ color: "var(--text)" }}>Accum %</strong> — whale buys ÷ (whale buys + whale sells). ~50% is neutral</li>
          <li><strong style={{ color: "var(--text)" }}>Whale Buyers / Sellers (7d)</strong> — distinct wallets making those large trades</li>
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
          No real money. Each starts at $100, holds 10 tokens equal-weight, marks to market continuously,
          and rebalances about every 24 hours (sell dropouts, buy new picks, reinvest full value).
        </p>
        <ul style={{ paddingLeft: "20px", color: "var(--text-muted)" }}>
          <li><strong style={{ color: "var(--text)" }}>Momentum Hunt</strong> — signal + volume/user growth</li>
          <li><strong style={{ color: "var(--text)" }}>Sticky Flow</strong> — retention, sustainability, quality, whales</li>
          <li><strong style={{ color: "var(--text)" }}>Breakout Bias</strong> — Opp / Mom / Sus + Breakout / whale boost</li>
          <li><strong style={{ color: "var(--text)" }}>Top 10 Mcap</strong> — baseline: largest market caps only</li>
        </ul>
        <p style={{ color: "var(--text-muted)" }}>
          Formulas live in <code>lib/predictions.js</code> and are meant to be swappable. Track record
          needs time — early days will show ~0% right after a rebalance. Experiment only.
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
          <li><strong style={{ color: "var(--text)" }}>Forecast</strong> — v1 beta paper-portfolio race (3 formulas + mcap baseline)</li>
          <li><strong style={{ color: "var(--text)" }}>Overview</strong> — scores, profile, price, signal</li>
          <li><strong style={{ color: "var(--text)" }}>Activity</strong> — volume and transaction detail</li>
          <li><strong style={{ color: "var(--text)" }}>Wallets</strong> — wallet counts, growth, retention</li>
          <li><strong style={{ color: "var(--text)" }}>Buyers &amp; Risk</strong> — buyers/sellers, whales, concentration, quality</li>
          <li><strong style={{ color: "var(--text)" }}>Discover</strong> — CoinGecko AI-category candidates not yet tracked</li>
          <li><strong style={{ color: "var(--text)" }}>Watchlist</strong> — saved tokens (wallet-gated)</li>
          <li><strong style={{ color: "var(--text)" }}>CLAWD</strong> — deep health check for CLAWD</li>
          <li><strong style={{ color: "var(--text)" }}>The Wire</strong> — on-demand pulse across tracked tokens</li>
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
