-- ClawdWire V4 / Clanker gap-fill — SEPARATE query / materialized view.
-- Do NOT paste into the main ClawdWire pulse query (stage limit).
--
-- Purpose: catch buys/sells that dex.trades misses when Uniswap V4 hooks
-- zero Swap event deltas (Clanker fee lockers), while avoiding false positives
-- from plain transfers / airdrops.
--
-- Guardrails:
--   * Only txs that touch a known swap router / Uniswap V4 PoolManager
--   * Net token flow per (tx, initiator), priced from native ETH or WETH
--   * Skip tx hashes already present in dex.trades for this token
--
-- Params (same as any-token pulse):
--   token_address  TEXT
--   token_name     TEXT

WITH clawd AS (
    SELECT
        from_hex(regexp_replace(lower(trim('{{token_address}}')), '^0x', '')) AS address,
        trim('{{token_name}}') AS name
),

-- Known swap entrypoints on Base (routers / singleton). Extend as needed.
swap_venues AS (
    SELECT * FROM (VALUES
        (0x498581ff718922c3f8e6a244956af099b2652b2b), -- Uniswap V4 PoolManager (Base)
        (0x66a9893cc07d91d95644aedd05d03f95e1dba8af), -- Uniswap V4 PoolManager (alt / legacy)
        (0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24), -- Uniswap V3 SwapRouter
        (0x2626664c2603336e57b271c5c0b26f421741e481), -- Uniswap V3 SwapRouter02
        (0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad)  -- Uniswap Universal Router
    ) AS v(addr)
),

-- Txs that both moved this token and hit a known swap venue.
candidate_txs AS (
    SELECT DISTINCT
        tx.hash AS tx_hash,
        tx."from" AS trader,
        tx.block_time
    FROM base.transactions tx
    INNER JOIN swap_venues v ON tx."to" = v.addr
    WHERE tx.block_time >= now() - interval '7' day
      AND tx.success = true
),

-- Net token flow to/from the initiator within candidate swap txs.
net_token AS (
    SELECT
        c.name AS project,
        c.address,
        ct.trader,
        ct.tx_hash,
        MAX(ct.block_time) AS block_time,
        SUM(
            CASE
                WHEN tr."to" = ct.trader THEN CAST(tr.value AS DOUBLE)
                WHEN tr."from" = ct.trader THEN -CAST(tr.value AS DOUBLE)
                ELSE 0.0
            END
        ) / 1e18 AS net_token
    FROM candidate_txs ct
    INNER JOIN clawd c ON TRUE
    INNER JOIN erc20_base.evt_Transfer tr
        ON tr.evt_tx_hash = ct.tx_hash
       AND tr.contract_address = c.address
    GROUP BY 1, 2, 3, 4
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

-- Payment side: native ETH value or WETH moved by the initiator in the same tx.
payment AS (
    SELECT
        nt.project,
        nt.address,
        nt.trader,
        nt.tx_hash,
        nt.block_time,
        nt.net_token,
        COALESCE(tx.value_eth, 0) AS native_eth,
        COALESCE(wo.weth_out, 0) AS weth_out,
        COALESCE(wi.weth_in, 0) AS weth_in
    FROM net_token nt
    LEFT JOIN (
        SELECT hash AS tx_hash, CAST(value AS DOUBLE) / 1e18 AS value_eth
        FROM base.transactions
        WHERE block_time >= now() - interval '7' day
    ) tx ON tx.tx_hash = nt.tx_hash
    LEFT JOIN (
        SELECT
            tr.evt_tx_hash AS tx_hash,
            tr."from" AS trader,
            SUM(CAST(tr.value AS DOUBLE) / 1e18) AS weth_out
        FROM erc20_base.evt_Transfer tr
        WHERE tr.contract_address = 0x4200000000000000000000000000000000000006
          AND tr.evt_block_time >= now() - interval '7' day
        GROUP BY 1, 2
    ) wo ON wo.tx_hash = nt.tx_hash AND wo.trader = nt.trader
    LEFT JOIN (
        SELECT
            tr.evt_tx_hash AS tx_hash,
            tr."to" AS trader,
            SUM(CAST(tr.value AS DOUBLE) / 1e18) AS weth_in
        FROM erc20_base.evt_Transfer tr
        WHERE tr.contract_address = 0x4200000000000000000000000000000000000006
          AND tr.evt_block_time >= now() - interval '7' day
        GROUP BY 1, 2
    ) wi ON wi.tx_hash = nt.tx_hash AND wi.trader = nt.trader
),

fills AS (
    SELECT
        p.*,
        CASE
            WHEN p.net_token > 0 THEN
                CASE WHEN p.native_eth > 0 THEN p.native_eth ELSE p.weth_out END
            ELSE p.weth_in
        END AS eth_amt
    FROM payment p
    WHERE (
            (p.net_token > 0 AND (p.native_eth > 0 OR p.weth_out > 0))
         OR (p.net_token < 0 AND p.weth_in > 0)
          )
      AND NOT EXISTS (
          SELECT 1
          FROM dex.trades d
          WHERE d.blockchain = 'base'
            AND d.tx_hash = p.tx_hash
            AND (d.token_bought_address = p.address OR d.token_sold_address = p.address)
            AND d.block_time >= now() - interval '7' day
            AND d.amount_usd IS NOT NULL
            AND d.amount_usd > 0
      )
)

SELECT
    f.project AS "Project",
    bytearray_to_hex(f.address) AS "Address",
    bytearray_to_hex(f.trader) AS "Trader",
    bytearray_to_hex(f.tx_hash) AS "Tx Hash",
    f.block_time AS "Block Time",
    CASE WHEN f.net_token > 0 THEN 'buy' ELSE 'sell' END AS "Side",
    ABS(f.net_token) AS "Token Amt",
    f.eth_amt AS "ETH Amt",
    f.eth_amt * pr.price AS "Amount USD"
FROM fills f
INNER JOIN prices.usd pr
    ON pr.blockchain = 'base'
   AND pr.contract_address = 0x4200000000000000000000000000000000000006
   AND pr.minute = date_trunc('minute', f.block_time)
WHERE f.eth_amt > 0
  AND pr.price IS NOT NULL
  AND pr.price > 0
ORDER BY f.block_time DESC;
