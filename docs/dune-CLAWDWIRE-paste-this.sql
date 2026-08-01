-- ClawdWire — paste into Dune query 8180604 (replace body)
-- CLAWD only: 7d txs + 30d dex.trades
-- Pulse $: 15m / 1h / 6h / 24h
-- Chunk C: whale / hump / retail 24h + 7d
-- Chunk D: stickiness (new/returning traders, 1st buy/sell, vol)
-- Chunk E: wallet lens (per-wallet $ + txs, top net, big prints) + intensity
-- Chunk E: wallet lens (per-wallet $ + txs, top net, biggest prints) + intensity

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
        END AS side
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

    -- Chunk E wallet lens (wallet · $ · txs · net · biggest-tx hint)
    tf.top_buyers_24h  AS "Top Buyers 24h",
    tf.top_sellers_24h AS "Top Sellers 24h",
    tf.top_net_24h     AS "Top Net Accumulators 24h",
    tf.big_prints_24h  AS "Biggest Prints 24h"
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
    ON COALESCE(ap.project, fp.project) = tf.project;
