-- =============================================================================
-- NOT a standalone query. Do NOT paste this into Dune by itself.
--
-- Assemble like this:
--
--   WITH tracked_tokens AS (
--       ... your existing VALUES list ...
--   ),
--   token_ages (age_address, deployed_at) AS (
--       ... your existing VALUES list ...
--   ),
--   <PASTE EVERYTHING BELOW THIS BANNER — starts at base_tx_30d>
--
-- Keep a COMMA after the closing paren of token_ages, then paste from base_tx_30d.
-- =============================================================================

base_tx_30d AS (
    SELECT *
    FROM base.transactions tx
    WHERE tx.block_time >= now() - interval '30' day
      AND tx.success = true
),
base_tx_14_7 AS (
    SELECT *
    FROM base.transactions tx
    WHERE tx.block_time >= now() - interval '14' day
      AND tx.block_time <  now() - interval '7' day
      AND tx.success = true
),
base_tx_7d AS (
    SELECT *
    FROM base.transactions tx
    WHERE tx.block_time >= now() - interval '7' day
      AND tx.success = true
),
base_tx_24h AS (
    SELECT *
    FROM base.transactions tx
    WHERE tx.block_time >= now() - interval '1' day
      AND tx.success = true
),

-- Pre-filtered dex trades windows (all limited by time)
dex_trades_30d AS (
    SELECT *
    FROM dex.trades dt
    WHERE dt.blockchain = 'base'
      AND dt.block_time >= now() - interval '30' day
),
dex_trades_14_7 AS (
    SELECT *
    FROM dex.trades dt
    WHERE dt.blockchain = 'base'
      AND dt.block_time >= now() - interval '14' day
      AND dt.block_time <  now() - interval '7' day
),
dex_trades_7d AS (
    SELECT *
    FROM dex.trades dt
    WHERE dt.blockchain = 'base'
      AND dt.block_time >= now() - interval '7' day
),
-- 90d window used ONLY for first-buy/first-sell lookback, narrowed to the
-- three columns needed so the scan stays as light as possible
dex_trades_90d AS (
    SELECT dt.taker, dt.block_time, dt.token_bought_address, dt.token_sold_address
    FROM dex.trades dt
    WHERE dt.blockchain = 'base'
      AND dt.block_time >= now() - interval '90' day
),

metrics_30d AS (
    SELECT
        tt.name AS project,
        tt.symbol,
        tt.tag,
        tt.address,
        COUNT(*) AS txs_30d,
        COUNT(DISTINCT tx."from") AS users_30d,
        CAST(COUNT(*) AS DOUBLE) / NULLIF(COUNT(DISTINCT tx."from"), 0) AS avg_txs_per_wallet_30d
    FROM base_tx_30d tx
    INNER JOIN tracked_tokens tt
        ON tx."to" = tt.address
    GROUP BY 1,2,3,4
),

metrics_7d AS (
    SELECT
        tt.name AS project,
        COUNT(*) AS txs_7d,
        COUNT(DISTINCT tx."from") AS users_7d,
        CAST(COUNT(*) AS DOUBLE) / NULLIF(COUNT(DISTINCT tx."from"), 0) AS avg_txs_per_wallet_7d
    FROM base_tx_7d tx
    INNER JOIN tracked_tokens tt
        ON tx."to" = tt.address
    GROUP BY 1
),

metrics_24h AS (
    SELECT
        tt.name AS project,
        COUNT(*) AS txs_24h,
        COUNT(DISTINCT tx."from") AS users_24h,
        CAST(COUNT(*) AS DOUBLE) / NULLIF(COUNT(DISTINCT tx."from"), 0) AS avg_txs_per_wallet_24h
    FROM base_tx_24h tx
    INNER JOIN tracked_tokens tt
        ON tx."to" = tt.address
    GROUP BY 1
),

metrics_prev_7d AS (
    SELECT
        tt.name AS project,
        COUNT(*) AS txs_prev_7d,
        COUNT(DISTINCT tx."from") AS users_prev_7d,
        CAST(COUNT(*) AS DOUBLE) / NULLIF(COUNT(DISTINCT tx."from"), 0) AS avg_txs_per_wallet_prev_7d
    FROM base_tx_14_7 tx
    INNER JOIN tracked_tokens tt
        ON tx."to" = tt.address
    GROUP BY 1
),

-- Bounded NEW vs RETURNING: 0–30d vs 31–90d
wallet_windows AS (
    SELECT
        tt.name      AS project,
        tx."from"    AS wallet,
        MAX(CASE WHEN tx.block_time >= now() - interval '30' day THEN 1 END) AS active_30d,
        MAX(CASE WHEN tx.block_time >= now() - interval '90' day
                  AND tx.block_time <  now() - interval '30' day THEN 1 END) AS active_prev_60d
    FROM base.transactions tx
    INNER JOIN tracked_tokens tt
        ON tx."to" = tt.address
    WHERE tx.success = true
      AND tx.block_time >= now() - interval '90' day
    GROUP BY 1,2
),

new_vs_returning AS (
    SELECT
        project,
        COUNT(DISTINCT CASE
            WHEN active_30d = 1 AND active_prev_60d IS NULL THEN wallet
        END) AS new_wallets_30d,
        COUNT(DISTINCT CASE
            WHEN active_30d = 1 AND active_prev_60d = 1 THEN wallet
        END) AS returning_wallets_30d
    FROM wallet_windows
    WHERE active_30d = 1
    GROUP BY 1
),

-- Per-wallet counts over 30d
wallet_tx_30d AS (
    SELECT
        tt.name AS project,
        tx."from" AS wallet,
        COUNT(*) AS wallet_txs,
        MIN(tx.block_time) AS first_seen_30d
    FROM base_tx_30d tx
    INNER JOIN tracked_tokens tt
        ON tx."to" = tt.address
    GROUP BY 1,2
),

top10_tx_share AS (
    SELECT
        project,
        ROUND(
            CAST(SUM(CASE WHEN rn <= 10 THEN wallet_txs ELSE 0 END) AS DOUBLE)
            / NULLIF(SUM(wallet_txs), 0) * 100
        , 1) AS top10_tx_share_pct
    FROM (
        SELECT
            project,
            wallet,
            wallet_txs,
            ROW_NUMBER() OVER (
                PARTITION BY project
                ORDER BY wallet_txs DESC
            ) AS rn
        FROM wallet_tx_30d
    ) w
    GROUP BY 1
),

dex_volume AS (
    SELECT
        tt.name AS project,
        SUM(dt.amount_usd) AS dex_volume_30d,
        COUNT(DISTINCT dt.taker) AS unique_traders_30d,
        SUM(CASE
              WHEN dt.block_time >= now() - interval '7' day
              THEN dt.amount_usd ELSE 0
            END) AS dex_volume_7d,
        SUM(CASE
              WHEN dt.block_time >= now() - interval '1' day
              THEN dt.amount_usd ELSE 0
            END) AS dex_volume_24h,
        SUM(CASE
              WHEN dt.block_time >= now() - interval '14' day
               AND dt.block_time < now() - interval '7' day
              THEN dt.amount_usd ELSE 0
            END) AS dex_volume_prev_7d
    FROM dex_trades_30d dt
    INNER JOIN tracked_tokens tt
        ON dt.token_bought_address = tt.address
        OR dt.token_sold_address   = tt.address
    GROUP BY 1
),

-- First-buyer/seller lookback (split equi-joins — keep this pattern)
buyer_stats AS (
    SELECT
        tt.name AS project,
        dt.taker,
        MIN(dt.block_time) AS first_buy_time,
        MAX(CASE WHEN dt.block_time >= now() - interval '30' day THEN 1 ELSE 0 END) AS bought_30d,
        MAX(CASE WHEN dt.block_time >= now() - interval '7' day  THEN 1 ELSE 0 END) AS bought_7d,
        MAX(CASE WHEN dt.block_time >= now() - interval '1' day  THEN 1 ELSE 0 END) AS bought_24h
    FROM dex_trades_90d dt
    INNER JOIN tracked_tokens tt
        ON dt.token_bought_address = tt.address
    GROUP BY 1, 2
),

seller_stats AS (
    SELECT
        tt.name AS project,
        dt.taker,
        MIN(dt.block_time) AS first_sell_time,
        MAX(CASE WHEN dt.block_time >= now() - interval '7' day THEN 1 ELSE 0 END) AS sold_7d,
        MAX(CASE WHEN dt.block_time >= now() - interval '1' day THEN 1 ELSE 0 END) AS sold_24h
    FROM dex_trades_90d dt
    INNER JOIN tracked_tokens tt
        ON dt.token_sold_address = tt.address
    GROUP BY 1, 2
),

buyer_agg AS (
    SELECT
        project,
        COUNT(DISTINCT CASE WHEN bought_30d = 1 THEN taker END) AS buyers_30d,
        COUNT(DISTINCT CASE WHEN bought_7d = 1 THEN taker END) AS buyers_7d,
        COUNT(DISTINCT CASE WHEN bought_24h = 1 THEN taker END) AS buyers_24h,
        COUNT(DISTINCT CASE WHEN first_buy_time >= now() - interval '30' day THEN taker END) AS first_buyers_30d,
        COUNT(DISTINCT CASE WHEN first_buy_time >= now() - interval '7' day THEN taker END) AS first_buyers_7d,
        COUNT(DISTINCT CASE WHEN first_buy_time >= now() - interval '1' day THEN taker END) AS first_buyers_24h
    FROM buyer_stats
    GROUP BY 1
),

seller_agg AS (
    SELECT
        project,
        COUNT(DISTINCT CASE WHEN sold_7d = 1 THEN taker END) AS sellers_7d,
        COUNT(DISTINCT CASE WHEN sold_24h = 1 THEN taker END) AS sellers_24h,
        COUNT(DISTINCT CASE WHEN first_sell_time >= now() - interval '30' day THEN taker END) AS first_sellers_30d,
        COUNT(DISTINCT CASE WHEN first_sell_time >= now() - interval '7' day THEN taker END) AS first_sellers_7d,
        COUNT(DISTINCT CASE WHEN first_sell_time >= now() - interval '1' day THEN taker END) AS first_sellers_24h
    FROM seller_stats
    GROUP BY 1
),

buyers_sellers AS (
    SELECT
        COALESCE(b.project, s.project) AS project,
        COALESCE(b.buyers_30d, 0) AS buyers_30d,
        COALESCE(b.buyers_7d, 0) AS buyers_7d,
        COALESCE(b.buyers_24h, 0) AS buyers_24h,
        COALESCE(b.first_buyers_30d, 0) AS first_buyers_30d,
        COALESCE(b.first_buyers_7d, 0) AS first_buyers_7d,
        COALESCE(b.first_buyers_24h, 0) AS first_buyers_24h,
        COALESCE(s.first_sellers_30d, 0) AS first_sellers_30d,
        COALESCE(s.first_sellers_7d, 0) AS first_sellers_7d,
        COALESCE(s.first_sellers_24h, 0) AS first_sellers_24h,
        COALESCE(s.sellers_7d, 0) AS sellers_7d,
        COALESCE(s.sellers_24h, 0) AS sellers_24h
    FROM buyer_agg b
    FULL OUTER JOIN seller_agg s ON b.project = s.project
),

retention AS (
    SELECT
        this_week.project,
        COUNT(DISTINCT this_week.wallet) AS users_this_week,
        COUNT(DISTINCT last_week.wallet) AS retained_from_last_week
    FROM (
        SELECT DISTINCT tt.name AS project, tx."from" AS wallet
        FROM base_tx_7d tx
        INNER JOIN tracked_tokens tt
            ON tx."to" = tt.address
    ) this_week
    LEFT JOIN (
        SELECT DISTINCT tt.name AS project, tx."from" AS wallet
        FROM base_tx_14_7 tx
        INNER JOIN tracked_tokens tt
            ON tx."to" = tt.address
    ) last_week
      ON this_week.project = last_week.project
     AND this_week.wallet = last_week.wallet
    GROUP BY 1
),

avg_txs_returning AS (
    SELECT
        w.project,
        AVG(w.wallet_txs) AS avg_txs_returning_7d
    FROM (
        SELECT
            tt.name AS project,
            tx."from" AS wallet,
            COUNT(*) AS wallet_txs
        FROM base_tx_7d tx
        INNER JOIN tracked_tokens tt
            ON tx."to" = tt.address
        WHERE EXISTS (
              SELECT 1
              FROM base_tx_14_7 tx2
              WHERE tx2."to" = tx."to"
                AND tx2."from" = tx."from"
          )
        GROUP BY 1,2
    ) w
    GROUP BY 1
),

whale_thresholds AS (
    SELECT
        tt.name AS project,
        GREATEST(approx_percentile(dt.amount_usd, 0.9), 100) AS whale_min_usd,
        GREATEST(approx_percentile(dt.amount_usd, 0.99), 1000) AS hump_min_usd
    FROM dex_trades_30d dt
    INNER JOIN tracked_tokens tt
        ON dt.token_bought_address = tt.address
        OR dt.token_sold_address   = tt.address
    GROUP BY 1
),

-- Same 7d scan; 24h metrics are CASE filters (no extra table scan)
whale_flow AS (
    SELECT
        tt.name AS project,
        SUM(CASE WHEN dt.token_bought_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS whale_buy_usd_7d,
        SUM(CASE WHEN dt.token_sold_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS whale_sell_usd_7d,
        COUNT(DISTINCT CASE WHEN dt.token_bought_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                            THEN dt.taker END) AS whale_buyers_7d,
        COUNT(DISTINCT CASE WHEN dt.token_sold_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                            THEN dt.taker END) AS whale_sellers_7d,
        SUM(CASE WHEN dt.token_bought_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS hump_buy_usd_7d,
        SUM(CASE WHEN dt.token_sold_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS hump_sell_usd_7d,
        COUNT(DISTINCT CASE WHEN dt.token_bought_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                            THEN dt.taker END) AS hump_buyers_7d,
        COUNT(DISTINCT CASE WHEN dt.token_sold_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                            THEN dt.taker END) AS hump_sellers_7d,
        SUM(CASE WHEN dt.token_bought_address = tt.address THEN dt.amount_usd ELSE 0 END) AS total_buy_usd_7d,
        SUM(CASE WHEN dt.token_sold_address   = tt.address THEN dt.amount_usd ELSE 0 END) AS total_sell_usd_7d,

        SUM(CASE WHEN dt.block_time >= now() - interval '1' day
                  AND dt.token_bought_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS whale_buy_usd_24h,
        SUM(CASE WHEN dt.block_time >= now() - interval '1' day
                  AND dt.token_sold_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS whale_sell_usd_24h,
        COUNT(DISTINCT CASE WHEN dt.block_time >= now() - interval '1' day
                             AND dt.token_bought_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                            THEN dt.taker END) AS whale_buyers_24h,
        COUNT(DISTINCT CASE WHEN dt.block_time >= now() - interval '1' day
                             AND dt.token_sold_address = tt.address AND dt.amount_usd >= wt.whale_min_usd
                            THEN dt.taker END) AS whale_sellers_24h,
        SUM(CASE WHEN dt.block_time >= now() - interval '1' day
                  AND dt.token_bought_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS hump_buy_usd_24h,
        SUM(CASE WHEN dt.block_time >= now() - interval '1' day
                  AND dt.token_sold_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                 THEN dt.amount_usd ELSE 0 END) AS hump_sell_usd_24h,
        COUNT(DISTINCT CASE WHEN dt.block_time >= now() - interval '1' day
                             AND dt.token_bought_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                            THEN dt.taker END) AS hump_buyers_24h,
        COUNT(DISTINCT CASE WHEN dt.block_time >= now() - interval '1' day
                             AND dt.token_sold_address = tt.address AND dt.amount_usd >= wt.hump_min_usd
                            THEN dt.taker END) AS hump_sellers_24h,
        SUM(CASE WHEN dt.block_time >= now() - interval '1' day
                  AND dt.token_bought_address = tt.address THEN dt.amount_usd ELSE 0 END) AS total_buy_usd_24h,
        SUM(CASE WHEN dt.block_time >= now() - interval '1' day
                  AND dt.token_sold_address = tt.address THEN dt.amount_usd ELSE 0 END) AS total_sell_usd_24h,

        MAX(wt.whale_min_usd) AS whale_min_usd,
        MAX(wt.hump_min_usd) AS hump_min_usd
    FROM dex_trades_7d dt
    INNER JOIN tracked_tokens tt
        ON dt.token_bought_address = tt.address
        OR dt.token_sold_address   = tt.address
    INNER JOIN whale_thresholds wt
        ON wt.project = tt.name
    GROUP BY 1
),

combined AS (
    SELECT
        m30.project AS "Project",
        m30.symbol AS "Symbol",
        m30.address AS "Address",
        m30.tag AS "Tag",
        COALESCE(m30.txs_30d, 0) AS "Txs 30d",
        COALESCE(m7.txs_7d, 0) AS "Txs 7d",
        COALESCE(m24.txs_24h, 0) AS "Txs 24h",
        COALESCE(m30.users_30d, 0) AS "Wallets 30d",
        COALESCE(m7.users_7d, 0) AS "Wallets 7d",
        COALESCE(m24.users_24h, 0) AS "Wallets 24h",
        -- FIX: Txs/User was previously 7d data under a 30d-looking name
        COALESCE(m30.avg_txs_per_wallet_30d, 0) AS "TxsUser",
        COALESCE(m7.avg_txs_per_wallet_7d, 0) AS "TxsUser 7d",
        COALESCE(m24.avg_txs_per_wallet_24h, 0) AS "TxsUser 24h",
        COALESCE(nr.new_wallets_30d, 0) AS "New 30d",
        COALESCE(nr.returning_wallets_30d, 0) AS "Return 30d",
        CASE
            WHEN COALESCE(m30.users_30d, 0) = 0 THEN 0
            ELSE ROUND(100.0 * COALESCE(nr.new_wallets_30d, 0) / m30.users_30d, 1)
        END AS "New Wallet %",
        CASE
            WHEN COALESCE(ret.users_this_week, 0) = 0 THEN 0
            ELSE ROUND(100.0 * COALESCE(ret.retained_from_last_week, 0) / ret.users_this_week, 1)
        END AS "Retention",
        ROUND(COALESCE(avgret.avg_txs_returning_7d, 0), 2) AS "Avg Txs Ret",
        ROUND(COALESCE(t10.top10_tx_share_pct, 0), 1) AS "Top10",
        ROUND(COALESCE(dv.dex_volume_30d, 0), 2) AS "Vol 30d",
        ROUND(COALESCE(dv.dex_volume_7d, 0), 2) AS "Vol 7d",
        ROUND(COALESCE(dv.dex_volume_24h, 0), 2) AS "Vol 24h",
        ROUND(
            COALESCE(dv.dex_volume_30d, 0) / NULLIF(COALESCE(m30.txs_30d, 0), 0)
        , 2) AS "VolTx",
        ROUND(
            COALESCE(dv.dex_volume_7d, 0) / NULLIF(COALESCE(m7.txs_7d, 0), 0)
        , 2) AS "VolTx 7d",
        ROUND(
            COALESCE(dv.dex_volume_24h, 0) / NULLIF(COALESCE(m24.txs_24h, 0), 0)
        , 2) AS "VolTx 24h",
        ROUND(
            COALESCE(dv.dex_volume_30d, 0) / NULLIF(COALESCE(m30.users_30d, 0), 0)
        , 2) AS "VolWlt",
        ROUND(
            COALESCE(dv.dex_volume_7d, 0) / NULLIF(COALESCE(m7.users_7d, 0), 0)
        , 2) AS "VolWlt 7d",
        ROUND(
            COALESCE(dv.dex_volume_24h, 0) / NULLIF(COALESCE(m24.users_24h, 0), 0)
        , 2) AS "VolWlt 24h",
        COALESCE(dv.unique_traders_30d, 0) AS "Traders",
        COALESCE(bs.buyers_30d, 0) AS "Buyers 30d",
        COALESCE(bs.buyers_7d, 0) AS "Buyers 7d",
        COALESCE(bs.buyers_24h, 0) AS "Buyers 24h",
        COALESCE(bs.first_buyers_30d, 0) AS "1st Buyers 30d",
        COALESCE(bs.first_buyers_7d, 0) AS "1st Buyers 7d",
        COALESCE(bs.first_buyers_24h, 0) AS "1st Buyers 24h",
        COALESCE(bs.first_sellers_30d, 0) AS "1st Sellers 30d",
        COALESCE(bs.first_sellers_7d, 0) AS "1st Sellers 7d",
        COALESCE(bs.first_sellers_24h, 0) AS "1st Sellers 24h",
        ROUND(
            CAST(COALESCE(bs.buyers_7d, 0) AS DOUBLE)
            / NULLIF(COALESCE(bs.sellers_7d, 0), 0)
        , 2) AS "Buy/Sell Ratio",
        ROUND(
            CAST(COALESCE(bs.buyers_24h, 0) AS DOUBLE)
            / NULLIF(COALESCE(bs.sellers_24h, 0), 0)
        , 2) AS "Buy/Sell Ratio 24h",
        GREATEST(
            COALESCE(nr.new_wallets_30d, 0) - COALESCE(bs.first_buyers_30d, 0) - COALESCE(bs.first_sellers_30d, 0),
            0
        ) AS "Non-Trade New 30d",

        ROUND(COALESCE(wf.whale_buy_usd_7d, 0) - COALESCE(wf.whale_sell_usd_7d, 0), 2) AS "Whale Net 7d",
        ROUND(COALESCE(wf.whale_buy_usd_24h, 0) - COALESCE(wf.whale_sell_usd_24h, 0), 2) AS "Whale Net 24h",
        CASE
            WHEN COALESCE(wf.whale_buy_usd_7d, 0) + COALESCE(wf.whale_sell_usd_7d, 0) = 0 THEN NULL
            ELSE ROUND(
                100.0 * wf.whale_buy_usd_7d
                / (wf.whale_buy_usd_7d + wf.whale_sell_usd_7d)
            , 1)
        END AS "Accum %",
        CASE
            WHEN COALESCE(wf.whale_buy_usd_24h, 0) + COALESCE(wf.whale_sell_usd_24h, 0) = 0 THEN NULL
            ELSE ROUND(
                100.0 * wf.whale_buy_usd_24h
                / (wf.whale_buy_usd_24h + wf.whale_sell_usd_24h)
            , 1)
        END AS "Accum % 24h",
        COALESCE(wf.whale_buyers_7d, 0) AS "Whale Buyers 7d",
        COALESCE(wf.whale_sellers_7d, 0) AS "Whale Sellers 7d",
        COALESCE(wf.whale_buyers_24h, 0) AS "Whale Buyers 24h",
        COALESCE(wf.whale_sellers_24h, 0) AS "Whale Sellers 24h",
        ROUND(COALESCE(wf.hump_buy_usd_7d, 0) - COALESCE(wf.hump_sell_usd_7d, 0), 2) AS "Hump Net 7d",
        ROUND(COALESCE(wf.hump_buy_usd_24h, 0) - COALESCE(wf.hump_sell_usd_24h, 0), 2) AS "Hump Net 24h",
        ROUND(
            (COALESCE(wf.total_buy_usd_7d, 0) - COALESCE(wf.total_sell_usd_7d, 0))
            - (COALESCE(wf.whale_buy_usd_7d, 0) - COALESCE(wf.whale_sell_usd_7d, 0))
        , 2) AS "Retail Net 7d",
        ROUND(
            (COALESCE(wf.total_buy_usd_24h, 0) - COALESCE(wf.total_sell_usd_24h, 0))
            - (COALESCE(wf.whale_buy_usd_24h, 0) - COALESCE(wf.whale_sell_usd_24h, 0))
        , 2) AS "Retail Net 24h",
        CASE
            WHEN COALESCE(wf.total_buy_usd_7d, 0) + COALESCE(wf.total_sell_usd_7d, 0) = 0 THEN NULL
            ELSE ROUND(
                100.0 * (COALESCE(wf.whale_buy_usd_7d, 0) + COALESCE(wf.whale_sell_usd_7d, 0))
                / (wf.total_buy_usd_7d + wf.total_sell_usd_7d)
            , 1)
        END AS "Whale Vol %",
        CASE
            WHEN COALESCE(wf.total_buy_usd_24h, 0) + COALESCE(wf.total_sell_usd_24h, 0) = 0 THEN NULL
            ELSE ROUND(
                100.0 * (COALESCE(wf.whale_buy_usd_24h, 0) + COALESCE(wf.whale_sell_usd_24h, 0))
                / (wf.total_buy_usd_24h + wf.total_sell_usd_24h)
            , 1)
        END AS "Whale Vol % 24h",
        CASE
            WHEN COALESCE(wf.total_buy_usd_7d, 0) + COALESCE(wf.total_sell_usd_7d, 0) = 0 THEN NULL
            ELSE ROUND(
                100.0 * wf.total_buy_usd_7d / (wf.total_buy_usd_7d + wf.total_sell_usd_7d)
            , 1)
        END AS "Buy Vol %",
        CASE
            WHEN COALESCE(wf.total_buy_usd_24h, 0) + COALESCE(wf.total_sell_usd_24h, 0) = 0 THEN NULL
            ELSE ROUND(
                100.0 * wf.total_buy_usd_24h / (wf.total_buy_usd_24h + wf.total_sell_usd_24h)
            , 1)
        END AS "Buy Vol % 24h",
        ROUND(COALESCE(wf.whale_min_usd, 0), 0) AS "Whale Min $",
        ROUND(COALESCE(wf.hump_min_usd, 0), 0) AS "Hump Min $",
        COALESCE(wf.hump_buyers_7d, 0) AS "Hump Buyers 7d",
        COALESCE(wf.hump_sellers_7d, 0) AS "Hump Sellers 7d",
        COALESCE(wf.hump_buyers_24h, 0) AS "Hump Buyers 24h",
        COALESCE(wf.hump_sellers_24h, 0) AS "Hump Sellers 24h",
        COALESCE(
            ROUND(
                CASE
                    WHEN COALESCE(dv.dex_volume_prev_7d, 0) = 0 THEN NULL
                    ELSE 100.0 * (COALESCE(dv.dex_volume_7d, 0) - dv.dex_volume_prev_7d) / dv.dex_volume_prev_7d
                END,
                1
            ),
            0
        ) AS "Vol Grw",
        COALESCE(
            ROUND(
                CASE
                    WHEN COALESCE(mp7.txs_prev_7d, 0) = 0 THEN NULL
                    ELSE 100.0 * (COALESCE(m7.txs_7d, 0) - mp7.txs_prev_7d) / mp7.txs_prev_7d
                END,
                1
            ),
            0
        ) AS "Tx Grw",
        COALESCE(
            ROUND(
                CASE
                    WHEN COALESCE(mp7.users_prev_7d, 0) = 0 THEN NULL
                    ELSE 100.0 * (COALESCE(m7.users_7d, 0) - mp7.users_prev_7d) / mp7.users_prev_7d
                END,
                1
            ),
            0
        ) AS "User Grw"
    FROM metrics_30d m30
    LEFT JOIN metrics_7d m7 ON m30.project = m7.project
    LEFT JOIN metrics_24h m24 ON m30.project = m24.project
    LEFT JOIN metrics_prev_7d mp7 ON m30.project = mp7.project
    LEFT JOIN new_vs_returning nr ON m30.project = nr.project
    LEFT JOIN top10_tx_share t10 ON m30.project = t10.project
    LEFT JOIN dex_volume dv ON m30.project = dv.project
    LEFT JOIN buyers_sellers bs ON m30.project = bs.project
    LEFT JOIN retention ret ON m30.project = ret.project
    LEFT JOIN avg_txs_returning avgret ON m30.project = avgret.project
    LEFT JOIN whale_flow wf ON m30.project = wf.project
),

scored AS (
    SELECT
        *,
        ROUND(
            0.25 * COALESCE("New Wallet %", 0) +
            0.25 * COALESCE((GREATEST(-100, LEAST(200, "Tx Grw")) + GREATEST(-100, LEAST(200, "User Grw")) + GREATEST(-100, LEAST(200, COALESCE("Vol Grw",0)))) / 3, 0) +
            0.20 * COALESCE("Retention", 0) +
            0.15 * LEAST(COALESCE("VolTx", 0) / 1000, 100) +
            0.10 * LEAST(COALESCE("VolWlt", 0) / 5000, 100) +
            0.03 * (100 - COALESCE("Top10", 100)) +
            0.02 * LEAST(COALESCE("TxsUser", 0) * 10, 100)
        , 1) AS "Mom",

        ROUND(
            0.10 * COALESCE("New Wallet %", 0) +
            0.15 * COALESCE((GREATEST(-100, LEAST(200, "Tx Grw")) + GREATEST(-100, LEAST(200, "User Grw")) + GREATEST(-100, LEAST(200, COALESCE("Vol Grw",0)))) / 3, 0) +
            0.30 * COALESCE("Retention", 0) +
            0.25 * (
                0.5 * LEAST(COALESCE("VolTx", 0) / 1000, 100) +
                0.5 * LEAST(COALESCE("VolWlt", 0) / 5000, 100)
            ) +
            0.15 * LEAST(COALESCE("Avg Txs Ret", 0) * 10, 100) +
            0.03 * (100 - COALESCE("Top10", 100)) +
            0.02 * LEAST(COALESCE("TxsUser", 0) * 10, 100)
        , 1) AS "Sus"
    FROM combined
),

final AS (
    SELECT
        *,
        ROUND(
            GREATEST(
                0,
                100
                - CASE WHEN COALESCE("Tx Grw",0) - COALESCE("User Grw",0) > 50 THEN 20 ELSE 0 END
                - CASE WHEN COALESCE("Top10",0) > 60 THEN 20 ELSE 0 END
                - CASE WHEN COALESCE("Retention",0) > 150 THEN 20 ELSE 0 END
            )
        , 1) AS "Qlty",

        ROUND(
            LEAST(
                100,
                0.65 * LEAST(COALESCE("VolWlt", 0) / 10000 * 100, 100)
                + 0.35 * COALESCE("Top10", 0)
            )
        , 1) AS "Risk"
    FROM scored
)

SELECT
    "Project",
    "Symbol",
    "Address",
    "Tag",

    ROW_NUMBER() OVER (
        ORDER BY
            (0.5 * "Mom" + 0.5 * "Sus") * ("Qlty" / 100.0) * (1 - "Risk" / 100.0) DESC
    ) AS "O Rk",
    ROUND(
        (0.5 * "Mom" + 0.5 * "Sus") * ("Qlty" / 100.0) * (1 - "Risk" / 100.0),
        1
    ) AS "Opp",

    ROW_NUMBER() OVER (ORDER BY "Mom" DESC) AS "M Rk",
    "Mom",
    ROW_NUMBER() OVER (ORDER BY "Sus" DESC) AS "S Rk",
    "Sus",

    CASE
        WHEN "Mom" >= approx_percentile("Mom", 0.5) OVER ()
         AND "Sus" >= approx_percentile("Sus", 0.5) OVER ()
            THEN 'Breakout'
        WHEN "Mom" >= approx_percentile("Mom", 0.5) OVER ()
         AND "Sus" <  approx_percentile("Sus", 0.5) OVER ()
            THEN 'Quick Mover'
        WHEN "Mom" <  approx_percentile("Mom", 0.5) OVER ()
         AND "Sus" >= approx_percentile("Sus", 0.5) OVER ()
            THEN 'Slow Burner'
        ELSE 'Cold'
    END AS "Prof",

    ROUND("Qlty",      1) AS "Qlty %",
    ROUND("Risk",      1) AS "Risk %",
    "Vol 30d",
    "Vol 7d",
    "Vol 24h",
    ROUND("VolTx",   2) AS "Vol/Tx",
    ROUND("VolTx 7d", 2) AS "Vol/Tx 7d",
    ROUND("VolTx 24h", 2) AS "Vol/Tx 24h",
    ROUND("VolWlt",  2) AS "Vol/Wlt",
    ROUND("VolWlt 7d", 2) AS "Vol/Wlt 7d",
    ROUND("VolWlt 24h", 2) AS "Vol/Wlt 24h",
    ROUND("Vol Grw", 1) AS "Vol Grw %",
    "Txs 30d",
    "Txs 7d",
    "Txs 24h",
    ROUND("Tx Grw",  1) AS "Tx Grw %",
    ROUND("TxsUser", 2) AS "Txs/User",
    ROUND("TxsUser 7d", 2) AS "Txs/User 7d",
    ROUND("TxsUser 24h", 2) AS "Txs/User 24h",
    "Wallets 30d",
    "Wallets 7d",
    "Wallets 24h",
    ROUND("User Grw", 1) AS "User Grw %",
    "New 30d",
    "Return 30d",
    ROUND("New Wallet %", 1) AS "New Wallet %",
    ROUND("Retention",     1) AS "Retention %",
    "Avg Txs Ret",
    "Traders",
    "Buyers 30d",
    "Buyers 7d",
    "Buyers 24h",
    "1st Buyers 30d",
    "1st Buyers 7d",
    "1st Buyers 24h",
    "1st Sellers 30d",
    "1st Sellers 7d",
    "1st Sellers 24h",
    "Buy/Sell Ratio",
    "Buy/Sell Ratio 24h",
    "Whale Net 7d",
    "Whale Net 24h",
    "Accum %",
    "Accum % 24h",
    "Whale Buyers 7d",
    "Whale Sellers 7d",
    "Whale Buyers 24h",
    "Whale Sellers 24h",
    "Hump Net 7d",
    "Hump Net 24h",
    "Hump Buyers 7d",
    "Hump Sellers 7d",
    "Hump Buyers 24h",
    "Hump Sellers 24h",
    "Retail Net 7d",
    "Retail Net 24h",
    "Whale Vol %",
    "Whale Vol % 24h",
    "Buy Vol %",
    "Buy Vol % 24h",
    "Whale Min $",
    "Hump Min $",
    "Non-Trade New 30d",
    ROUND("Top10", 1) AS "Top10 %",
    COALESCE(DATE_DIFF('day', CAST(ta.deployed_at AS DATE), CURRENT_DATE), 0) AS "Token Age Days",
    "Project"   AS "Project ↪"
FROM final
LEFT JOIN token_ages ta
    ON LOWER(CAST(final."Address" AS VARCHAR)) = LOWER(CAST(ta.age_address AS VARCHAR))
ORDER BY "Opp" DESC
LIMIT 200;
