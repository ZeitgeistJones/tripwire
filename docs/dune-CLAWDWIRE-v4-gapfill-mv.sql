-- ClawdWire V4 / Clanker gap-fill — SEPARATE query or materialized view.
-- Do NOT paste into the main ClawdWire pulse query (stage limit).
--
-- Purpose: catch buys/sells that dex.trades misses when Uniswap V4 hooks
-- zero Swap event deltas (Clanker fee lockers).
--
-- Suggested use later:
--   1) Save as its own Dune query / refresh as an MV on a schedule
--   2) Join from the pulse query by token address + time window
-- For now the main pulse stays on dex.trades only so Trip can execute.
--
-- Params (same as any-token pulse):
--   token_address  TEXT
--   token_name     TEXT

WITH clawd AS (
    SELECT
        from_hex(regexp_replace(lower(trim('{{token_address}}')), '^0x', '')) AS address,
        trim('{{token_name}}') AS name
),

fills AS (
    SELECT
        c.name AS project,
        c.address,
        tx."from" AS trader,
        tr.evt_tx_hash AS tx_hash,
        MAX(tr.evt_block_time) AS block_time,
        SUM(
            CASE
                WHEN tr."to" = tx."from" THEN CAST(tr.value AS DOUBLE)
                WHEN tr."from" = tx."from" THEN -CAST(tr.value AS DOUBLE)
                ELSE 0.0
            END
        ) / 1e18 AS net_token,
        MAX(CAST(tx.value AS DOUBLE) / 1e18) AS native_eth
    FROM erc20_base.evt_Transfer tr
    INNER JOIN clawd c ON tr.contract_address = c.address
    INNER JOIN base.transactions tx
        ON tx.hash = tr.evt_tx_hash
       AND tx.block_time >= now() - interval '7' day
    WHERE tr.evt_block_time >= now() - interval '7' day
    GROUP BY 1, 2, 3, 4
    HAVING ABS(
        SUM(
            CASE
                WHEN tr."to" = tx."from" THEN CAST(tr.value AS DOUBLE)
                WHEN tr."from" = tx."from" THEN -CAST(tr.value AS DOUBLE)
                ELSE 0.0
            END
        ) / 1e18
    ) >= 1e-9
)

SELECT
    f.project AS "Project",
    bytearray_to_hex(f.address) AS "Address",
    bytearray_to_hex(f.trader) AS "Trader",
    bytearray_to_hex(f.tx_hash) AS "Tx Hash",
    f.block_time AS "Block Time",
    CASE WHEN f.net_token > 0 THEN 'buy' ELSE 'sell' END AS "Side",
    ABS(f.net_token) AS "Token Amt",
    f.native_eth AS "Native ETH",
    f.native_eth * p.price AS "Amount USD"
FROM fills f
INNER JOIN prices.usd p
    ON p.blockchain = 'base'
   AND p.contract_address = 0x4200000000000000000000000000000000000006
   AND p.minute = date_trunc('minute', f.block_time)
WHERE f.net_token > 0
  AND f.native_eth > 0
  AND p.price IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dex.trades d
      WHERE d.blockchain = 'base'
        AND d.tx_hash = f.tx_hash
        AND (d.token_bought_address = f.address OR d.token_sold_address = f.address)
        AND d.block_time >= now() - interval '7' day
        AND d.amount_usd IS NOT NULL
        AND d.amount_usd > 0
  )
ORDER BY f.block_time DESC;
