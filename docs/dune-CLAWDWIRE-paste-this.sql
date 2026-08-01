-- ClawdWire — paste into Dune query 8180604 (replace body)
-- CLAWD only: 24h txs + 30d dex.trades (one trade scan)
-- Pulse $: 15m / 1h / 6h / 24h
-- Chunk C: whale / hump / retail 24h + 7d (thresholds = 30d percentiles, same floors as main)

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
      AND t.block_time >= now() - interval '24' hour
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
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '24' hour)   AS wallets_24h
    FROM recent_tx
    GROUP BY 1, 2
),

-- Single 30d CLAWD trade scan: short pulse windows + whale thresholds + 7d/24h tiers
recent_trades AS (
    SELECT
        c.name    AS project,
        c.address AS address,
        dt.taker  AS trader,
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
    END AS "Buy Vol % 7d"
FROM activity_pulse ap
FULL OUTER JOIN flow_pulse fp
    ON ap.project = fp.project;
