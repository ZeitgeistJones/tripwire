-- ClawdWire — paste into Dune query 8180604 (replace body)
-- CLAWD only: 24h txs + 24h dex.trades
-- Windows: 15m / 1h / 6h / 24h $ flow, buyers/sellers, max trade, buy-vol %, $1k+ prints

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

-- 24h covers 15m / 1h / 6h / 24h dollar windows (still 1 token — no 90d / first-time)
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
      AND dt.block_time >= now() - interval '24' hour
),

flow_pulse AS (
    SELECT
        project,
        address,

        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'buy'  AND block_time >= now() - interval '15' minute
        ), 0) AS buy_usd_15m,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'sell' AND block_time >= now() - interval '15' minute
        ), 0) AS sell_usd_15m,
        MAX(amount_usd) FILTER (
            WHERE block_time >= now() - interval '15' minute
        ) AS max_trade_usd_15m,

        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'buy'  AND block_time >= now() - interval '1' hour
        ), 0) AS buy_usd_1h,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'sell' AND block_time >= now() - interval '1' hour
        ), 0) AS sell_usd_1h,
        MAX(amount_usd) FILTER (
            WHERE block_time >= now() - interval '1' hour
        ) AS max_trade_usd_1h,
        COUNT(DISTINCT trader) FILTER (
            WHERE side = 'buy'  AND block_time >= now() - interval '1' hour
        ) AS buyers_1h,
        COUNT(DISTINCT trader) FILTER (
            WHERE side = 'sell' AND block_time >= now() - interval '1' hour
        ) AS sellers_1h,

        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'buy'  AND block_time >= now() - interval '6' hour
        ), 0) AS buy_usd_6h,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'sell' AND block_time >= now() - interval '6' hour
        ), 0) AS sell_usd_6h,
        MAX(amount_usd) FILTER (
            WHERE block_time >= now() - interval '6' hour
        ) AS max_trade_usd_6h,
        COUNT(DISTINCT trader) FILTER (
            WHERE side = 'buy'  AND block_time >= now() - interval '6' hour
        ) AS buyers_6h,
        COUNT(DISTINCT trader) FILTER (
            WHERE side = 'sell' AND block_time >= now() - interval '6' hour
        ) AS sellers_6h,

        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'buy'  AND block_time >= now() - interval '24' hour
        ), 0) AS buy_usd_24h,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'sell' AND block_time >= now() - interval '24' hour
        ), 0) AS sell_usd_24h,
        MAX(amount_usd) FILTER (
            WHERE block_time >= now() - interval '24' hour
        ) AS max_trade_usd_24h,
        COUNT(DISTINCT trader) FILTER (
            WHERE side = 'buy'  AND block_time >= now() - interval '24' hour
        ) AS buyers_24h,
        COUNT(DISTINCT trader) FILTER (
            WHERE side = 'sell' AND block_time >= now() - interval '24' hour
        ) AS sellers_24h,

        -- Fixed $1k "size" prints (cheap stand-in for whale tiers on a live pulse)
        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'buy'  AND amount_usd >= 1000
              AND block_time >= now() - interval '24' hour
        ), 0) AS big_buy_usd_24h,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'sell' AND amount_usd >= 1000
              AND block_time >= now() - interval '24' hour
        ), 0) AS big_sell_usd_24h,
        COUNT(*) FILTER (
            WHERE side = 'buy'  AND amount_usd >= 1000
              AND block_time >= now() - interval '24' hour
        ) AS big_buys_24h,
        COUNT(*) FILTER (
            WHERE side = 'sell' AND amount_usd >= 1000
              AND block_time >= now() - interval '24' hour
        ) AS big_sells_24h
    FROM recent_trades
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
    ROUND(COALESCE(fp.big_buy_usd_24h, 0), 2)  AS "Big Buy USD 24h",
    ROUND(COALESCE(fp.big_sell_usd_24h, 0), 2) AS "Big Sell USD 24h",
    ROUND(COALESCE(fp.big_buy_usd_24h, 0) - COALESCE(fp.big_sell_usd_24h, 0), 2) AS "Big Net USD 24h",
    COALESCE(fp.big_buys_24h, 0)  AS "Big Buys 24h",
    COALESCE(fp.big_sells_24h, 0) AS "Big Sells 24h"
FROM activity_pulse ap
FULL OUTER JOIN flow_pulse fp
    ON ap.project = fp.project;
