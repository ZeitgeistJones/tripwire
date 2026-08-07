-- ClawdWire V4 / Clanker gap-fill - CLAWD ONLY - materialize this query.
-- Do NOT paste into the main ClawdWire pulse (stage limit).
--
-- ESTIMATE: transfer-netting with ETH/WETH payment legs. V4 flash accounting
-- can leave dust / cleared deltas; treat amount_usd as approximate.
--
-- Purpose: catch buys/sells that dex.trades misses when Uniswap V4 hooks
-- zero Swap event deltas (Clanker fee lockers), without counting airdrops
-- or plain sends as trades.
--
-- Guardrails:
--   * Only txs whose top-level "to" is a known Base swap venue
--   * Net CLAWD flow per (tx, initiator)
--   * Require native ETH or WETH payment leg matching buy/sell side
--   * Skip tx hashes already in dex.trades for CLAWD
--
-- Dune steps:
--   1) New blank query -> paste this WHOLE file (must start with WITH or --)
--   2) Run once. 0 rows can mean all CLAWD swaps already sit in dex.trades,
--      or venues still miss the router your frontend calls — run
--      docs/dune-CLAWDWIRE-v4-gapfill-smoke.sql to see candidate tx counts.
--   3) Materialize as: result_clawdwire_v4_gapfill (~daily)
--   4) In docs/dune-CLAWDWIRE-any-token.sql, uncomment the V4 UNION and replace
--      YOUR_DUNE_USER with your Dune username/team
--
-- Output grain matches pulse recent_trades (lowercase aliases for the MV table).

WITH clawd AS (
    SELECT
        0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07 AS address,
        CAST('CLAWD' AS VARCHAR) AS name
),

-- Base swap entrypoints end-users actually call (tx.to).
swap_venues AS (
    SELECT addr FROM (VALUES
        (0x498581ff718922c3f8e6a244956af099b2652b2b), -- Uniswap V4 PoolManager
        (0x6ff5693b99212da76ad316178a184ab56d299b43), -- Uniswap V4 Universal Router (Base)
        (0xfdf682f51fe81aa4898f0ae2163d8a55c127fbc7), -- Uniswap Universal Router 2.1.1 (Base)
        (0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad), -- Legacy Universal Router (still used)
        (0x4752ba5dbc23f44d87826276bf6fd6b1c372ad24), -- Uniswap V3 SwapRouter
        (0x2626664c2603336e57b271c5c0b26f421741e481)  -- Uniswap V3 SwapRouter02
    ) AS v(addr)
),

candidate_txs AS (
    SELECT DISTINCT
        tx.hash AS tx_hash,
        tx."from" AS trader,
        tx.block_time,
        CAST(tx.value AS DOUBLE) / 1e18 AS native_eth
    FROM base.transactions tx
    INNER JOIN swap_venues v ON tx."to" = v.addr
    WHERE tx.block_time >= now() - interval '30' day
      AND tx.success = true
),

net_token AS (
    SELECT
        c.name AS project,
        c.address,
        ct.trader,
        ct.tx_hash,
        MAX(ct.block_time) AS block_time,
        MAX(ct.native_eth) AS native_eth,
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
       AND tr.evt_block_time >= now() - interval '30' day
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

weth_legs AS (
    SELECT
        tr.evt_tx_hash AS tx_hash,
        SUM(CASE WHEN tr."from" = nt.trader THEN CAST(tr.value AS DOUBLE) ELSE 0 END) / 1e18 AS weth_out,
        SUM(CASE WHEN tr."to"   = nt.trader THEN CAST(tr.value AS DOUBLE) ELSE 0 END) / 1e18 AS weth_in
    FROM net_token nt
    INNER JOIN erc20_base.evt_Transfer tr
        ON tr.evt_tx_hash = nt.tx_hash
       AND tr.contract_address = 0x4200000000000000000000000000000000000006
       AND tr.evt_block_time >= now() - interval '30' day
       AND (tr."from" = nt.trader OR tr."to" = nt.trader)
    GROUP BY 1
),

fills AS (
    SELECT
        nt.project,
        nt.address,
        nt.trader,
        nt.tx_hash,
        nt.block_time,
        nt.net_token,
        CASE
            WHEN nt.net_token > 0 THEN
                CASE WHEN nt.native_eth > 0 THEN nt.native_eth ELSE COALESCE(w.weth_out, 0) END
            ELSE COALESCE(w.weth_in, 0)
        END AS eth_amt
    FROM net_token nt
    LEFT JOIN weth_legs w ON w.tx_hash = nt.tx_hash
    WHERE (
            (nt.net_token > 0 AND (nt.native_eth > 0 OR COALESCE(w.weth_out, 0) > 0))
         OR (nt.net_token < 0 AND COALESCE(w.weth_in, 0) > 0)
          )
      AND NOT EXISTS (
          SELECT 1
          FROM dex.trades d
          WHERE d.blockchain = 'base'
            AND d.tx_hash = nt.tx_hash
            AND (d.token_bought_address = nt.address OR d.token_sold_address = nt.address)
            AND d.block_time >= now() - interval '30' day
            AND d.amount_usd IS NOT NULL
            AND d.amount_usd > 0
      )
)

SELECT
    f.project,
    f.address,
    f.trader,
    f.tx_hash,
    f.block_time,
    f.eth_amt * pr.price AS amount_usd,
    CASE WHEN f.net_token > 0 THEN 'buy' ELSE 'sell' END AS side,
    ABS(f.net_token) AS clawd_amt,
    CASE
        WHEN ABS(f.net_token) > 0 THEN (f.eth_amt * pr.price) / ABS(f.net_token)
        ELSE NULL
    END AS price_usd
FROM fills f
INNER JOIN prices.usd pr
    ON pr.blockchain = 'base'
   AND pr.contract_address = 0x4200000000000000000000000000000000000006
   AND pr.minute = date_trunc('minute', f.block_time)
WHERE f.eth_amt > 0
  AND pr.price IS NOT NULL
  AND pr.price > 0
ORDER BY f.block_time DESC;
