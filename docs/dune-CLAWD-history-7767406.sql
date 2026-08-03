-- CLAWD behavioral history (query 7767406) — CLAWD only
-- Weekly snapshots for CLAWD tab Opp/Mom/Sus + Wallets 30d sparklines

WITH agentic_contracts AS (
    SELECT address, name FROM (
        VALUES
        (0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07, 'CLAWD')
    ) AS t(address, name)
),

date_spine AS (
    SELECT CAST(d AS TIMESTAMP) AS snapshot_date
    FROM UNNEST(SEQUENCE(
        CAST(now() - INTERVAL '49' day AS TIMESTAMP),
        CAST(now() AS TIMESTAMP),
        INTERVAL '7' day
    )) AS t(d)
),

-- ── Single bounded tx scan: 120d covers 79d window + 90d new/returning ────
relevant_txs AS (
    SELECT t.block_time, t."from" AS wallet, ac.name AS project
    FROM base.transactions t
    INNER JOIN agentic_contracts ac ON t."to" = ac.address
    WHERE t.block_time >= now() - INTERVAL '120' day
      AND t.success = true
),

-- ── Single bounded dex scan: same 120d bound ──────────────────────────────
relevant_trades AS (
    SELECT dt.block_time, dt.taker, dt.amount_usd, ac.name AS project,
        CASE WHEN dt.token_bought_address = ac.address THEN 'buy' ELSE 'sell' END AS side
    FROM dex.trades dt
    INNER JOIN agentic_contracts ac
        ON dt.token_bought_address = ac.address
        OR dt.token_sold_address   = ac.address
    WHERE dt.block_time >= now() - INTERVAL '120' day
      AND dt.blockchain = 'base'
),

metrics_30d AS (
    SELECT ds.snapshot_date, rt.project,
        COUNT(*) AS txs_30d,
        COUNT(DISTINCT rt.wallet) AS users_30d
    FROM date_spine ds
    JOIN relevant_txs rt
        ON rt.block_time >= ds.snapshot_date - INTERVAL '30' day
        AND rt.block_time <  ds.snapshot_date
    GROUP BY 1, 2
),

metrics_7d AS (
    SELECT ds.snapshot_date, rt.project,
        COUNT(*) AS txs_7d,
        COUNT(DISTINCT rt.wallet) AS users_7d,
        CAST(COUNT(*) AS DOUBLE) / NULLIF(COUNT(DISTINCT rt.wallet), 0) AS avg_txs_per_wallet_7d
    FROM date_spine ds
    JOIN relevant_txs rt
        ON rt.block_time >= ds.snapshot_date - INTERVAL '7' day
        AND rt.block_time <  ds.snapshot_date
    GROUP BY 1, 2
),

metrics_prev_7d AS (
    SELECT ds.snapshot_date, rt.project,
        COUNT(*) AS txs_prev_7d,
        COUNT(DISTINCT rt.wallet) AS users_prev_7d,
        CAST(COUNT(*) AS DOUBLE) / NULLIF(COUNT(DISTINCT rt.wallet), 0) AS avg_txs_per_wallet_prev_7d
    FROM date_spine ds
    JOIN relevant_txs rt
        ON rt.block_time >= ds.snapshot_date - INTERVAL '14' day
        AND rt.block_time <  ds.snapshot_date - INTERVAL '7' day
    GROUP BY 1, 2
),

-- ── Bounded new vs returning: 0–30d vs 31–90d per snapshot ───────────────
wallet_windows AS (
    SELECT ds.snapshot_date, rt.project, rt.wallet,
        MAX(CASE WHEN rt.block_time >= ds.snapshot_date - INTERVAL '30' day
                  AND rt.block_time <  ds.snapshot_date THEN 1 END) AS active_30d,
        MAX(CASE WHEN rt.block_time >= ds.snapshot_date - INTERVAL '90' day
                  AND rt.block_time <  ds.snapshot_date - INTERVAL '30' day THEN 1 END) AS active_prev_60d
    FROM date_spine ds
    JOIN relevant_txs rt
        ON rt.block_time >= ds.snapshot_date - INTERVAL '90' day
        AND rt.block_time <  ds.snapshot_date
    GROUP BY 1, 2, 3
),

new_vs_returning AS (
    SELECT snapshot_date, project,
        COUNT(DISTINCT CASE WHEN active_30d = 1 AND active_prev_60d IS NULL THEN wallet END) AS new_wallets_30d,
        COUNT(DISTINCT CASE WHEN active_30d = 1 AND active_prev_60d = 1     THEN wallet END) AS returning_wallets_30d
    FROM wallet_windows
    WHERE active_30d = 1
    GROUP BY 1, 2
),

top10_tx_share AS (
    SELECT snapshot_date, project,
        ROUND(
            CAST(SUM(CASE WHEN rn <= 10 THEN wallet_txs ELSE 0 END) AS DOUBLE)
            / NULLIF(SUM(wallet_txs), 0) * 100
        , 1) AS top10_tx_share_pct
    FROM (
        SELECT ds.snapshot_date, rt.project, rt.wallet,
            COUNT(*) AS wallet_txs,
            ROW_NUMBER() OVER (
                PARTITION BY ds.snapshot_date, rt.project
                ORDER BY COUNT(*) DESC
            ) AS rn
        FROM date_spine ds
        JOIN relevant_txs rt
            ON rt.block_time >= ds.snapshot_date - INTERVAL '30' day
            AND rt.block_time <  ds.snapshot_date
        GROUP BY 1, 2, 3
    ) w
    GROUP BY 1, 2
),

dex_volume AS (
    SELECT ds.snapshot_date, rtr.project,
        SUM(rtr.amount_usd) AS dex_volume_30d,
        COUNT(DISTINCT rtr.taker) AS unique_traders_30d,
        SUM(CASE WHEN rtr.block_time >= ds.snapshot_date - INTERVAL '7'  day THEN rtr.amount_usd ELSE 0 END) AS dex_volume_7d,
        SUM(CASE WHEN rtr.block_time >= ds.snapshot_date - INTERVAL '14' day
                  AND rtr.block_time <  ds.snapshot_date - INTERVAL '7'  day THEN rtr.amount_usd ELSE 0 END) AS dex_volume_prev_7d
    FROM date_spine ds
    JOIN relevant_trades rtr
        ON rtr.block_time >= ds.snapshot_date - INTERVAL '30' day
        AND rtr.block_time <  ds.snapshot_date
    GROUP BY 1, 2
),

-- ── Buyers/sellers: bounded, single trade scan, side from relevant_trades ─
buyers_sellers AS (
    SELECT ds.snapshot_date, rtr.project,
        COUNT(DISTINCT CASE WHEN rtr.side = 'buy'  THEN rtr.taker END) AS buyers_30d,
        COUNT(DISTINCT CASE WHEN rtr.side = 'buy'
            AND rtr.block_time >= ds.snapshot_date - INTERVAL '7' day  THEN rtr.taker END) AS buyers_7d,
        COUNT(DISTINCT CASE WHEN rtr.side = 'sell'
            AND rtr.block_time >= ds.snapshot_date - INTERVAL '7' day  THEN rtr.taker END) AS sellers_7d
    FROM date_spine ds
    JOIN relevant_trades rtr
        ON rtr.block_time >= ds.snapshot_date - INTERVAL '30' day
        AND rtr.block_time <  ds.snapshot_date
    GROUP BY 1, 2
),

-- ── First buyers/sellers: bounded two-window per snapshot ─────────────────
trade_windows AS (
    SELECT ds.snapshot_date, rtr.project, rtr.taker, rtr.side,
        MIN(CASE WHEN rtr.block_time >= ds.snapshot_date - INTERVAL '30' day
                  AND rtr.block_time <  ds.snapshot_date THEN rtr.block_time END) AS first_in_30d,
        MAX(CASE WHEN rtr.block_time >= ds.snapshot_date - INTERVAL '90' day
                  AND rtr.block_time <  ds.snapshot_date - INTERVAL '30' day THEN 1 END) AS had_prior
    FROM date_spine ds
    JOIN relevant_trades rtr
        ON rtr.block_time >= ds.snapshot_date - INTERVAL '90' day
        AND rtr.block_time <  ds.snapshot_date
    GROUP BY 1, 2, 3, 4
),

first_time_buyers AS (
    SELECT snapshot_date, project,
        COUNT(DISTINCT CASE WHEN side = 'buy' AND first_in_30d IS NOT NULL AND had_prior IS NULL THEN taker END) AS first_time_buyers_30d,
        COUNT(DISTINCT CASE WHEN side = 'buy' AND first_in_30d >= snapshot_date - INTERVAL '7' day AND had_prior IS NULL THEN taker END) AS first_time_buyers_7d
    FROM trade_windows
    GROUP BY 1, 2
),

first_time_sellers AS (
    SELECT snapshot_date, project,
        COUNT(DISTINCT CASE WHEN side = 'sell' AND first_in_30d IS NOT NULL AND had_prior IS NULL THEN taker END) AS first_time_sellers_30d,
        COUNT(DISTINCT CASE WHEN side = 'sell' AND first_in_30d >= snapshot_date - INTERVAL '7' day AND had_prior IS NULL THEN taker END) AS first_time_sellers_7d
    FROM trade_windows
    GROUP BY 1, 2
),

final_metrics AS (
    SELECT
        m30.snapshot_date,
        m30.project,
        m30.txs_30d,
        m30.users_30d,
        m7.txs_7d,
        m7.users_7d,
        m7.avg_txs_per_wallet_7d,
        mp7.avg_txs_per_wallet_prev_7d,
        COALESCE(nr.new_wallets_30d, 0)       AS new_wallets_30d,
        COALESCE(nr.returning_wallets_30d, 0) AS returning_wallets_30d,
        CAST(m30.txs_30d AS DOUBLE) / NULLIF(m30.users_30d, 0) AS avg_txs_per_user,
        (CAST(m7.txs_7d AS DOUBLE) - COALESCE(mp7.txs_prev_7d, 0))
            / NULLIF(mp7.txs_prev_7d, 0) * 100                 AS wow_txs_pct,
        (CAST(m7.users_7d AS DOUBLE) - COALESCE(mp7.users_prev_7d, 0))
            / NULLIF(mp7.users_prev_7d, 0) * 100               AS wow_users_pct,
        ROUND(CAST(m7.users_7d AS DOUBLE)
            / NULLIF(mp7.users_prev_7d, 0) * 100, 1)           AS retention_rate_pct,
        -- Engagement delta as % change, capped -100 to +200
        LEAST(GREATEST(
            (m7.avg_txs_per_wallet_7d - COALESCE(mp7.avg_txs_per_wallet_prev_7d, 0))
                * 100.0 / NULLIF(mp7.avg_txs_per_wallet_prev_7d, 0),
        -100), 200)                                             AS wallet_engagement_delta_pct,
        t10.top10_tx_share_pct,
        ROUND(CAST(dv.dex_volume_30d AS DOUBLE), 0)            AS dex_volume_30d_usd,
        dv.unique_traders_30d,
        (CAST(dv.dex_volume_7d AS DOUBLE) - COALESCE(dv.dex_volume_prev_7d, 0))
            / NULLIF(dv.dex_volume_prev_7d, 0) * 100           AS wow_volume_pct,
        CAST(COALESCE(dv.dex_volume_30d, 0) AS DOUBLE)
            / NULLIF(m30.txs_30d, 0)                           AS vol_per_tx,
        CAST(COALESCE(dv.dex_volume_30d, 0) AS DOUBLE)
            / NULLIF(m30.users_30d, 0)                         AS vol_per_wallet,
        ROUND(CAST(COALESCE(nr.new_wallets_30d, 0) AS DOUBLE)
            / NULLIF(m30.users_30d, 0) * 100, 1)               AS new_wallet_pct,
        COALESCE(bs.buyers_30d, 0)                             AS buyers_30d,
        COALESCE(bs.buyers_7d, 0)                              AS buyers_7d,
        COALESCE(bs.sellers_7d, 0)                             AS sellers_7d,
        COALESCE(ftb.first_time_buyers_30d, 0)                 AS first_time_buyers_30d,
        COALESCE(ftb.first_time_buyers_7d, 0)                  AS first_time_buyers_7d,
        COALESCE(fts.first_time_sellers_30d, 0)                AS first_time_sellers_30d,
        COALESCE(fts.first_time_sellers_7d, 0)                 AS first_time_sellers_7d,
        GREATEST(
            COALESCE(nr.new_wallets_30d, 0)
            - COALESCE(ftb.first_time_buyers_30d, 0)
            - COALESCE(fts.first_time_sellers_30d, 0)
        , 0)                                                    AS non_trade_new_wallets_30d
    FROM metrics_30d m30
    LEFT JOIN metrics_7d          m7   ON m30.snapshot_date = m7.snapshot_date   AND m30.project = m7.project
    LEFT JOIN metrics_prev_7d     mp7  ON m30.snapshot_date = mp7.snapshot_date  AND m30.project = mp7.project
    LEFT JOIN new_vs_returning    nr   ON m30.snapshot_date = nr.snapshot_date   AND m30.project = nr.project
    LEFT JOIN top10_tx_share      t10  ON m30.snapshot_date = t10.snapshot_date  AND m30.project = t10.project
    LEFT JOIN dex_volume          dv   ON m30.snapshot_date = dv.snapshot_date   AND m30.project = dv.project
    LEFT JOIN buyers_sellers      bs   ON m30.snapshot_date = bs.snapshot_date   AND m30.project = bs.project
    LEFT JOIN first_time_buyers   ftb  ON m30.snapshot_date = ftb.snapshot_date  AND m30.project = ftb.project
    LEFT JOIN first_time_sellers  fts  ON m30.snapshot_date = fts.snapshot_date  AND m30.project = fts.project
),

scored AS (
    SELECT *,
        -- ── Momentum: matches live query 7762446 weights exactly ──────────
        ROUND(
            0.25 * LEAST(GREATEST(COALESCE(new_wallet_pct, 0), 0), 100)
            + 0.25 * COALESCE((
                COALESCE(wow_txs_pct, 0) +
                COALESCE(wow_users_pct, 0) +
                COALESCE(wow_volume_pct, 0)
            ) / 3.0, 0)
            + 0.20 * LEAST(GREATEST(COALESCE(retention_rate_pct, 0), 0), 200)
            + 0.15 * LEAST(COALESCE(vol_per_tx, 0) / 1000.0, 100)
            + 0.10 * LEAST(COALESCE(vol_per_wallet, 0) / 5000.0, 100)
            + 0.03 * (100 - LEAST(COALESCE(top10_tx_share_pct, 0), 100))
            + 0.02 * LEAST(COALESCE(avg_txs_per_user, 0) * 10, 100)
        , 1) AS momentum_score,

        -- ── Sustainability: matches live query 7762446 weights exactly ────
        ROUND(
            0.10 * LEAST(GREATEST(COALESCE(new_wallet_pct, 0), 0), 100)
            + 0.15 * COALESCE((
                COALESCE(wow_txs_pct, 0) +
                COALESCE(wow_users_pct, 0) +
                COALESCE(wow_volume_pct, 0)
            ) / 3.0, 0)
            + 0.30 * LEAST(GREATEST(COALESCE(retention_rate_pct, 0), 0), 200)
            + 0.25 * (
                0.5 * LEAST(COALESCE(vol_per_tx, 0) / 1000.0, 100) +
                0.5 * LEAST(COALESCE(vol_per_wallet, 0) / 5000.0, 100)
            )
            + 0.15 * LEAST(COALESCE(avg_txs_per_user, 0) * 10, 100)
            + 0.03 * (100 - LEAST(COALESCE(top10_tx_share_pct, 0), 100))
            + 0.02 * LEAST(COALESCE(avg_txs_per_user, 0) * 10, 100)
        , 1) AS sustainability_score,

        -- ── Quality: matches live query exactly ───────────────────────────
        ROUND(GREATEST(
            100
            - CASE WHEN COALESCE(wow_txs_pct, 0) - COALESCE(wow_users_pct, 0) > 50 THEN 20 ELSE 0 END
            - CASE WHEN COALESCE(top10_tx_share_pct, 0) > 60 THEN 20 ELSE 0 END
            - CASE WHEN COALESCE(retention_rate_pct, 0) > 150 THEN 20 ELSE 0 END
        , 0), 1) AS activity_quality_pct,

        -- ── Risk: matches live query exactly ──────────────────────────────
        ROUND(LEAST(
            0.65 * LEAST(COALESCE(vol_per_wallet, 0) / 10000.0 * 100, 100)
            + 0.35 * COALESCE(top10_tx_share_pct, 0)
        , 100), 1) AS volume_concentration_risk_pct
    FROM final_metrics
),

opportunity_scored AS (
    SELECT *,
        ROUND(
            (momentum_score * 0.5 + sustainability_score * 0.5)
            * (activity_quality_pct / 100.0)
            * (1.0 - LEAST(COALESCE(volume_concentration_risk_pct, 0), 100) / 100.0)
        , 1) AS opportunity_score,
        -- Solo CLAWD: no peer median — treat as Breakout so Prof is filled
        'Breakout' AS profile
    FROM scored
)

SELECT
    snapshot_date                          AS "Snapshot Date",
    ROUND(opportunity_score,    1)         AS "Opp",
    ROUND(momentum_score,       1)         AS "Mom",
    ROUND(sustainability_score, 1)         AS "Sus",
    profile                                AS "Prof",
    txs_30d                                AS "Txs 30d",
    users_30d                              AS "Wallets 30d",
    ROUND(dex_volume_30d_usd,   0)         AS "Vol 30d",
    retention_rate_pct                     AS "Retention %",
    ROUND(wow_volume_pct,       1)         AS "Vol Grw %",
    ROUND(wow_txs_pct,          1)         AS "Tx Grw %",
    ROUND(wow_users_pct,        1)         AS "User Grw %",
    ROUND(avg_txs_per_user,     1)         AS "Txs/User",
    unique_traders_30d                     AS "Traders",
    ROUND(vol_per_tx,           2)         AS "Vol/Tx",
    ROUND(new_wallet_pct,       1)         AS "New %",
    new_wallets_30d                        AS "New Wallets",
    returning_wallets_30d                  AS "Returning Wallets",
    non_trade_new_wallets_30d              AS "Non-Trade New 30d",
    buyers_30d                             AS "Buyers 30d",
    buyers_7d                              AS "Buyers 7d",
    first_time_buyers_30d                  AS "1st Buyers 30d",
    first_time_buyers_7d                   AS "1st Buyers 7d",
    first_time_sellers_30d                 AS "1st Sellers 30d",
    first_time_sellers_7d                  AS "1st Sellers 7d",
    activity_quality_pct                   AS "Qlty %",
    ROUND(volume_concentration_risk_pct,1) AS "Risk %",
    top10_tx_share_pct                     AS "Top10 %"
FROM opportunity_scored
WHERE project = 'CLAWD'
ORDER BY snapshot_date ASC;
