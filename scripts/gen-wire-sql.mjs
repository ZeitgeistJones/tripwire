import fs from "fs";
import tokens from "../lib/tokens.js";

const tagOrder = [
  "agent-independent",
  "agent-via-virtuals",
  "clanker-via-bankrbot-prefork",
  "agent-via-clanker",
  "agent-via-bankr",
  "non-agent-via-bankr",
  "non-agent-via-clanker",
  "non-agent-via-virtuals",
  "non-agent-infrastructure",
  "neither",
];

const label = {
  "agent-independent": "AGENT INDEPENDENT",
  "agent-via-virtuals": "AGENT VIA VIRTUALS",
  "clanker-via-bankrbot-prefork": "CLANKER VIA BANKRBOT PREFORK",
  "agent-via-clanker": "AGENT VIA CLANKER",
  "agent-via-bankr": "AGENT VIA BANKR",
  "non-agent-via-bankr": "NON-AGENT VIA BANKR",
  "non-agent-via-clanker": "NON-AGENT VIA CLANKER",
  "non-agent-via-virtuals": "NON-AGENT VIA VIRTUALS",
  "non-agent-infrastructure": "NON-AGENT INFRASTRUCTURE",
  "neither": "NEITHER",
};

const withAddr = tokens.filter((t) => t.address);
const byTag = {};
for (const t of withAddr) {
  (byTag[t.tag] ||= []).push(t);
}

const presentTags = tagOrder.filter((tg) => (byTag[tg] || []).length);
const lastTag = presentTags[presentTags.length - 1];

const parts = [];
for (const tag of presentTags) {
  const list = byTag[tag];
  parts.push(`        -- ${label[tag] || tag}`);
  list.forEach((t, idx) => {
    const isLast = tag === lastTag && idx === list.length - 1;
    const name = String(t.name).replace(/'/g, "''");
    parts.push(`        (${t.address}, '${name}')${isLast ? "" : ","}`);
  });
}

const sql = `-- The Wire pulse (lean) - paste into Dune query 7765068
-- 24h scan only: raw wallets + txs for 15m / 1h / 6h / 24h
-- No first-time / new-buyer / new-seller paths (those forced the old 90d cost)
-- Contract list synced from lib/tokens.js (${withAddr.length} addresses)

WITH agentic_contracts AS (
    SELECT address, name FROM (
        VALUES
${parts.join("\n")}
    ) AS t(address, name)
),

recent_tx AS (
    SELECT
        ac.name  AS project,
        t."from" AS wallet,
        t.block_time
    FROM base.transactions t
    INNER JOIN agentic_contracts ac ON t."to" = ac.address
    WHERE t.success = true
      AND t.block_time >= now() - interval '24' hour
),

activity_pulse AS (
    SELECT
        project,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '15' minute) AS txs_15m,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '15' minute) AS wallets_15m,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '1'  hour)   AS txs_1h,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '1'  hour)   AS wallets_1h,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '6'  hour)   AS txs_6h,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '6'  hour)   AS wallets_6h,
        COUNT(*)               FILTER (WHERE block_time >= now() - interval '24' hour)   AS txs_24h,
        COUNT(DISTINCT wallet) FILTER (WHERE block_time >= now() - interval '24' hour)   AS wallets_24h
    FROM recent_tx
    GROUP BY 1
)

SELECT
    ap.project     AS "Project",
    ap.wallets_15m AS "Wallets 15m",
    ap.txs_15m     AS "Txs 15m",
    ap.wallets_1h  AS "Wallets 1h",
    ap.txs_1h      AS "Txs 1h",
    ap.wallets_6h  AS "Wallets 6h",
    ap.txs_6h      AS "Txs 6h",
    ap.wallets_24h AS "Wallets 24h",
    ap.txs_24h     AS "Txs 24h"
FROM activity_pulse ap
ORDER BY ap.txs_15m DESC;
`;

fs.writeFileSync("docs/dune-WIRE-pulse-paste-this.sql", sql);
console.log("wrote docs/dune-WIRE-pulse-paste-this.sql", withAddr.length, "tokens");
console.log("missing tags", Object.keys(byTag).filter((k) => !tagOrder.includes(k)));
