-- ClawdWire V4 gap-fill SMOKE — debug 0-row runs. Do not materialize.
-- Paste into a throwaway Dune query. Shows how many CLAWD-moving txs hit each
-- filter stage so you can see where the main gap-fill drops to zero.
--
-- Expected: candidates > with_token >= with_payment >= not_in_dex.
-- If candidates = 0, venue list still misses the router.
-- If not_in_dex = 0 but with_payment > 0, dex.trades already has them (good).

WITH clawd AS (
    SELECT 0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07 AS address
),

swap_venues AS (
    SELECT addr FROM (VALUES
        (0x498581ff718922c3f8e6a244956af099b2652b2b),
        (0x6ff5693b99212da76ad316178a184ab56d299b43),
        (0xfdf682f51fe81aa4898f0ae2163d8a55c127fbc7),
        (0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad),
        (0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24),
        (0x2626664c2603336e57b271c5c0b26f421741e481)
    ) AS v(addr)
),

candidates AS (
    SELECT DISTINCT tx.hash AS tx_hash, tx."from" AS trader, CAST(tx.value AS DOUBLE) / 1e18 AS native_eth
    FROM base.transactions tx
    INNER JOIN swap_venues v ON tx."to" = v.addr
    WHERE tx.block_time >= now() - interval '30' day
      AND tx.success = true
),

with_token AS (
    SELECT
        ct.tx_hash,
        ct.trader,
        MAX(ct.native_eth) AS native_eth,
        SUM(
            CASE
                WHEN tr."to" = ct.trader THEN CAST(tr.value AS DOUBLE)
                WHEN tr."from" = ct.trader THEN -CAST(tr.value AS DOUBLE)
                ELSE 0.0
            END
        ) / 1e18 AS net_token
    FROM candidates ct
    INNER JOIN clawd c ON TRUE
    INNER JOIN erc20_base.evt_Transfer tr
        ON tr.evt_tx_hash = ct.tx_hash
       AND tr.contract_address = c.address
       AND tr.evt_block_time >= now() - interval '30' day
    GROUP BY 1, 2
    HAVING ABS(
        SUM(
            CASE
                WHEN tr."to" = ct.trader THEN CAST(tr.value AS DOUBLE)
                WHEN tr."from" = ct.trader THEN -CAST(tr.value AS DOUBLE)
                ELSE 0.0
            END
        ) / 1e18
    ) >= 1e-9
),

with_weth AS (
    SELECT
        wt.tx_hash,
        wt.trader,
        wt.native_eth,
        wt.net_token,
        COALESCE(SUM(CASE WHEN tr."from" = wt.trader THEN CAST(tr.value AS DOUBLE) END) / 1e18, 0) AS weth_out,
        COALESCE(SUM(CASE WHEN tr."to"   = wt.trader THEN CAST(tr.value AS DOUBLE) END) / 1e18, 0) AS weth_in
    FROM with_token wt
    LEFT JOIN erc20_base.evt_Transfer tr
        ON tr.evt_tx_hash = wt.tx_hash
       AND tr.contract_address = 0x4200000000000000000000000000000000000006
       AND tr.evt_block_time >= now() - interval '30' day
       AND (tr."from" = wt.trader OR tr."to" = wt.trader)
    GROUP BY 1, 2, 3, 4
),

with_payment AS (
    SELECT *
    FROM with_weth
    WHERE (net_token > 0 AND (native_eth > 0 OR weth_out > 0))
       OR (net_token < 0 AND weth_in > 0)
),

not_in_dex AS (
    SELECT wp.*
    FROM with_payment wp
    INNER JOIN clawd c ON TRUE
    WHERE NOT EXISTS (
        SELECT 1
        FROM dex.trades d
        WHERE d.blockchain = 'base'
          AND d.tx_hash = wp.tx_hash
          AND (d.token_bought_address = c.address OR d.token_sold_address = c.address)
          AND d.block_time >= now() - interval '30' day
          AND d.amount_usd IS NOT NULL
          AND d.amount_usd > 0
    )
)

SELECT
    (SELECT COUNT(*) FROM candidates) AS candidate_txs,
    (SELECT COUNT(*) FROM with_token) AS with_clawd_net,
    (SELECT COUNT(*) FROM with_payment) AS with_eth_or_weth_leg,
    (SELECT COUNT(*) FROM not_in_dex) AS gapfill_eligible;
