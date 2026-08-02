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
  neither: "NEITHER",
};

const withAddr = tokens.filter((t) => t.address);
const keep = new Set(withAddr.map((t) => t.address.toLowerCase()));
const byTag = {};
for (const t of withAddr) (byTag[t.tag] ||= []).push(t);
const present = tagOrder.filter((tg) => (byTag[tg] || []).length);
const last = present[present.length - 1];

const valueLines = ["        -- ALL YOUR TRACKED TOKENS"];
for (const tag of present) {
  valueLines.push("");
  valueLines.push(`        -- ${label[tag] || tag}`);
  const list = byTag[tag];
  list.forEach((t, i) => {
    const isLast = tag === last && i === list.length - 1;
    const name = String(t.name).replace(/'/g, "''");
    const sym = String(t.symbol).replace(/'/g, "''");
    valueLines.push(
      `        (${t.address}, '${name}', '${sym}', '${t.tag}')${isLast ? "" : ","}`,
    );
  });
}

// Known ages for tokens not yet in the ages CTE (UTC).
const extraAges = {
  "0x7300b37dfdfab110d83290a29dfb31b1740219fe": "2025-05-20 13:39:00", // MAMO genesis
  "0xc52aedec3374422d7510e294cfaa90799595cba3": "2026-05-16 15:20:31", // SURP
  "0x572c4fa77623652411574c51b5ddb7e1b750aba3": "2026-04-14 02:53:59", // SUPERGEMMA
};

const path = new URL("../docs/dune-FULL-one-shot-paste-this.sql", import.meta.url);
let sql = fs.readFileSync(path, "utf8");

const valuesRe =
  /(WITH tracked_tokens AS \(\s*SELECT t\.address, t\.name, t\.symbol, t\.tag\s*FROM \(\s*VALUES\n)([\s\S]*?)(\n    \) AS t\(address, name, symbol, tag\)\n\),)/;
if (!valuesRe.test(sql)) throw new Error("tracked_tokens VALUES block not found");
sql = sql.replace(valuesRe, (_, a, _old, c) => a + valueLines.join("\n") + c);

const agesRe = /(token_ages \(age_address, deployed_at\) AS \(\s*VALUES\n)([\s\S]*?)(\n\),)/;
const m = sql.match(agesRe);
if (!m) throw new Error("token_ages not found");

const ageByAddr = new Map();
for (const line of m[2].split("\n")) {
  const am = line.trim().match(/^\((0x[a-fA-F0-9]+),\s*TIMESTAMP '([^']+)'\)/);
  if (!am) continue;
  const addr = am[1].toLowerCase();
  if (keep.has(addr)) ageByAddr.set(addr, am[2]);
}
for (const [addr, ts] of Object.entries(extraAges)) {
  if (keep.has(addr) && !ageByAddr.has(addr)) ageByAddr.set(addr, ts);
}

const keptAges = [...ageByAddr.entries()].map(([addr, ts], i, arr) => {
  const comma = i === arr.length - 1 ? "" : ",";
  return `    (${addr}, TIMESTAMP '${ts}')${comma}`;
});

sql = sql.replace(agesRe, (_, a, _o, c) => a + keptAges.join("\n") + c);
fs.writeFileSync(path, sql);

const missing = withAddr.filter((t) => !ageByAddr.has(t.address.toLowerCase()));
console.log("tokens", withAddr.length);
console.log("ages kept", keptAges.length);
console.log("missing ages", missing.map((t) => t.symbol).join(", ") || "(none)");
