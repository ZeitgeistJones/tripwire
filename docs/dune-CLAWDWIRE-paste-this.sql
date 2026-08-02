-- ClawdWire — paste into Dune query 8180604 (replace body)
-- CLAWD only: 7d txs + 30d dex.trades
-- Pulse $: 15m / 1h / 6h / 24h
-- Chunk C: whale / hump / retail 24h + 7d
-- Chunk D: stickiness (new/returning traders, 1st buy/sell, vol)
-- Chunk E: wallet lens (per-wallet $ + txs, top net, big prints) + intensity
-- Chunk F: WoW growth + retention + distribution / heat / flippers
-- Chunk G: uniformity, vol/move, streaks, flip speed, round-trip rate, diamond hands
-- Chunk H: timing tape — peak-price hour, nets around peak, worst hour, hourly net strip
-- Chunk H2: who bought/sold in run-up (hour before+peak) and dump (worst net hour)
-- Chunk I: matched-token VWAP closed PnL (data formula) — separate from net flow; not FIFO/tax lots

WITH clawd AS (
    SELECT address, name FROM (
        VALUES
        (0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07, 'CLAWD')
    ) AS t(address, name)
),

recent_tx AS (
    SELECT
        c.name    AS project,
        c.address AS address,
        t."from"  AS wallet,
        t.block_time
    FROM base.transactions t
    INNER JOIN clawd c ON t."to" = c.address
    WHERE t.success = true
      AND t.block_time >= now() - interval '7' day
),

activity_pulse AS (
    SELECT
        project,
        address,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '15' minute) AS txs_15m,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '15' minute) AS wallets_15m,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '1'  hour)   AS txs_1h,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '1'  hour)   AS wallets_1h,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '6'  hour)   AS txs_6h,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '6'  hour)   AS wallets_6h,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '24' hour)   AS txs_24h,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '24' hour)   AS wallets_24h,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '7'  day)    AS txs_7d,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '7'  day)    AS wallets_7d
    FROM recent_tx
    GROUP BY 1, 2
),

-- Single 30d CLAWD trade scan: short pulse windows + whale thresholds + 7d/24h tiers
recent_trades AS (
    SELECT
        c.name    AS project,
        c.address AS address,
        dt.taker  AS trader,
        dt.tx_hash,
        dt.block_time,
        dt.amount_usd,
        CASE
            WHEN dt.token_bought_address = c.address THEN 'buy'
            ELSE 'sell'
        END AS side,
        CASE
            WHEN dt.token_bought_address = c.address THEN dt.token_bought_amount
            ELSE dt.token_sold_amount
        END AS clawd_amt,
        CASE
            WHEN dt.token_bought_address = c.address AND dt.token_bought_amount > 0
                THEN dt.amount_usd / dt.token_bought_amount
            WHEN dt.token_sold_amount > 0
                THEN dt.amount_usd / dt.token_sold_amount
            ELSE NULL
        END AS price_usd
    FROM dex.trades dt
    INNER JOIN clawd c
        ON dt.token_bought_address = c.address
        OR dt.token_sold_address   = c.address
    WHERE dt.blockchain = 'base'
      AND dt.block_time >= now() - interval '30' day
),

whale_thresholds AS (
    SELECT
        project,
        GREATEST(approx_percentile(amount_usd, 0.9), 100)  AS whale_min_usd,
        GREATEST(approx_percentile(amount_usd, 0.99), 1000) AS hump_min_usd
    FROM recent_trades
    GROUP BY 1
),

flow_pulse AS (
    SELECT
        rt.project,
        rt.address,

        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'buy'  AND rt.block_time >= now() - interval '15' minute
        ), 0) AS buy_usd_15m,
        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'sell' AND rt.block_time >= now() - interval '15' minute
        ), 0) AS sell_usd_15m,
        MAX(rt.amount_usd) FILTER (
            WHERE rt.block_time >= now() - interval '15' minute
        ) AS max_trade_usd_15m,

        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'buy'  AND rt.block_time >= now() - interval '1' hour
        ), 0) AS buy_usd_1h,
        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'sell' AND rt.block_time >= now() - interval '1' hour
        ), 0) AS sell_usd_1h,
        MAX(rt.amount_usd) FILTER (
            WHERE rt.block_time >= now() - interval '1' hour
        ) AS max_trade_usd_1h,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'buy'  AND rt.block_time >= now() - interval '1' hour
        ) AS buyers_1h,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'sell' AND rt.block_time >= now() - interval '1' hour
        ) AS sellers_1h,

        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'buy'  AND rt.block_time >= now() - interval '6' hour
        ), 0) AS buy_usd_6h,
        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'sell' AND rt.block_time >= now() - interval '6' hour
        ), 0) AS sell_usd_6h,
        MAX(rt.amount_usd) FILTER (
            WHERE rt.block_time >= now() - interval '6' hour
        ) AS max_trade_usd_6h,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'buy'  AND rt.block_time >= now() - interval '6' hour
        ) AS buyers_6h,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'sell' AND rt.block_time >= now() - interval '6' hour
        ) AS sellers_6h,

        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'buy'  AND rt.block_time >= now() - interval '24' hour
        ), 0) AS buy_usd_24h,
        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'sell' AND rt.block_time >= now() - interval '24' hour
        ), 0) AS sell_usd_24h,
        MAX(rt.amount_usd) FILTER (
            WHERE rt.block_time >= now() - interval '24' hour
        ) AS max_trade_usd_24h,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'buy'  AND rt.block_time >= now() - interval '24' hour
        ) AS buyers_24h,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'sell' AND rt.block_time >= now() - interval '24' hour
        ) AS sellers_24h,

        -- Whale / hump / retail (7d + 24h) — same tier logic as main dashboard
        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'buy' AND rt.amount_usd >= wt.whale_min_usd
              AND rt.block_time >= now() - interval '7' day
        ), 0) AS whale_buy_usd_7d,
        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'sell' AND rt.amount_usd >= wt.whale_min_usd
              AND rt.block_time >= now() - interval '7' day
        ), 0) AS whale_sell_usd_7d,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'buy' AND rt.amount_usd >= wt.whale_min_usd
              AND rt.block_time >= now() - interval '7' day
        ) AS whale_buyers_7d,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'sell' AND rt.amount_usd >= wt.whale_min_usd
              AND rt.block_time >= now() - interval '7' day
        ) AS whale_sellers_7d,

        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'buy' AND rt.amount_usd >= wt.hump_min_usd
              AND rt.block_time >= now() - interval '7' day
        ), 0) AS hump_buy_usd_7d,
        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'sell' AND rt.amount_usd >= wt.hump_min_usd
              AND rt.block_time >= now() - interval '7' day
        ), 0) AS hump_sell_usd_7d,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'buy' AND rt.amount_usd >= wt.hump_min_usd
              AND rt.block_time >= now() - interval '7' day
        ) AS hump_buyers_7d,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'sell' AND rt.amount_usd >= wt.hump_min_usd
              AND rt.block_time >= now() - interval '7' day
        ) AS hump_sellers_7d,

        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'buy' AND rt.block_time >= now() - interval '7' day
        ), 0) AS total_buy_usd_7d,
        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'sell' AND rt.block_time >= now() - interval '7' day
        ), 0) AS total_sell_usd_7d,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'buy' AND rt.block_time >= now() - interval '7' day
        ) AS buyers_7d,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'sell' AND rt.block_time >= now() - interval '7' day
        ) AS sellers_7d,

        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'buy' AND rt.amount_usd >= wt.whale_min_usd
              AND rt.block_time >= now() - interval '24' hour
        ), 0) AS whale_buy_usd_24h,
        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'sell' AND rt.amount_usd >= wt.whale_min_usd
              AND rt.block_time >= now() - interval '24' hour
        ), 0) AS whale_sell_usd_24h,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'buy' AND rt.amount_usd >= wt.whale_min_usd
              AND rt.block_time >= now() - interval '24' hour
        ) AS whale_buyers_24h,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'sell' AND rt.amount_usd >= wt.whale_min_usd
              AND rt.block_time >= now() - interval '24' hour
        ) AS whale_sellers_24h,

        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'buy' AND rt.amount_usd >= wt.hump_min_usd
              AND rt.block_time >= now() - interval '24' hour
        ), 0) AS hump_buy_usd_24h,
        COALESCE(SUM(rt.amount_usd) FILTER (
            WHERE rt.side = 'sell' AND rt.amount_usd >= wt.hump_min_usd
              AND rt.block_time >= now() - interval '24' hour
        ), 0) AS hump_sell_usd_24h,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'buy' AND rt.amount_usd >= wt.hump_min_usd
              AND rt.block_time >= now() - interval '24' hour
        ) AS hump_buyers_24h,
        COUNT(DISTINCT rt.trader) FILTER (
            WHERE rt.side = 'sell' AND rt.amount_usd >= wt.hump_min_usd
              AND rt.block_time >= now() - interval '24' hour
        ) AS hump_sellers_24h,

        MAX(wt.whale_min_usd) AS whale_min_usd,
        MAX(wt.hump_min_usd)  AS hump_min_usd
    FROM recent_trades rt
    INNER JOIN whale_thresholds wt ON wt.project = rt.project
    GROUP BY 1, 2
),

-- Chunk D: stickiness from the same 30d trade scan (first buy/sell = first in 30d window)
trader_span AS (
    SELECT
        project,
        address,
        trader,
        MIN(block_time) AS first_seen,
        MAX(block_time) AS last_seen
    FROM recent_trades
    GROUP BY 1, 2, 3
),

stickiness AS (
    SELECT
        project,
        address,
        COUNT(*) FILTER (WHERE last_seen >= now() - interval '24' hour) AS traders_24h,
        COUNT(*) FILTER (WHERE last_seen >= now() - interval '7' day) AS traders_7d,
        COUNT(*) AS traders_30d,
        COUNT(*) FILTER (WHERE first_seen >= now() - interval '7' day) AS new_traders_7d,
        COUNT(*) FILTER (
            WHERE first_seen < now() - interval '7' day
              AND last_seen >= now() - interval '7' day
        ) AS returning_traders_7d
    FROM trader_span
    GROUP BY 1, 2
),

buy_ranked AS (
    SELECT
        project,
        address,
        trader,
        block_time,
        ROW_NUMBER() OVER (PARTITION BY project, trader ORDER BY block_time) AS rn
    FROM recent_trades
    WHERE side = 'buy'
),

sell_ranked AS (
    SELECT
        project,
        address,
        trader,
        block_time,
        ROW_NUMBER() OVER (PARTITION BY project, trader ORDER BY block_time) AS rn
    FROM recent_trades
    WHERE side = 'sell'
),

first_side AS (
    SELECT
        COALESCE(b.project, s.project) AS project,
        COALESCE(b.address, s.address) AS address,
        COALESCE(b.first_buyers_24h, 0) AS first_buyers_24h,
        COALESCE(b.first_buyers_7d, 0) AS first_buyers_7d,
        COALESCE(b.first_buyers_30d, 0) AS first_buyers_30d,
        COALESCE(s.first_sellers_24h, 0) AS first_sellers_24h,
        COALESCE(s.first_sellers_7d, 0) AS first_sellers_7d,
        COALESCE(s.first_sellers_30d, 0) AS first_sellers_30d
    FROM (
        SELECT
            project,
            address,
            COUNT(*) FILTER (WHERE rn = 1 AND block_time >= now() - interval '24' hour) AS first_buyers_24h,
            COUNT(*) FILTER (WHERE rn = 1 AND block_time >= now() - interval '7' day) AS first_buyers_7d,
            COUNT(*) FILTER (WHERE rn = 1) AS first_buyers_30d
        FROM buy_ranked
        GROUP BY 1, 2
    ) b
    FULL OUTER JOIN (
        SELECT
            project,
            address,
            COUNT(*) FILTER (WHERE rn = 1 AND block_time >= now() - interval '24' hour) AS first_sellers_24h,
            COUNT(*) FILTER (WHERE rn = 1 AND block_time >= now() - interval '7' day) AS first_sellers_7d,
            COUNT(*) FILTER (WHERE rn = 1) AS first_sellers_30d
        FROM sell_ranked
        GROUP BY 1, 2
    ) s ON b.project = s.project
),

vol_windows AS (
    SELECT
        project,
        address,
        COALESCE(SUM(amount_usd) FILTER (WHERE block_time >= now() - interval '24' hour), 0) AS vol_24h,
        COALESCE(SUM(amount_usd) FILTER (WHERE block_time >= now() - interval '7' day), 0) AS vol_7d,
        COALESCE(SUM(amount_usd), 0) AS vol_30d,
        COUNT(*) FILTER (WHERE block_time >= now() - interval '24' hour) AS trades_24h,
        COUNT(*) FILTER (WHERE block_time >= now() - interval '7' day) AS trades_7d,
        COUNT(*) AS trades_30d,
        COUNT(DISTINCT trader) FILTER (
            WHERE side = 'buy' AND block_time >= now() - interval '30' day
        ) AS buyers_30d,
        COUNT(DISTINCT trader) FILTER (
            WHERE side = 'sell' AND block_time >= now() - interval '30' day
        ) AS sellers_30d
    FROM recent_trades
    GROUP BY 1, 2
),

-- Chunk E: per-wallet 24h buy/sell/$ + tx counts
wallet_flow_24h AS (
    SELECT
        project,
        address,
        trader,
        COALESCE(SUM(amount_usd) FILTER (WHERE side = 'buy'), 0) AS buy_usd,
        COALESCE(SUM(amount_usd) FILTER (WHERE side = 'sell'), 0) AS sell_usd,
        COUNT(*) FILTER (WHERE side = 'buy') AS buy_txs,
        COUNT(*) FILTER (WHERE side = 'sell') AS sell_txs,
        COUNT(*) AS txs,
        MAX(amount_usd) AS max_trade_usd,
        MAX_BY(tx_hash, amount_usd) AS max_trade_tx
    FROM recent_trades
    WHERE block_time >= now() - interval '24' hour
    GROUP BY 1, 2, 3
),

wallet_ranked AS (
    SELECT
        project,
        address,
        trader,
        buy_usd,
        sell_usd,
        buy_usd - sell_usd AS net_usd,
        buy_txs,
        sell_txs,
        txs,
        max_trade_usd,
        max_trade_tx,
        ROW_NUMBER() OVER (PARTITION BY project ORDER BY buy_usd DESC) AS buy_rn,
        ROW_NUMBER() OVER (PARTITION BY project ORDER BY sell_usd DESC) AS sell_rn,
        ROW_NUMBER() OVER (PARTITION BY project ORDER BY (buy_usd - sell_usd) DESC) AS net_rn
    FROM wallet_flow_24h
),

trade_prints_24h AS (
    SELECT
        project,
        address,
        trader,
        side,
        amount_usd,
        tx_hash,
        ROW_NUMBER() OVER (PARTITION BY project ORDER BY amount_usd DESC) AS rn
    FROM recent_trades
    WHERE block_time >= now() - interval '24' hour
),

top_flow AS (
    SELECT
        COALESCE(b.project, s.project, n.project, p.project) AS project,
        COALESCE(b.address, s.address, n.address, p.address) AS address,
        b.top_buyers_24h,
        s.top_sellers_24h,
        n.top_net_24h,
        p.big_prints_24h
    FROM (
        SELECT
            project,
            address,
            array_join(
                array_agg(
                    CONCAT(
                        '0x', LOWER(to_hex(trader)),
                        ' · $', CAST(CAST(ROUND(buy_usd) AS BIGINT) AS VARCHAR),
                        ' · ', CAST(buy_txs AS VARCHAR), 'tx',
                        ' · net$', CAST(CAST(ROUND(net_usd) AS BIGINT) AS VARCHAR),
                        ' · tx0x', LOWER(to_hex(max_trade_tx))
                    )
                    ORDER BY buy_rn
                ),
                ' | '
            ) AS top_buyers_24h
        FROM wallet_ranked
        WHERE buy_rn <= 5 AND buy_usd > 0
        GROUP BY 1, 2
    ) b
    FULL OUTER JOIN (
        SELECT
            project,
            address,
            array_join(
                array_agg(
                    CONCAT(
                        '0x', LOWER(to_hex(trader)),
                        ' · $', CAST(CAST(ROUND(sell_usd) AS BIGINT) AS VARCHAR),
                        ' · ', CAST(sell_txs AS VARCHAR), 'tx',
                        ' · net$', CAST(CAST(ROUND(net_usd) AS BIGINT) AS VARCHAR),
                        ' · tx0x', LOWER(to_hex(max_trade_tx))
                    )
                    ORDER BY sell_rn
                ),
                ' | '
            ) AS top_sellers_24h
        FROM wallet_ranked
        WHERE sell_rn <= 5 AND sell_usd > 0
        GROUP BY 1, 2
    ) s ON b.project = s.project
    FULL OUTER JOIN (
        SELECT
            project,
            address,
            array_join(
                array_agg(
                    CONCAT(
                        '0x', LOWER(to_hex(trader)),
                        ' · net$', CAST(CAST(ROUND(net_usd) AS BIGINT) AS VARCHAR),
                        ' · buy$', CAST(CAST(ROUND(buy_usd) AS BIGINT) AS VARCHAR),
                        ' · sell$', CAST(CAST(ROUND(sell_usd) AS BIGINT) AS VARCHAR),
                        ' · ', CAST(txs AS VARCHAR), 'tx'
                    )
                    ORDER BY net_rn
                ),
                ' | '
            ) AS top_net_24h
        FROM wallet_ranked
        WHERE net_rn <= 5 AND net_usd > 0
        GROUP BY 1, 2
    ) n ON COALESCE(b.project, s.project) = n.project
    FULL OUTER JOIN (
        SELECT
            project,
            address,
            array_join(
                array_agg(
                    CONCAT(
                        side,
                        ' · $', CAST(CAST(ROUND(amount_usd) AS BIGINT) AS VARCHAR),
                        ' · 0x', LOWER(to_hex(trader)),
                        ' · tx0x', LOWER(to_hex(tx_hash))
                    )
                    ORDER BY rn
                ),
                ' | '
            ) AS big_prints_24h
        FROM trade_prints_24h
        WHERE rn <= 5
        GROUP BY 1, 2
    ) p ON COALESCE(b.project, s.project, n.project) = p.project
),

-- Chunk F: WoW (this 7d vs prior 7d) + retention + size distribution / heat
wow_windows AS (
    SELECT
        project,
        address,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE block_time >= now() - interval '7' day
        ), 0) AS vol_this,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE block_time >= now() - interval '14' day
              AND block_time < now() - interval '7' day
        ), 0) AS vol_prev,
        COUNT(*) FILTER (
            WHERE block_time >= now() - interval '7' day
        ) AS txs_this,
        COUNT(*) FILTER (
            WHERE block_time >= now() - interval '14' day
              AND block_time < now() - interval '7' day
        ) AS txs_prev,
        COUNT(DISTINCT trader) FILTER (
            WHERE block_time >= now() - interval '7' day
        ) AS users_this,
        COUNT(DISTINCT trader) FILTER (
            WHERE block_time >= now() - interval '14' day
              AND block_time < now() - interval '7' day
        ) AS users_prev
    FROM recent_trades
    GROUP BY 1, 2
),

trader_weeks AS (
    SELECT
        project,
        address,
        trader,
        MAX(CASE WHEN block_time >= now() - interval '7' day THEN 1 ELSE 0 END) AS in_this,
        MAX(CASE
            WHEN block_time >= now() - interval '14' day
             AND block_time < now() - interval '7' day THEN 1
            ELSE 0
        END) AS in_prev
    FROM recent_trades
    GROUP BY 1, 2, 3
),

retention_agg AS (
    SELECT
        project,
        address,
        COUNT(*) FILTER (WHERE in_prev = 1) AS traders_prev_week,
        COUNT(*) FILTER (WHERE in_prev = 1 AND in_this = 1) AS retained_traders,
        COUNT(*) FILTER (WHERE in_this = 1 AND in_prev = 0) AS new_vs_prev_week
    FROM trader_weeks
    GROUP BY 1, 2
),

dist_heat AS (
    SELECT
        project,
        address,
        approx_percentile(amount_usd, 0.5) AS median_trade_24h,
        approx_percentile(amount_usd, 0.9) AS p90_trade_24h,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE block_time >= now() - interval '1' hour
        ), 0) AS vol_1h,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE block_time >= now() - interval '6' hour
        ), 0) AS vol_6h,
        COALESCE(SUM(amount_usd), 0) AS vol_24h,
        COUNT(*) FILTER (WHERE block_time >= now() - interval '1' hour) AS trades_1h,
        COUNT(*) FILTER (WHERE block_time >= now() - interval '6' hour) AS trades_6h,
        COUNT(*) AS trades_24h
    FROM recent_trades
    WHERE block_time >= now() - interval '24' hour
    GROUP BY 1, 2
),

flippers_24h AS (
    SELECT
        project,
        address,
        COUNT(*) AS flippers_24h
    FROM (
        SELECT
            project,
            address,
            trader
        FROM recent_trades
        WHERE block_time >= now() - interval '24' hour
        GROUP BY 1, 2, 3
        HAVING COUNT(*) FILTER (WHERE side = 'buy') > 0
           AND COUNT(*) FILTER (WHERE side = 'sell') > 0
    ) t
    GROUP BY 1, 2
),

whale_persist AS (
    SELECT
        w.project,
        w.address,
        COUNT(*) AS whale_traders_7d,
        COUNT(*) FILTER (WHERE a.trader IS NOT NULL) AS whale_traders_active_24h
    FROM (
        SELECT DISTINCT
            rt.project,
            rt.address,
            rt.trader
        FROM recent_trades rt
        INNER JOIN whale_thresholds wt ON wt.project = rt.project
        WHERE rt.amount_usd >= wt.whale_min_usd
          AND rt.block_time >= now() - interval '7' day
    ) w
    LEFT JOIN (
        SELECT DISTINCT project, address, trader
        FROM recent_trades
        WHERE block_time >= now() - interval '24' hour
    ) a
        ON w.project = a.project
       AND w.trader = a.trader
    GROUP BY 1, 2
),

-- Chunk G: trade-shape signals + conviction storytelling (research heuristics, not accusations)
uniformity_24h AS (
    SELECT
        project,
        address,
        ROUND(100.0 * MAX(bucket_n) / NULLIF(SUM(bucket_n), 0), 1) AS size_uniformity_pct
    FROM (
        SELECT
            project,
            address,
            ROUND(amount_usd, 0) AS size_bucket,
            COUNT(*) AS bucket_n
        FROM recent_trades
        WHERE block_time >= now() - interval '24' hour
          AND amount_usd >= 1
        GROUP BY 1, 2, 3
    ) t
    GROUP BY 1, 2
),

size_cv_24h AS (
    SELECT
        project,
        address,
        ROUND(
            STDDEV_SAMP(amount_usd) / NULLIF(AVG(amount_usd), 0)
        , 3) AS size_cv
    FROM recent_trades
    WHERE block_time >= now() - interval '24' hour
      AND amount_usd > 0
    GROUP BY 1, 2
),

wash_pressure_24h AS (
    SELECT
        project,
        address,
        ROUND(COALESCE(SUM(amount_usd), 0), 2) AS vol_24h,
        ROUND(MIN_BY(price_usd, block_time), 8) AS price_open,
        ROUND(MAX_BY(price_usd, block_time), 8) AS price_close,
        ROUND(
            100.0 * ABS(MAX_BY(price_usd, block_time) - MIN_BY(price_usd, block_time))
            / NULLIF(MIN_BY(price_usd, block_time), 0)
        , 3) AS abs_move_pct,
        ROUND(
            COALESCE(SUM(amount_usd), 0) / NULLIF(
                100.0 * ABS(MAX_BY(price_usd, block_time) - MIN_BY(price_usd, block_time))
                / NULLIF(MIN_BY(price_usd, block_time), 0)
            , 0)
        , 0) AS vol_per_1pct_move
    FROM recent_trades
    WHERE block_time >= now() - interval '24' hour
      AND price_usd IS NOT NULL
      AND price_usd > 0
    GROUP BY 1, 2
),

bucket_5m AS (
    SELECT
        project,
        address,
        from_unixtime(FLOOR(to_unixtime(block_time) / 300) * 300) AS bucket_start,
        SUM(CASE WHEN side = 'buy' THEN amount_usd ELSE -amount_usd END) AS net_usd
    FROM recent_trades
    GROUP BY 1, 2, 3
),

bucket_flags AS (
    SELECT
        project,
        address,
        bucket_start,
        CASE WHEN net_usd > 0 THEN 1 ELSE 0 END AS buy_dom,
        ROW_NUMBER() OVER (PARTITION BY project ORDER BY bucket_start) AS rn,
        ROW_NUMBER() OVER (
            PARTITION BY project, CASE WHEN net_usd > 0 THEN 1 ELSE 0 END
            ORDER BY bucket_start
        ) AS rn_dom
    FROM bucket_5m
),

streak_stats AS (
    SELECT
        project,
        address,
        MAX(CASE WHEN buy_dom = 1 THEN streak_len END) AS longest_buy_streak,
        MAX(CASE WHEN buy_dom = 0 THEN streak_len END) AS longest_sell_streak
    FROM (
        SELECT
            project,
            address,
            buy_dom,
            COUNT(*) AS streak_len
        FROM (
            SELECT
                project,
                address,
                buy_dom,
                rn - rn_dom AS grp
            FROM bucket_flags
        ) g
        GROUP BY project, address, buy_dom, grp
    ) s
    GROUP BY 1, 2
),

flip_speed AS (
    SELECT
        project,
        address,
        approx_percentile(mins_to_flip, 0.5) AS median_flip_mins,
        approx_percentile(
            CASE WHEN cohort = 'new' THEN mins_to_flip END, 0.5
        ) AS median_flip_mins_new,
        approx_percentile(
            CASE WHEN cohort = 'returning' THEN mins_to_flip END, 0.5
        ) AS median_flip_mins_returning
    FROM (
        SELECT
            b.project,
            b.address,
            date_diff('minute', b.first_buy, s.first_sell) AS mins_to_flip,
            CASE
                WHEN ts.first_seen >= now() - interval '7' day THEN 'new'
                ELSE 'returning'
            END AS cohort
        FROM (
            SELECT project, address, trader, MIN(block_time) AS first_buy
            FROM recent_trades
            WHERE side = 'buy'
            GROUP BY 1, 2, 3
        ) b
        INNER JOIN (
            SELECT project, address, trader, MIN(block_time) AS first_sell
            FROM recent_trades
            WHERE side = 'sell'
            GROUP BY 1, 2, 3
        ) s
            ON b.project = s.project
           AND b.trader = s.trader
           AND s.first_sell > b.first_buy
        LEFT JOIN trader_span ts
            ON b.project = ts.project
           AND b.trader = ts.trader
    ) f
    GROUP BY 1, 2
),

wash_pairs AS (
    SELECT
        b.project,
        b.address,
        b.trader
    FROM recent_trades b
    INNER JOIN recent_trades s
        ON b.project = s.project
       AND b.trader = s.trader
       AND b.side = 'buy'
       AND s.side = 'sell'
       AND s.block_time > b.block_time
       AND s.block_time <= b.block_time + interval '5' minute
       AND ABS(b.amount_usd - s.amount_usd) / NULLIF(b.amount_usd, 0) < 0.01
    WHERE b.block_time >= now() - interval '24' hour
    GROUP BY 1, 2, 3
    HAVING COUNT(*) >= 3
),

wash_rate_24h AS (
    SELECT
        v.project,
        v.address,
        COALESCE(COUNT(DISTINCT w.trader), 0) AS roundtrip_wallets_24h,
        ROUND(COALESCE(SUM(rt.amount_usd), 0), 2) AS roundtrip_touched_vol,
        ROUND(
            100.0 * COALESCE(SUM(rt.amount_usd), 0) / NULLIF(v.vol_24h, 0)
        , 1) AS roundtrip_vol_pct
    FROM (
        SELECT project, address, COALESCE(SUM(amount_usd), 0) AS vol_24h
        FROM recent_trades
        WHERE block_time >= now() - interval '24' hour
        GROUP BY 1, 2
    ) v
    LEFT JOIN wash_pairs w
        ON v.project = w.project
    LEFT JOIN recent_trades rt
        ON w.project = rt.project
       AND w.trader = rt.trader
       AND rt.block_time >= now() - interval '24' hour
    GROUP BY v.project, v.address, v.vol_24h
),

diamond_hands AS (
    SELECT
        project,
        address,
        ROUND(100.0 * SUM(CASE
            WHEN first_buy <= now() - interval '1' hour
             AND (first_sell IS NULL OR first_sell > first_buy + interval '1' hour)
            THEN 1 ELSE 0 END)
            / NULLIF(SUM(CASE WHEN first_buy <= now() - interval '1' hour THEN 1 ELSE 0 END), 0)
        , 1) AS survive_1h_pct,
        ROUND(100.0 * SUM(CASE
            WHEN first_buy <= now() - interval '1' day
             AND (first_sell IS NULL OR first_sell > first_buy + interval '1' day)
            THEN 1 ELSE 0 END)
            / NULLIF(SUM(CASE WHEN first_buy <= now() - interval '1' day THEN 1 ELSE 0 END), 0)
        , 1) AS survive_1d_pct,
        ROUND(100.0 * SUM(CASE
            WHEN first_buy <= now() - interval '3' day
             AND (first_sell IS NULL OR first_sell > first_buy + interval '3' day)
            THEN 1 ELSE 0 END)
            / NULLIF(SUM(CASE WHEN first_buy <= now() - interval '3' day THEN 1 ELSE 0 END), 0)
        , 1) AS survive_3d_pct,
        ROUND(100.0 * SUM(CASE
            WHEN first_buy <= now() - interval '7' day
             AND (first_sell IS NULL OR first_sell > first_buy + interval '7' day)
            THEN 1 ELSE 0 END)
            / NULLIF(SUM(CASE WHEN first_buy <= now() - interval '7' day THEN 1 ELSE 0 END), 0)
        , 1) AS survive_7d_pct,
        COUNT(*) AS first_buyers_30d
    FROM (
        SELECT
            fb.project,
            fb.address,
            fb.trader,
            fb.first_buy,
            MIN(rt.block_time) FILTER (
                WHERE rt.side = 'sell' AND rt.block_time > fb.first_buy
            ) AS first_sell
        FROM (
            SELECT project, address, trader, block_time AS first_buy
            FROM buy_ranked
            WHERE rn = 1
        ) fb
        LEFT JOIN recent_trades rt
            ON fb.project = rt.project
           AND fb.trader = rt.trader
        GROUP BY fb.project, fb.address, fb.trader, fb.first_buy
    ) c
    GROUP BY 1, 2
),

-- Chunk H: when did flow hit relative to the trade-price peak (same 24h trades)
hourly_flow_24h AS (
    SELECT
        rt.project,
        rt.address,
        date_trunc('hour', rt.block_time) AS hour_start,
        SUM(CASE WHEN rt.side = 'buy' THEN rt.amount_usd ELSE -rt.amount_usd END) AS net_usd,
        SUM(CASE
            WHEN rt.amount_usd >= wt.whale_min_usd AND rt.side = 'buy' THEN rt.amount_usd
            WHEN rt.amount_usd >= wt.whale_min_usd AND rt.side = 'sell' THEN -rt.amount_usd
            ELSE 0
        END) AS whale_net_usd,
        SUM(rt.amount_usd) AS vol_usd,
        MAX(rt.price_usd) AS high_price,
        MIN(rt.price_usd) AS low_price
    FROM recent_trades rt
    INNER JOIN whale_thresholds wt ON wt.project = rt.project
    WHERE rt.block_time >= now() - interval '24' hour
    GROUP BY 1, 2, 3
),

peak_hour AS (
    SELECT
        project,
        address,
        MAX_BY(hour_start, high_price) AS peak_hour,
        MAX(high_price) AS peak_price
    FROM hourly_flow_24h
    WHERE high_price IS NOT NULL
    GROUP BY 1, 2
),

timing_around_peak AS (
    SELECT
        p.project,
        p.address,
        p.peak_hour,
        p.peak_price,
        ROUND(COALESCE(h0.net_usd, 0), 2) AS net_at_peak_hour,
        ROUND(COALESCE(h0.whale_net_usd, 0), 2) AS whale_net_at_peak_hour,
        ROUND(COALESCE(h0.vol_usd, 0), 2) AS vol_at_peak_hour,
        ROUND(COALESCE(h1.net_usd, 0), 2) AS net_hour_after_peak,
        ROUND(COALESCE(h1.whale_net_usd, 0), 2) AS whale_net_hour_after_peak,
        ROUND(COALESCE(hm1.net_usd, 0), 2) AS net_hour_before_peak,
        ROUND(COALESCE(hm1.whale_net_usd, 0), 2) AS whale_net_hour_before_peak
    FROM peak_hour p
    LEFT JOIN hourly_flow_24h h0
        ON p.project = h0.project AND p.peak_hour = h0.hour_start
    LEFT JOIN hourly_flow_24h h1
        ON p.project = h1.project
       AND h1.hour_start = p.peak_hour + interval '1' hour
    LEFT JOIN hourly_flow_24h hm1
        ON p.project = hm1.project
       AND hm1.hour_start = p.peak_hour - interval '1' hour
),

worst_hour AS (
    SELECT
        project,
        address,
        MIN_BY(hour_start, net_usd) AS worst_net_hour,
        ROUND(MIN(net_usd), 2) AS worst_hour_net,
        ROUND(MIN_BY(whale_net_usd, net_usd), 2) AS whale_net_at_worst_hour,
        ROUND(MIN_BY(vol_usd, net_usd), 2) AS vol_at_worst_hour
    FROM hourly_flow_24h
    GROUP BY 1, 2
),

best_hour AS (
    SELECT
        project,
        address,
        MAX_BY(hour_start, net_usd) AS best_net_hour,
        ROUND(MAX(net_usd), 2) AS best_hour_net,
        ROUND(MAX_BY(whale_net_usd, net_usd), 2) AS whale_net_at_best_hour
    FROM hourly_flow_24h
    GROUP BY 1, 2
),

hourly_tape AS (
    SELECT
        project,
        address,
        array_join(
            array_agg(
                CONCAT(
                    format_datetime(hour_start, 'HH'),
                    ':',
                    CASE
                        WHEN net_usd >= 0 THEN '+'
                        ELSE ''
                    END,
                    CAST(ROUND(net_usd / 1000.0, 1) AS VARCHAR),
                    'k'
                )
                ORDER BY hour_start
            ),
            ' · '
        ) AS hourly_net_tape_24h,
        array_join(
            array_agg(
                CONCAT(
                    format_datetime(hour_start, 'HH'),
                    ':',
                    CASE
                        WHEN whale_net_usd >= 0 THEN '+'
                        ELSE ''
                    END,
                    CAST(ROUND(whale_net_usd / 1000.0, 1) AS VARCHAR),
                    'k'
                )
                ORDER BY hour_start
            ),
            ' · '
        ) AS hourly_whale_tape_24h
    FROM hourly_flow_24h
    GROUP BY 1, 2
),

-- Run-up = hour before peak + peak hour; Dump = worst net hour
runup_wallet_side AS (
    SELECT
        rt.project,
        rt.address,
        rt.trader,
        rt.side,
        SUM(rt.amount_usd) AS usd,
        COUNT(*) AS txs,
        MAX_BY(rt.tx_hash, rt.amount_usd) AS max_tx,
        ROW_NUMBER() OVER (
            PARTITION BY rt.project, rt.side
            ORDER BY SUM(rt.amount_usd) DESC
        ) AS rn
    FROM recent_trades rt
    INNER JOIN peak_hour p ON rt.project = p.project
    WHERE rt.block_time >= p.peak_hour - interval '1' hour
      AND rt.block_time < p.peak_hour + interval '1' hour
    GROUP BY 1, 2, 3, 4
),

dump_wallet_side AS (
    SELECT
        rt.project,
        rt.address,
        rt.trader,
        rt.side,
        SUM(rt.amount_usd) AS usd,
        COUNT(*) AS txs,
        MAX_BY(rt.tx_hash, rt.amount_usd) AS max_tx,
        ROW_NUMBER() OVER (
            PARTITION BY rt.project, rt.side
            ORDER BY SUM(rt.amount_usd) DESC
        ) AS rn
    FROM recent_trades rt
    INNER JOIN worst_hour w ON rt.project = w.project
    WHERE rt.block_time >= w.worst_net_hour
      AND rt.block_time < w.worst_net_hour + interval '1' hour
    GROUP BY 1, 2, 3, 4
),

runup_summary AS (
    SELECT
        project,
        address,
        ROUND(COALESCE(SUM(CASE WHEN side = 'buy' THEN usd END), 0), 2) AS buy_usd,
        ROUND(COALESCE(SUM(CASE WHEN side = 'sell' THEN usd END), 0), 2) AS sell_usd,
        ROUND(
            COALESCE(SUM(CASE WHEN side = 'buy' THEN usd END), 0)
            - COALESCE(SUM(CASE WHEN side = 'sell' THEN usd END), 0)
        , 2) AS net_usd,
        COUNT(DISTINCT CASE WHEN side = 'buy' THEN trader END) AS buyers,
        COUNT(DISTINCT CASE WHEN side = 'sell' THEN trader END) AS sellers
    FROM runup_wallet_side
    GROUP BY 1, 2
),

dump_summary AS (
    SELECT
        project,
        address,
        ROUND(COALESCE(SUM(CASE WHEN side = 'buy' THEN usd END), 0), 2) AS buy_usd,
        ROUND(COALESCE(SUM(CASE WHEN side = 'sell' THEN usd END), 0), 2) AS sell_usd,
        ROUND(
            COALESCE(SUM(CASE WHEN side = 'buy' THEN usd END), 0)
            - COALESCE(SUM(CASE WHEN side = 'sell' THEN usd END), 0)
        , 2) AS net_usd,
        COUNT(DISTINCT CASE WHEN side = 'buy' THEN trader END) AS buyers,
        COUNT(DISTINCT CASE WHEN side = 'sell' THEN trader END) AS sellers
    FROM dump_wallet_side
    GROUP BY 1, 2
),

runup_dump_lists AS (
    SELECT
        COALESCE(rb.project, rs.project, db.project, ds.project) AS project,
        COALESCE(rb.address, rs.address, db.address, ds.address) AS address,
        rb.top_buyers AS runup_top_buyers,
        rs.top_sellers AS runup_top_sellers,
        db.top_buyers AS dump_top_buyers,
        ds.top_sellers AS dump_top_sellers
    FROM (
        SELECT
            project,
            address,
            array_join(
                array_agg(
                    CONCAT(
                        '0x', LOWER(to_hex(trader)),
                        ' · $', CAST(CAST(ROUND(usd) AS BIGINT) AS VARCHAR),
                        ' · ', CAST(txs AS VARCHAR), 'tx',
                        ' · tx0x', LOWER(to_hex(max_tx))
                    )
                    ORDER BY rn
                ),
                ' | '
            ) AS top_buyers
        FROM runup_wallet_side
        WHERE side = 'buy' AND rn <= 5
        GROUP BY 1, 2
    ) rb
    FULL OUTER JOIN (
        SELECT
            project,
            address,
            array_join(
                array_agg(
                    CONCAT(
                        '0x', LOWER(to_hex(trader)),
                        ' · $', CAST(CAST(ROUND(usd) AS BIGINT) AS VARCHAR),
                        ' · ', CAST(txs AS VARCHAR), 'tx',
                        ' · tx0x', LOWER(to_hex(max_tx))
                    )
                    ORDER BY rn
                ),
                ' | '
            ) AS top_sellers
        FROM runup_wallet_side
        WHERE side = 'sell' AND rn <= 5
        GROUP BY 1, 2
    ) rs ON rb.project = rs.project
    FULL OUTER JOIN (
        SELECT
            project,
            address,
            array_join(
                array_agg(
                    CONCAT(
                        '0x', LOWER(to_hex(trader)),
                        ' · $', CAST(CAST(ROUND(usd) AS BIGINT) AS VARCHAR),
                        ' · ', CAST(txs AS VARCHAR), 'tx',
                        ' · tx0x', LOWER(to_hex(max_tx))
                    )
                    ORDER BY rn
                ),
                ' | '
            ) AS top_buyers
        FROM dump_wallet_side
        WHERE side = 'buy' AND rn <= 5
        GROUP BY 1, 2
    ) db ON COALESCE(rb.project, rs.project) = db.project
    FULL OUTER JOIN (
        SELECT
            project,
            address,
            array_join(
                array_agg(
                    CONCAT(
                        '0x', LOWER(to_hex(trader)),
                        ' · $', CAST(CAST(ROUND(usd) AS BIGINT) AS VARCHAR),
                        ' · ', CAST(txs AS VARCHAR), 'tx',
                        ' · tx0x', LOWER(to_hex(max_tx))
                    )
                    ORDER BY rn
                ),
                ' | '
            ) AS top_sellers
        FROM dump_wallet_side
        WHERE side = 'sell' AND rn <= 5
        GROUP BY 1, 2
    ) ds ON COALESCE(rb.project, rs.project, db.project) = ds.project
),

-- Chunk I: closed PnL from data
-- matched_amt = LEAST(buy_tokens, sell_tokens) in the window
-- buy_vwap = buy_usd / buy_tokens ; sell_vwap = sell_usd / sell_tokens
-- closed_pnl_usd = matched_amt * (sell_vwap - buy_vwap)
-- Only wallets with both buy and sell tokens in-window. Not tax lots / not FIFO across history.
wallet_flow_30d AS (
    SELECT
        project,
        address,
        trader,
        COALESCE(SUM(amount_usd) FILTER (WHERE side = 'buy'), 0) AS buy_usd,
        COALESCE(SUM(amount_usd) FILTER (WHERE side = 'sell'), 0) AS sell_usd,
        COALESCE(SUM(clawd_amt) FILTER (WHERE side = 'buy'), 0) AS buy_amt,
        COALESCE(SUM(clawd_amt) FILTER (WHERE side = 'sell'), 0) AS sell_amt,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'buy' AND block_time >= now() - interval '24' hour
        ), 0) AS buy_usd_24h,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'sell' AND block_time >= now() - interval '24' hour
        ), 0) AS sell_usd_24h,
        COALESCE(SUM(clawd_amt) FILTER (
            WHERE side = 'buy' AND block_time >= now() - interval '24' hour
        ), 0) AS buy_amt_24h,
        COALESCE(SUM(clawd_amt) FILTER (
            WHERE side = 'sell' AND block_time >= now() - interval '24' hour
        ), 0) AS sell_amt_24h
    FROM recent_trades
    WHERE clawd_amt IS NOT NULL
      AND clawd_amt > 0
      AND amount_usd > 0
    GROUP BY 1, 2, 3
),

wallet_closed_pnl AS (
    SELECT
        project,
        address,
        trader,
        buy_usd,
        sell_usd,
        buy_amt,
        sell_amt,
        LEAST(buy_amt, sell_amt) AS matched_amt,
        CASE WHEN buy_amt > 0 THEN buy_usd / buy_amt END AS buy_vwap,
        CASE WHEN sell_amt > 0 THEN sell_usd / sell_amt END AS sell_vwap,
        CASE
            WHEN buy_amt > 0 AND sell_amt > 0 THEN
                LEAST(buy_amt, sell_amt) * ((sell_usd / sell_amt) - (buy_usd / buy_amt))
            ELSE NULL
        END AS closed_pnl_usd,
        CASE
            WHEN buy_amt_24h > 0 AND sell_amt_24h > 0 THEN
                LEAST(buy_amt_24h, sell_amt_24h)
                * ((sell_usd_24h / sell_amt_24h) - (buy_usd_24h / buy_amt_24h))
            ELSE NULL
        END AS closed_pnl_usd_24h,
        CASE WHEN buy_amt_24h > 0 THEN buy_usd_24h / buy_amt_24h END AS buy_vwap_24h,
        CASE WHEN sell_amt_24h > 0 THEN sell_usd_24h / sell_amt_24h END AS sell_vwap_24h
    FROM wallet_flow_30d
),

pnl_summary AS (
    SELECT
        project,
        address,
        COUNT(*) FILTER (WHERE closed_pnl_usd IS NOT NULL) AS closed_wallets_30d,
        COUNT(*) FILTER (WHERE closed_pnl_usd > 0) AS pnl_winners_30d,
        COUNT(*) FILTER (WHERE closed_pnl_usd < 0) AS pnl_losers_30d,
        ROUND(COALESCE(SUM(closed_pnl_usd) FILTER (WHERE closed_pnl_usd > 0), 0), 2) AS realized_gains_30d,
        ROUND(COALESCE(SUM(ABS(closed_pnl_usd)) FILTER (WHERE closed_pnl_usd < 0), 0), 2) AS realized_losses_30d,
        ROUND(COALESCE(SUM(closed_pnl_usd), 0), 2) AS net_closed_pnl_30d,
        CASE
            WHEN COUNT(*) FILTER (WHERE closed_pnl_usd IS NOT NULL) = 0 THEN NULL
            ELSE ROUND(
                100.0 * COUNT(*) FILTER (WHERE closed_pnl_usd > 0)
                / COUNT(*) FILTER (WHERE closed_pnl_usd IS NOT NULL)
            , 1)
        END AS winner_pct_30d,
        COUNT(*) FILTER (WHERE closed_pnl_usd_24h IS NOT NULL) AS closed_wallets_24h,
        COUNT(*) FILTER (WHERE closed_pnl_usd_24h > 0) AS pnl_winners_24h,
        COUNT(*) FILTER (WHERE closed_pnl_usd_24h < 0) AS pnl_losers_24h,
        ROUND(COALESCE(SUM(closed_pnl_usd_24h) FILTER (WHERE closed_pnl_usd_24h > 0), 0), 2) AS realized_gains_24h,
        ROUND(COALESCE(SUM(ABS(closed_pnl_usd_24h)) FILTER (WHERE closed_pnl_usd_24h < 0), 0), 2) AS realized_losses_24h,
        ROUND(COALESCE(SUM(closed_pnl_usd_24h), 0), 2) AS net_closed_pnl_24h,
        CASE
            WHEN COUNT(*) FILTER (WHERE closed_pnl_usd_24h IS NOT NULL) = 0 THEN NULL
            ELSE ROUND(
                100.0 * COUNT(*) FILTER (WHERE closed_pnl_usd_24h > 0)
                / COUNT(*) FILTER (WHERE closed_pnl_usd_24h IS NOT NULL)
            , 1)
        END AS winner_pct_24h
    FROM wallet_closed_pnl
    GROUP BY 1, 2
),

pnl_lists AS (
    SELECT
        COALESCE(w.project, l.project) AS project,
        COALESCE(w.address, l.address) AS address,
        w.top_winners_24h,
        l.top_losers_24h
    FROM (
        SELECT
            project,
            address,
            array_join(
                array_agg(
                    CONCAT(
                        '0x', LOWER(to_hex(trader)),
                        ' · +$', CAST(CAST(ROUND(closed_pnl_usd_24h) AS BIGINT) AS VARCHAR),
                        ' · buyVWAP ', CAST(ROUND(buy_vwap_24h, 10) AS VARCHAR),
                        ' · sellVWAP ', CAST(ROUND(sell_vwap_24h, 10) AS VARCHAR)
                    )
                    ORDER BY rn
                ),
                ' | '
            ) AS top_winners_24h
        FROM (
            SELECT
                project,
                address,
                trader,
                closed_pnl_usd_24h,
                buy_vwap_24h,
                sell_vwap_24h,
                ROW_NUMBER() OVER (
                    PARTITION BY project ORDER BY closed_pnl_usd_24h DESC
                ) AS rn
            FROM wallet_closed_pnl
            WHERE closed_pnl_usd_24h IS NOT NULL
              AND closed_pnl_usd_24h > 0
        ) x
        WHERE rn <= 5
        GROUP BY 1, 2
    ) w
    FULL OUTER JOIN (
        SELECT
            project,
            address,
            array_join(
                array_agg(
                    CONCAT(
                        '0x', LOWER(to_hex(trader)),
                        ' · -$', CAST(CAST(ROUND(ABS(closed_pnl_usd_24h)) AS BIGINT) AS VARCHAR),
                        ' · buyVWAP ', CAST(ROUND(buy_vwap_24h, 10) AS VARCHAR),
                        ' · sellVWAP ', CAST(ROUND(sell_vwap_24h, 10) AS VARCHAR)
                    )
                    ORDER BY rn
                ),
                ' | '
            ) AS top_losers_24h
        FROM (
            SELECT
                project,
                address,
                trader,
                closed_pnl_usd_24h,
                buy_vwap_24h,
                sell_vwap_24h,
                ROW_NUMBER() OVER (
                    PARTITION BY project ORDER BY closed_pnl_usd_24h ASC
                ) AS rn
            FROM wallet_closed_pnl
            WHERE closed_pnl_usd_24h IS NOT NULL
              AND closed_pnl_usd_24h < 0
        ) y
        WHERE rn <= 5
        GROUP BY 1, 2
    ) l ON w.project = l.project
)

SELECT
    COALESCE(ap.project, fp.project) AS "Project",
    COALESCE(ap.address, fp.address) AS "Address",

    COALESCE(ap.wallets_15m, 0) AS "Wallets 15m",
    COALESCE(ap.txs_15m, 0)     AS "Txs 15m",
    ROUND(COALESCE(fp.buy_usd_15m, 0), 2)  AS "Buy USD 15m",
    ROUND(COALESCE(fp.sell_usd_15m, 0), 2) AS "Sell USD 15m",
    ROUND(COALESCE(fp.buy_usd_15m, 0) - COALESCE(fp.sell_usd_15m, 0), 2) AS "Net USD 15m",
    ROUND(COALESCE(fp.max_trade_usd_15m, 0), 2) AS "Max Trade USD 15m",

    COALESCE(ap.wallets_1h, 0) AS "Wallets 1h",
    COALESCE(ap.txs_1h, 0)     AS "Txs 1h",
    ROUND(COALESCE(fp.buy_usd_1h, 0), 2)  AS "Buy USD 1h",
    ROUND(COALESCE(fp.sell_usd_1h, 0), 2) AS "Sell USD 1h",
    ROUND(COALESCE(fp.buy_usd_1h, 0) - COALESCE(fp.sell_usd_1h, 0), 2) AS "Net USD 1h",
    ROUND(COALESCE(fp.max_trade_usd_1h, 0), 2) AS "Max Trade USD 1h",
    COALESCE(fp.buyers_1h, 0)  AS "Buyers 1h",
    COALESCE(fp.sellers_1h, 0) AS "Sellers 1h",
    CASE
        WHEN COALESCE(fp.buy_usd_1h, 0) + COALESCE(fp.sell_usd_1h, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * fp.buy_usd_1h / (fp.buy_usd_1h + fp.sell_usd_1h), 1)
    END AS "Buy Vol % 1h",

    COALESCE(ap.wallets_6h, 0) AS "Wallets 6h",
    COALESCE(ap.txs_6h, 0)     AS "Txs 6h",
    ROUND(COALESCE(fp.buy_usd_6h, 0), 2)  AS "Buy USD 6h",
    ROUND(COALESCE(fp.sell_usd_6h, 0), 2) AS "Sell USD 6h",
    ROUND(COALESCE(fp.buy_usd_6h, 0) - COALESCE(fp.sell_usd_6h, 0), 2) AS "Net USD 6h",
    ROUND(COALESCE(fp.max_trade_usd_6h, 0), 2) AS "Max Trade USD 6h",
    COALESCE(fp.buyers_6h, 0)  AS "Buyers 6h",
    COALESCE(fp.sellers_6h, 0) AS "Sellers 6h",
    CASE
        WHEN COALESCE(fp.buy_usd_6h, 0) + COALESCE(fp.sell_usd_6h, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * fp.buy_usd_6h / (fp.buy_usd_6h + fp.sell_usd_6h), 1)
    END AS "Buy Vol % 6h",

    COALESCE(ap.wallets_24h, 0) AS "Wallets 24h",
    COALESCE(ap.txs_24h, 0)     AS "Txs 24h",
    ROUND(COALESCE(fp.buy_usd_24h, 0), 2)  AS "Buy USD 24h",
    ROUND(COALESCE(fp.sell_usd_24h, 0), 2) AS "Sell USD 24h",
    ROUND(COALESCE(fp.buy_usd_24h, 0) - COALESCE(fp.sell_usd_24h, 0), 2) AS "Net USD 24h",
    ROUND(COALESCE(fp.max_trade_usd_24h, 0), 2) AS "Max Trade USD 24h",
    COALESCE(fp.buyers_24h, 0)  AS "Buyers 24h",
    COALESCE(fp.sellers_24h, 0) AS "Sellers 24h",
    CASE
        WHEN COALESCE(fp.buy_usd_24h, 0) + COALESCE(fp.sell_usd_24h, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * fp.buy_usd_24h / (fp.buy_usd_24h + fp.sell_usd_24h), 1)
    END AS "Buy Vol % 24h",

    ROUND(COALESCE(fp.whale_min_usd, 0), 2) AS "Whale Min $",
    ROUND(COALESCE(fp.hump_min_usd, 0), 2)  AS "Hump Min $",

    ROUND(COALESCE(fp.whale_buy_usd_24h, 0) - COALESCE(fp.whale_sell_usd_24h, 0), 2) AS "Whale Net 24h",
    CASE
        WHEN COALESCE(fp.whale_buy_usd_24h, 0) + COALESCE(fp.whale_sell_usd_24h, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * fp.whale_buy_usd_24h / (fp.whale_buy_usd_24h + fp.whale_sell_usd_24h), 1)
    END AS "Accum % 24h",
    COALESCE(fp.whale_buyers_24h, 0)  AS "Whale Buyers 24h",
    COALESCE(fp.whale_sellers_24h, 0) AS "Whale Sellers 24h",
    ROUND(COALESCE(fp.hump_buy_usd_24h, 0) - COALESCE(fp.hump_sell_usd_24h, 0), 2) AS "Hump Net 24h",
    COALESCE(fp.hump_buyers_24h, 0)  AS "Hump Buyers 24h",
    COALESCE(fp.hump_sellers_24h, 0) AS "Hump Sellers 24h",
    ROUND(
        (COALESCE(fp.buy_usd_24h, 0) - COALESCE(fp.sell_usd_24h, 0))
        - (COALESCE(fp.whale_buy_usd_24h, 0) - COALESCE(fp.whale_sell_usd_24h, 0))
    , 2) AS "Retail Net 24h",
    CASE
        WHEN COALESCE(fp.buy_usd_24h, 0) + COALESCE(fp.sell_usd_24h, 0) = 0 THEN NULL
        ELSE ROUND(
            100.0 * (COALESCE(fp.whale_buy_usd_24h, 0) + COALESCE(fp.whale_sell_usd_24h, 0))
            / (fp.buy_usd_24h + fp.sell_usd_24h)
        , 1)
    END AS "Whale Vol % 24h",

    ROUND(COALESCE(fp.whale_buy_usd_7d, 0) - COALESCE(fp.whale_sell_usd_7d, 0), 2) AS "Whale Net 7d",
    CASE
        WHEN COALESCE(fp.whale_buy_usd_7d, 0) + COALESCE(fp.whale_sell_usd_7d, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * fp.whale_buy_usd_7d / (fp.whale_buy_usd_7d + fp.whale_sell_usd_7d), 1)
    END AS "Accum %",
    COALESCE(fp.whale_buyers_7d, 0)  AS "Whale Buyers 7d",
    COALESCE(fp.whale_sellers_7d, 0) AS "Whale Sellers 7d",
    ROUND(COALESCE(fp.hump_buy_usd_7d, 0) - COALESCE(fp.hump_sell_usd_7d, 0), 2) AS "Hump Net 7d",
    COALESCE(fp.hump_buyers_7d, 0)  AS "Hump Buyers 7d",
    COALESCE(fp.hump_sellers_7d, 0) AS "Hump Sellers 7d",
    ROUND(
        (COALESCE(fp.total_buy_usd_7d, 0) - COALESCE(fp.total_sell_usd_7d, 0))
        - (COALESCE(fp.whale_buy_usd_7d, 0) - COALESCE(fp.whale_sell_usd_7d, 0))
    , 2) AS "Retail Net 7d",
    CASE
        WHEN COALESCE(fp.total_buy_usd_7d, 0) + COALESCE(fp.total_sell_usd_7d, 0) = 0 THEN NULL
        ELSE ROUND(
            100.0 * (COALESCE(fp.whale_buy_usd_7d, 0) + COALESCE(fp.whale_sell_usd_7d, 0))
            / (fp.total_buy_usd_7d + fp.total_sell_usd_7d)
        , 1)
    END AS "Whale Vol %",
    CASE
        WHEN COALESCE(fp.total_buy_usd_7d, 0) + COALESCE(fp.total_sell_usd_7d, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * fp.total_buy_usd_7d / (fp.total_buy_usd_7d + fp.total_sell_usd_7d), 1)
    END AS "Buy Vol % 7d",

    -- Chunk D
    COALESCE(ap.wallets_7d, 0) AS "Wallets 7d",
    COALESCE(ap.txs_7d, 0)     AS "Txs 7d",
    ROUND(COALESCE(vw.vol_24h, 0), 2) AS "Vol 24h",
    ROUND(COALESCE(vw.vol_7d, 0), 2)  AS "Vol 7d",
    ROUND(COALESCE(vw.vol_30d, 0), 2) AS "Vol 30d",
    COALESCE(st.traders_24h, 0) AS "Traders 24h",
    COALESCE(st.traders_7d, 0)  AS "Traders 7d",
    COALESCE(st.traders_30d, 0) AS "Traders 30d",
    COALESCE(st.new_traders_7d, 0) AS "New Traders 7d",
    COALESCE(st.returning_traders_7d, 0) AS "Returning Traders 7d",
    CASE
        WHEN COALESCE(st.traders_7d, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * st.returning_traders_7d / st.traders_7d, 1)
    END AS "Returning % 7d",
    COALESCE(fs.first_buyers_24h, 0)  AS "1st Buyers 24h",
    COALESCE(fs.first_buyers_7d, 0)   AS "1st Buyers 7d",
    COALESCE(fs.first_buyers_30d, 0)  AS "1st Buyers 30d",
    COALESCE(fs.first_sellers_24h, 0) AS "1st Sellers 24h",
    COALESCE(fs.first_sellers_7d, 0)  AS "1st Sellers 7d",
    COALESCE(fs.first_sellers_30d, 0) AS "1st Sellers 30d",
    ROUND(
        CAST(COALESCE(fp.buyers_24h, 0) AS DOUBLE)
        / NULLIF(COALESCE(fp.sellers_24h, 0), 0)
    , 2) AS "Buy/Sell Ratio 24h",
    ROUND(
        CAST(COALESCE(fp.buyers_7d, 0) AS DOUBLE)
        / NULLIF(COALESCE(fp.sellers_7d, 0), 0)
    , 2) AS "Buy/Sell Ratio 7d",
    COALESCE(fp.buyers_7d, 0)  AS "Buyers 7d",
    COALESCE(fp.sellers_7d, 0) AS "Sellers 7d",
    COALESCE(vw.buyers_30d, 0)  AS "Buyers 30d",
    COALESCE(vw.sellers_30d, 0) AS "Sellers 30d",

    -- Chunk E intensity
    COALESCE(vw.trades_24h, 0) AS "Trades 24h",
    COALESCE(vw.trades_7d, 0)  AS "Trades 7d",
    COALESCE(vw.trades_30d, 0) AS "Trades 30d",
    ROUND(CAST(COALESCE(vw.vol_24h, 0) AS DOUBLE) / NULLIF(vw.trades_24h, 0), 2) AS "Vol/Tx 24h",
    ROUND(CAST(COALESCE(vw.vol_7d, 0) AS DOUBLE) / NULLIF(vw.trades_7d, 0), 2) AS "Vol/Tx 7d",
    ROUND(CAST(COALESCE(vw.vol_30d, 0) AS DOUBLE) / NULLIF(vw.trades_30d, 0), 2) AS "Vol/Tx 30d",
    ROUND(CAST(COALESCE(vw.trades_24h, 0) AS DOUBLE) / NULLIF(st.traders_24h, 0), 1) AS "Txs/Trader 24h",
    ROUND(CAST(COALESCE(vw.trades_7d, 0) AS DOUBLE) / NULLIF(st.traders_7d, 0), 1) AS "Txs/Trader 7d",
    ROUND(CAST(COALESCE(vw.trades_30d, 0) AS DOUBLE) / NULLIF(st.traders_30d, 0), 1) AS "Txs/Trader 30d",

    -- Chunk E wallet lens
    tf.top_buyers_24h  AS "Top Buyers 24h",
    tf.top_sellers_24h AS "Top Sellers 24h",
    tf.top_net_24h     AS "Top Net Accumulators 24h",
    tf.big_prints_24h  AS "Biggest Prints 24h",

    -- Chunk F WoW
    CASE
        WHEN COALESCE(ww.vol_prev, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * (ww.vol_this - ww.vol_prev) / ww.vol_prev, 1)
    END AS "Vol Grw %",
    CASE
        WHEN COALESCE(ww.txs_prev, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * (ww.txs_this - ww.txs_prev) / ww.txs_prev, 1)
    END AS "Tx Grw %",
    CASE
        WHEN COALESCE(ww.users_prev, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * (ww.users_this - ww.users_prev) / ww.users_prev, 1)
    END AS "User Grw %",
    CASE
        WHEN COALESCE(ra.traders_prev_week, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * ra.retained_traders / ra.traders_prev_week, 1)
    END AS "Retention %",
    COALESCE(ra.retained_traders, 0) AS "Retained Traders",
    COALESCE(ra.new_vs_prev_week, 0) AS "New vs Prev Week",
    ROUND(COALESCE(ww.vol_prev, 0), 2) AS "Vol Prev 7d",
    COALESCE(ww.txs_prev, 0) AS "Txs Prev 7d",
    COALESCE(ww.users_prev, 0) AS "Traders Prev 7d",

    -- Chunk F distribution / heat / flippers
    ROUND(COALESCE(dh.median_trade_24h, 0), 2) AS "Median Trade 24h",
    ROUND(COALESCE(dh.p90_trade_24h, 0), 2) AS "P90 Trade 24h",
    CASE
        WHEN COALESCE(dh.vol_24h, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * dh.vol_1h / dh.vol_24h, 1)
    END AS "Heat % 1h",
    CASE
        WHEN COALESCE(dh.vol_24h, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * dh.vol_6h / dh.vol_24h, 1)
    END AS "Heat % 6h",
    CASE
        WHEN COALESCE(dh.trades_24h, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * dh.trades_1h / dh.trades_24h, 1)
    END AS "Trade Heat % 1h",
    COALESCE(fl.flippers_24h, 0) AS "Flippers 24h",
    CASE
        WHEN COALESCE(st.traders_24h, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * fl.flippers_24h / st.traders_24h, 1)
    END AS "Flipper % 24h",
    COALESCE(wp.whale_traders_7d, 0) AS "Whale Traders 7d",
    COALESCE(wp.whale_traders_active_24h, 0) AS "Whale Active 24h",
    CASE
        WHEN COALESCE(wp.whale_traders_7d, 0) = 0 THEN NULL
        ELSE ROUND(100.0 * wp.whale_traders_active_24h / wp.whale_traders_7d, 1)
    END AS "Whale Persist %",

    -- Chunk G (suspected / estimated fingerprints — not proof of intent)
    COALESCE(u.size_uniformity_pct, 0) AS "Size Uniformity %",
    sc.size_cv AS "Size CV 24h",
    wpr.vol_per_1pct_move AS "Vol per 1% Move $",
    wpr.abs_move_pct AS "Abs Move % 24h",
    COALESCE(ss.longest_buy_streak, 0) AS "Longest Buy Streak",
    COALESCE(ss.longest_sell_streak, 0) AS "Longest Sell Streak",
    ROUND(fspeed.median_flip_mins, 0) AS "Median Flip Mins",
    ROUND(fspeed.median_flip_mins_new, 0) AS "Median Flip Mins New",
    ROUND(fspeed.median_flip_mins_returning, 0) AS "Median Flip Mins Returning",
    COALESCE(wr.roundtrip_wallets_24h, 0) AS "Round-trip Wallets 24h",
    wr.roundtrip_vol_pct AS "Round-trip Vol % 24h",
    dhnd.survive_1h_pct AS "Survive 1h %",
    dhnd.survive_1d_pct AS "Survive 1d %",
    dhnd.survive_3d_pct AS "Survive 3d %",
    dhnd.survive_7d_pct AS "Survive 7d %",
    COALESCE(dhnd.first_buyers_30d, 0) AS "1st Buyer Cohort 30d",

    -- Chunk H timing (trade-price peak from dex.trades — align to CG spike hour)
    CAST(tap.peak_hour AS VARCHAR) AS "Peak Price Hour",
    ROUND(tap.peak_price, 10) AS "Peak Trade Price",
    tap.net_hour_before_peak AS "Net Hour Before Peak",
    tap.whale_net_hour_before_peak AS "Whale Net Hour Before Peak",
    tap.net_at_peak_hour AS "Net At Peak Hour",
    tap.whale_net_at_peak_hour AS "Whale Net At Peak Hour",
    tap.vol_at_peak_hour AS "Vol At Peak Hour",
    tap.net_hour_after_peak AS "Net Hour After Peak",
    tap.whale_net_hour_after_peak AS "Whale Net Hour After Peak",
    CAST(wh.worst_net_hour AS VARCHAR) AS "Worst Net Hour",
    wh.worst_hour_net AS "Worst Hour Net $",
    wh.whale_net_at_worst_hour AS "Whale Net At Worst Hour",
    wh.vol_at_worst_hour AS "Vol At Worst Hour",
    CAST(bh.best_net_hour AS VARCHAR) AS "Best Net Hour",
    bh.best_hour_net AS "Best Hour Net $",
    bh.whale_net_at_best_hour AS "Whale Net At Best Hour",
    ht.hourly_net_tape_24h AS "Hourly Net Tape 24h",
    ht.hourly_whale_tape_24h AS "Hourly Whale Tape 24h",

    -- Chunk H2: who in run-up vs dump hour
    rus.buy_usd AS "Run-up Buy $",
    rus.sell_usd AS "Run-up Sell $",
    rus.net_usd AS "Run-up Net $",
    COALESCE(rus.buyers, 0) AS "Run-up Buyers",
    COALESCE(rus.sellers, 0) AS "Run-up Sellers",
    rdl.runup_top_buyers AS "Run-up Top Buyers",
    rdl.runup_top_sellers AS "Run-up Top Sellers",
    dus.buy_usd AS "Dump Hour Buy $",
    dus.sell_usd AS "Dump Hour Sell $",
    dus.net_usd AS "Dump Hour Net $",
    COALESCE(dus.buyers, 0) AS "Dump Hour Buyers",
    COALESCE(dus.sellers, 0) AS "Dump Hour Sellers",
    rdl.dump_top_buyers AS "Dump Hour Top Buyers",
    rdl.dump_top_sellers AS "Dump Hour Top Sellers",

    -- Chunk I: matched-token VWAP closed PnL (from trade $ + token amounts)
    COALESCE(ps.closed_wallets_24h, 0) AS "Closed Wallets 24h",
    COALESCE(ps.pnl_winners_24h, 0) AS "PnL Winners 24h",
    COALESCE(ps.pnl_losers_24h, 0) AS "PnL Losers 24h",
    ps.winner_pct_24h AS "Winner % 24h",
    ps.realized_gains_24h AS "Closed Gains $ 24h",
    ps.realized_losses_24h AS "Closed Losses $ 24h",
    ps.net_closed_pnl_24h AS "Net Closed PnL $ 24h",
    COALESCE(ps.closed_wallets_30d, 0) AS "Closed Wallets 30d",
    COALESCE(ps.pnl_winners_30d, 0) AS "PnL Winners 30d",
    COALESCE(ps.pnl_losers_30d, 0) AS "PnL Losers 30d",
    ps.winner_pct_30d AS "Winner % 30d",
    ps.realized_gains_30d AS "Closed Gains $ 30d",
    ps.realized_losses_30d AS "Closed Losses $ 30d",
    ps.net_closed_pnl_30d AS "Net Closed PnL $ 30d",
    pl.top_winners_24h AS "Top Closed Winners 24h",
    pl.top_losers_24h AS "Top Closed Losers 24h"
FROM activity_pulse ap
FULL OUTER JOIN flow_pulse fp
    ON ap.project = fp.project
LEFT JOIN stickiness st
    ON COALESCE(ap.project, fp.project) = st.project
LEFT JOIN first_side fs
    ON COALESCE(ap.project, fp.project) = fs.project
LEFT JOIN vol_windows vw
    ON COALESCE(ap.project, fp.project) = vw.project
LEFT JOIN top_flow tf
    ON COALESCE(ap.project, fp.project) = tf.project
LEFT JOIN wow_windows ww
    ON COALESCE(ap.project, fp.project) = ww.project
LEFT JOIN retention_agg ra
    ON COALESCE(ap.project, fp.project) = ra.project
LEFT JOIN dist_heat dh
    ON COALESCE(ap.project, fp.project) = dh.project
LEFT JOIN flippers_24h fl
    ON COALESCE(ap.project, fp.project) = fl.project
LEFT JOIN whale_persist wp
    ON COALESCE(ap.project, fp.project) = wp.project
LEFT JOIN uniformity_24h u
    ON COALESCE(ap.project, fp.project) = u.project
LEFT JOIN size_cv_24h sc
    ON COALESCE(ap.project, fp.project) = sc.project
LEFT JOIN wash_pressure_24h wpr
    ON COALESCE(ap.project, fp.project) = wpr.project
LEFT JOIN streak_stats ss
    ON COALESCE(ap.project, fp.project) = ss.project
LEFT JOIN flip_speed fspeed
    ON COALESCE(ap.project, fp.project) = fspeed.project
LEFT JOIN wash_rate_24h wr
    ON COALESCE(ap.project, fp.project) = wr.project
LEFT JOIN diamond_hands dhnd
    ON COALESCE(ap.project, fp.project) = dhnd.project
LEFT JOIN timing_around_peak tap
    ON COALESCE(ap.project, fp.project) = tap.project
LEFT JOIN worst_hour wh
    ON COALESCE(ap.project, fp.project) = wh.project
LEFT JOIN best_hour bh
    ON COALESCE(ap.project, fp.project) = bh.project
LEFT JOIN hourly_tape ht
    ON COALESCE(ap.project, fp.project) = ht.project
LEFT JOIN runup_summary rus
    ON COALESCE(ap.project, fp.project) = rus.project
LEFT JOIN dump_summary dus
    ON COALESCE(ap.project, fp.project) = dus.project
LEFT JOIN runup_dump_lists rdl
    ON COALESCE(ap.project, fp.project) = rdl.project
LEFT JOIN pnl_summary ps
    ON COALESCE(ap.project, fp.project) = ps.project
LEFT JOIN pnl_lists pl
    ON COALESCE(ap.project, fp.project) = pl.project

