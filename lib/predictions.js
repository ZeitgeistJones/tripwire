import { kv } from "@vercel/kv";

// ─────────────────────────────────────────────────────────────
// Forecast formula — fully transparent, computed from data the
// dashboard already fetches (no extra Dune executions).
//
//   30%  Signal momentum   — signalScore (price+volume composite), clipped ±50 → 0-100
//   25%  Whale accumulation — Accum % (50 = neutral when unknown)
//   20%  Growth blend       — avg of Vol/User/Tx WoW growth, clamped -100..200 → 0-100
//   15%  Retention          — % of last week's wallets that returned, capped 100
//   10%  Quality            — Qlty % (bot/concentration penalties)
//
// Then a risk haircut: score × (1 − Risk/200), so max-risk tokens
// lose up to half their score.
//
// Call thresholds:  ≥ 60 → "Up"   ≤ 35 → "Down"   else → "Flat"
// Resolution (7 days later):
//   price +10% or more  → "Up" was correct
//   price −10% or less  → "Down" was correct
//   in between          → "Flat" was correct
// ─────────────────────────────────────────────────────────────

const WINDOW_DAYS = 7;
const UP_THRESHOLD = 60;
const DOWN_THRESHOLD = 35;
const RESOLVE_UP_PCT = 10;
const RESOLVE_DOWN_PCT = -10;

function clip(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

export function computeForecast(row) {
  if (row.priceUsd == null) return null;

  // 1. signal momentum: signalScore lives roughly in -100..100; clip ±50, map to 0-100
  const sig = row.signalScore == null ? 50 : ((clip(row.signalScore, -50, 50) + 50) / 100) * 100;

  // 2. whale accumulation: already 0-100; 50 = neutral when unknown
  const accum = row["Accum %"] == null ? 50 : clip(row["Accum %"], 0, 100);

  // 3. growth blend: clamp each to -100..200, average, map to 0-100
  const growths = [row["Vol Grw %"], row["User Grw %"], row["Tx Grw %"]].filter((v) => v != null);
  let growth = 50;
  if (growths.length > 0) {
    const avg = growths.reduce((s, v) => s + clip(v, -100, 200), 0) / growths.length;
    growth = ((avg + 100) / 300) * 100;
  }

  // 4. retention: capped at 100
  const retention = row["Retention %"] == null ? 0 : clip(row["Retention %"], 0, 100);

  // 5. quality
  const quality = row["Qlty %"] == null ? 50 : clip(row["Qlty %"], 0, 100);

  const raw =
    0.3 * sig +
    0.25 * accum +
    0.2 * growth +
    0.15 * retention +
    0.1 * quality;

  // risk haircut
  const risk = row["Risk %"] == null ? 0 : clip(row["Risk %"], 0, 100);
  const score = raw * (1 - risk / 200);
  const rawRounded = Math.round(raw * 10) / 10;

  const call = score >= UP_THRESHOLD ? "Up" : score <= DOWN_THRESHOLD ? "Down" : "Flat";

  return {
    project: row.Project,
    symbol: row.Symbol,
    score: Math.round(score * 10) / 10,
    call,
    opp: row.Opp ?? null,
    priceAtCall: row.priceUsd,
    rawScore: rawRounded,
    riskPct: Math.round(risk),
    components: {
      signal: Math.round(sig),
      accum: Math.round(accum),
      growth: Math.round(growth),
      retention: Math.round(retention),
      quality: Math.round(quality),
      riskHaircutPct: Math.round((risk / 200) * 100),
    },
  };
}

function correctCall(priceChangePct) {
  if (priceChangePct >= RESOLVE_UP_PCT) return "Up";
  if (priceChangePct <= RESOLVE_DOWN_PCT) return "Down";
  return "Flat";
}

function todayKey() {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function daysBetween(dateStr, now) {
  return (now - new Date(dateStr + "T00:00:00Z").getTime()) / 86400000;
}

// ─────────────────────────────────────────────────────────────
// Snapshot + resolution, all lazy on page load. Idempotent:
// at most one open snapshot per rolling window; resolution only
// happens once per snapshot.
// ─────────────────────────────────────────────────────────────

export async function getForecastState(rows) {
  const now = Date.now();
  const priced = rows.filter((r) => r.priceUsd != null);

  // current live forecasts (always computed fresh for display)
  const live = priced
    .map(computeForecast)
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);

  let index = [];
  let snapshots = [];
  let kvOk = true;

  try {
    index = (await kv.get("tripwire:pred:index")) || [];

    // 1. write a new snapshot if the newest one is >= WINDOW_DAYS old (or none exists)
    const newest = index.length ? index[index.length - 1] : null;
    const needSnapshot = !newest || daysBetween(newest, now) >= WINDOW_DAYS;

    if (needSnapshot && live.length > 0) {
      const key = todayKey();
      if (!index.includes(key)) {
        await kv.set(`tripwire:pred:${key}`, {
          date: key,
          resolved: false,
          calls: live.map((f) => ({
            project: f.project,
            symbol: f.symbol,
            call: f.call,
            score: f.score,
            opp: f.opp,
            priceAtCall: f.priceAtCall,
          })),
        });
        index = [...index, key];
        await kv.set("tripwire:pred:index", index);
      }
    }

    // 2. load all snapshots
    if (index.length > 0) {
      const loaded = await Promise.all(index.map((d) => kv.get(`tripwire:pred:${d}`)));
      snapshots = loaded.filter(Boolean);
    }

    // 3. resolve any matured, unresolved snapshots against current prices
    const priceNow = {};
    for (const r of priced) priceNow[r.Project] = r.priceUsd;

    for (const snap of snapshots) {
      if (snap.resolved) continue;
      if (daysBetween(snap.date, now) < WINDOW_DAYS) continue;

      let hits = 0;
      let scored = 0;
      snap.calls = snap.calls.map((c) => {
        const p = priceNow[c.project];
        if (p == null || c.priceAtCall == null || c.priceAtCall === 0) {
          return { ...c, outcome: "unscored" };
        }
        const changePct = ((p - c.priceAtCall) / c.priceAtCall) * 100;
        const actual = correctCall(changePct);
        const hit = actual === c.call;
        scored++;
        if (hit) hits++;
        return {
          ...c,
          priceAtResolve: p,
          changePct: Math.round(changePct * 10) / 10,
          actual,
          hit,
        };
      });
      snap.resolved = true;
      snap.resolvedAt = todayKey();
      snap.hits = hits;
      snap.scored = scored;
      await kv.set(`tripwire:pred:${snap.date}`, snap);
    }
  } catch (err) {
    console.error("[predictions] KV error:", String(err));
    kvOk = false;
  }

  // 4. accuracy record from resolved snapshots
  const resolvedSnaps = snapshots.filter((s) => s.resolved);
  let totalHits = 0;
  let totalScored = 0;
  const byCall = { Up: { hits: 0, total: 0 }, Flat: { hits: 0, total: 0 }, Down: { hits: 0, total: 0 } };
  for (const s of resolvedSnaps) {
    for (const c of s.calls) {
      if (c.outcome === "unscored") continue;
      totalScored++;
      if (c.hit) totalHits++;
      if (byCall[c.call]) {
        byCall[c.call].total++;
        if (c.hit) byCall[c.call].hits++;
      }
    }
  }

  const openSnap = snapshots.find((s) => !s.resolved) || null;

  return {
    live,
    openSnapshot: openSnap,
    resolvedSnapshots: resolvedSnaps.sort((a, b) => (a.date < b.date ? 1 : -1)),
    accuracy: {
      totalHits,
      totalScored,
      pct: totalScored > 0 ? Math.round((totalHits / totalScored) * 1000) / 10 : null,
      byCall,
    },
    kvOk,
    windowDays: WINDOW_DAYS,
    thresholds: {
      up: UP_THRESHOLD,
      down: DOWN_THRESHOLD,
      resolveUpPct: RESOLVE_UP_PCT,
      resolveDownPct: RESOLVE_DOWN_PCT,
    },
  };
}
