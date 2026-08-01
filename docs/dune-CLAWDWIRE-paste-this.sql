-- ClawdWire lab — paste into a NEW Dune query, then set CLAWD_WIRE_QUERY_ID in Vercel
-- Single token (CLAWD) so you can test pulse + $ flow cheaply before widening The Wire
-- 24h txs pulse + 6h dex.trades buy/sell USD (1h sliced from same 6h scan)

WITH clawd AS (
    SELECT address, name FROM (
        VALUES
        (0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07, 'CLAWD')
    ) AS t(address, name)
),

recent_tx AS (
    SELECT
        c.name   AS project,
        c.address AS address,
        t."from" AS wallet,
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

-- 6h only — covers 1h + 6h dollar windows without a 24h/90d trade scan
recent_trades AS (
    SELECT
        c.name AS project,
        c.address AS address,
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
      AND dt.block_time >= now() - interval '6' hour
),

flow_pulse AS (
    SELECT
        project,
        address,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'buy'  AND block_time >= now() - interval '1' hour
        ), 0) AS buy_usd_1h,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'sell' AND block_time >= now() - interval '1' hour
        ), 0) AS sell_usd_1h,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'buy'  AND block_time >= now() - interval '6' hour
        ), 0) AS buy_usd_6h,
        COALESCE(SUM(amount_usd) FILTER (
            WHERE side = 'sell' AND block_time >= now() - interval '6' hour
        ), 0) AS sell_usd_6h
    FROM recent_trades
    GROUP BY 1, 2
)

SELECT
    COALESCE(ap.project, fp.project)     AS "Project",
    COALESCE(ap.address, fp.address)     AS "Address",
    COALESCE(ap.wallets_15m, 0)          AS "Wallets 15m",
    COALESCE(ap.txs_15m, 0)              AS "Txs 15m",
    COALESCE(ap.wallets_1h, 0)           AS "Wallets 1h",
    COALESCE(ap.txs_1h, 0)               AS "Txs 1h",
    COALESCE(ap.wallets_6h, 0)           AS "Wallets 6h",
    COALESCE(ap.txs_6h, 0)               AS "Txs 6h",
    COALESCE(ap.wallets_24h, 0)          AS "Wallets 24h",
    COALESCE(ap.txs_24h, 0)              AS "Txs 24h",
    ROUND(COALESCE(fp.buy_usd_1h, 0), 2)  AS "Buy USD 1h",
    ROUND(COALESCE(fp.sell_usd_1h, 0), 2) AS "Sell USD 1h",
    ROUND(COALESCE(fp.buy_usd_1h, 0) - COALESCE(fp.sell_usd_1h, 0), 2) AS "Net USD 1h",
    ROUND(COALESCE(fp.buy_usd_6h, 0), 2)  AS "Buy USD 6h",
    ROUND(COALESCE(fp.sell_usd_6h, 0), 2) AS "Sell USD 6h",
    ROUND(COALESCE(fp.buy_usd_6h, 0) - COALESCE(fp.sell_usd_6h, 0), 2) AS "Net USD 6h"
FROM activity_pulse ap
FULL OUTER JOIN flow_pulse fp
    ON ap.project = fp.project;
