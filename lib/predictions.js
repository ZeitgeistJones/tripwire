import { kv } from "@vercel/kv";

// ─────────────────────────────────────────────────────────────
// Paper portfolios — 3 formulas + 1 market-cap baseline.
//
// Each strategy picks HOLDINGS tokens (equal-weight). Every
// WINDOW_DAYS we snapshot holdings + entry prices. While a
// window is open we mark portfolios to live prices. When it
// matures we lock the return. Swap any scoreFn later — the
// portfolio / tracking plumbing stays the same.
// ─────────────────────────────────────────────────────────────

const WINDOW_DAYS = 7;
const HOLDINGS = 10;
const STARTING_VALUE = 100; // paper dollars per portfolio at inception
const KV_INDEX = "tripwire:folio:v2:index";
const kvSnap = (date) => `tripwire:folio:v2:${date}`;

function clip(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function num(v, fallback = null) {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

// ── Formulas (swap these later) ───────────────────────────────
// Each scoreFn returns a number; higher = more likely to be held.
// Return null to exclude a token from that strategy.

function scoreMomentum(row) {
  if (row.priceUsd == null) return null;
  const signal = num(row.signalScore, 0);
  const vol = num(row["Vol Grw %"], 0);
  const usr = num(row["User Grw %"], 0);
  const mom = num(row.Mom, 0);
  const risk = num(row["Risk %"], 50);
  // Chase heat; light risk haircut
  return 0.35 * signal + 0.25 * clip(vol, -50, 150) + 0.2 * clip(usr, -50, 150) + 0.2 * mom - 0.15 * risk;
}

function scoreSticky(row) {
  if (row.priceUsd == null) return null;
  const ret = num(row["Retention %"], 0);
  const sus = num(row.Sus, 0);
  const qty = num(row["Qlty %"], 0);
  const accum = num(row["Accum %"], 50);
  const risk = num(row["Risk %"], 50);
  const newPct = num(row["New %"], 50);
  // Durable flow; penalize mercenary new-wallet spikes + risk
  return 0.3 * ret + 0.25 * sus + 0.2 * qty + 0.15 * accum - 0.1 * newPct - 0.15 * risk;
}

function scoreBreakout(row) {
  if (row.priceUsd == null) return null;
  const opp = num(row.Opp, 0);
  const mom = num(row.Mom, 0);
  const sus = num(row.Sus, 0);
  const whaleNet = num(row["Whale Net 7d"], 0);
  const profBonus = row.Prof === "Breakout" ? 15 : row.Prof === "Quick Mover" ? 5 : 0;
  const whaleBonus = whaleNet > 0 ? Math.min(20, whaleNet / 50000) : Math.max(-10, whaleNet / 50000);
  return 0.4 * opp + 0.3 * mom + 0.2 * sus + profBonus + whaleBonus;
}

function scoreMcap(row) {
  if (row.priceUsd == null || row.marketCapUsd == null) return null;
  return row.marketCapUsd;
}

/**
 * Strategy registry — swap scoreFn / copy freely.
 * Keep `id` stable if you want history to keep matching.
 */
export const STRATEGIES = [
  {
    id: "momentum",
    name: "Momentum Hunt",
    blurb: "Chases signal + volume/user growth. Hot money — may fade fast.",
    scoreFn: scoreMomentum,
    isBaseline: false,
  },
  {
    id: "sticky",
    name: "Sticky Flow",
    blurb: "Retention, sustainability, quality, whales. Bets on durable activity.",
    scoreFn: scoreSticky,
    isBaseline: false,
  },
  {
    id: "breakout",
    name: "Breakout Bias",
    blurb: "Opp / Mom / Sus blend, boosts Breakout profiles + whale inflow.",
    scoreFn: scoreBreakout,
    isBaseline: false,
  },
  {
    id: "mcap",
    name: "Top 10 Mcap",
    blurb: "Baseline — equal-weight the 10 largest market caps. No cleverness.",
    scoreFn: scoreMcap,
    isBaseline: true,
  },
];

function pickPortfolio(rows, strategy) {
  const scored = rows
    .map((row) => {
      const score = strategy.scoreFn(row);
      if (score == null || row.priceUsd == null) return null;
      return {
        project: row.Project,
        symbol: row.Symbol,
        address: row.Address || null,
        priceAtEntry: row.priceUsd,
        marketCapUsd: row.marketCapUsd ?? null,
        score: Math.round(score * 10) / 10,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, HOLDINGS);

  return scored;
}

function portfolioReturnPct(holdings, priceNowByProject) {
  if (!holdings?.length) return null;
  let sum = 0;
  let n = 0;
  for (const h of holdings) {
    const p = priceNowByProject[h.project];
    if (p == null || h.priceAtEntry == null || h.priceAtEntry === 0) continue;
    sum += ((p - h.priceAtEntry) / h.priceAtEntry) * 100;
    n++;
  }
  if (n === 0) return null;
  return Math.round((sum / n) * 10) / 10;
}

function markHoldings(holdings, priceNowByProject) {
  return holdings.map((h) => {
    const priceNow = priceNowByProject[h.project] ?? null;
    const changePct =
      priceNow != null && h.priceAtEntry
        ? Math.round(((priceNow - h.priceAtEntry) / h.priceAtEntry) * 1000) / 10
        : null;
    return { ...h, priceNow, changePct };
  });
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(dateStr, now) {
  return (now - new Date(dateStr + "T00:00:00Z").getTime()) / 86400000;
}

function buildLivePortfolios(rows) {
  return STRATEGIES.map((s) => {
    const holdings = pickPortfolio(rows, s);
    return {
      id: s.id,
      name: s.name,
      blurb: s.blurb,
      isBaseline: s.isBaseline,
      holdings,
    };
  });
}

function emptyStats() {
  return Object.fromEntries(
    STRATEGIES.map((s) => [
      s.id,
      {
        id: s.id,
        name: s.name,
        blurb: s.blurb,
        isBaseline: s.isBaseline,
        windows: 0,
        avgReturnPct: null,
        cumulativeValue: STARTING_VALUE,
        cumulativeReturnPct: 0,
        bestWindowPct: null,
        worstWindowPct: null,
      },
    ])
  );
}

function computeTrackRecord(resolvedSnaps) {
  const stats = emptyStats();

  for (const snap of resolvedSnaps) {
    for (const s of STRATEGIES) {
      const p = snap.portfolios?.[s.id];
      if (!p || p.returnPct == null) continue;
      const st = stats[s.id];
      st.windows++;
      st.cumulativeValue = st.cumulativeValue * (1 + p.returnPct / 100);
      st.bestWindowPct =
        st.bestWindowPct == null ? p.returnPct : Math.max(st.bestWindowPct, p.returnPct);
      st.worstWindowPct =
        st.worstWindowPct == null ? p.returnPct : Math.min(st.worstWindowPct, p.returnPct);
    }
  }

  for (const s of STRATEGIES) {
    const st = stats[s.id];
    if (st.windows > 0) {
      // Reconstruct average from cumulative geometric mean ≈ or store sum
      // Re-scan for arithmetic average of windows
      let sum = 0;
      let n = 0;
      for (const snap of resolvedSnaps) {
        const r = snap.portfolios?.[s.id]?.returnPct;
        if (r == null) continue;
        sum += r;
        n++;
      }
      st.avgReturnPct = n ? Math.round((sum / n) * 10) / 10 : null;
      st.cumulativeValue = Math.round(st.cumulativeValue * 100) / 100;
      st.cumulativeReturnPct =
        Math.round(((st.cumulativeValue / STARTING_VALUE - 1) * 1000)) / 10;
    }
  }

  return stats;
}

export async function getForecastState(rows) {
  const now = Date.now();
  const priced = rows.filter((r) => r.priceUsd != null);
  const livePortfolios = buildLivePortfolios(priced);

  const priceNow = {};
  for (const r of priced) priceNow[r.Project] = r.priceUsd;

  let index = [];
  let snapshots = [];
  let kvOk = true;

  try {
    index = (await kv.get(KV_INDEX)) || [];

    // 1. Open a new window if none exists or newest is ≥ WINDOW_DAYS old
    const newest = index.length ? index[index.length - 1] : null;
    const needSnapshot = !newest || daysBetween(newest, now) >= WINDOW_DAYS;

    if (needSnapshot && priced.length > 0) {
      const key = todayKey();
      if (!index.includes(key)) {
        const portfolios = {};
        for (const live of livePortfolios) {
          portfolios[live.id] = {
            holdings: live.holdings.map((h) => ({
              project: h.project,
              symbol: h.symbol,
              address: h.address,
              priceAtEntry: h.priceAtEntry,
              score: h.score,
            })),
            returnPct: null,
          };
        }
        await kv.set(kvSnap(key), {
          version: 2,
          date: key,
          resolved: false,
          portfolios,
        });
        index = [...index, key];
        await kv.set(KV_INDEX, index);
      }
    }

    // 2. Load snapshots
    if (index.length > 0) {
      const loaded = await Promise.all(index.map((d) => kv.get(kvSnap(d))));
      snapshots = loaded.filter(Boolean);
    }

    // 3. Resolve matured windows
    for (const snap of snapshots) {
      if (snap.resolved) continue;
      if (daysBetween(snap.date, now) < WINDOW_DAYS) continue;
      if (!snap.portfolios) continue;

      for (const s of STRATEGIES) {
        const p = snap.portfolios[s.id];
        if (!p) continue;
        p.returnPct = portfolioReturnPct(p.holdings, priceNow);
        p.holdings = markHoldings(p.holdings || [], priceNow);
      }
      snap.resolved = true;
      snap.resolvedAt = todayKey();
      await kv.set(kvSnap(snap.date), snap);
    }
  } catch (err) {
    console.error("[predictions] KV error:", String(err));
    kvOk = false;
  }

  const openSnap = snapshots.find((s) => !s.resolved) || null;
  const resolvedSnaps = snapshots
    .filter((s) => s.resolved)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  // Mark open window to market for display
  let openPortfolios = null;
  if (openSnap?.portfolios) {
    openPortfolios = STRATEGIES.map((s) => {
      const p = openSnap.portfolios[s.id];
      const holdings = markHoldings(p?.holdings || [], priceNow);
      const returnPct = portfolioReturnPct(p?.holdings || [], priceNow);
      return {
        id: s.id,
        name: s.name,
        blurb: s.blurb,
        isBaseline: s.isBaseline,
        returnPct,
        holdings,
      };
    });
  }

  const trackRecord = computeTrackRecord(resolvedSnaps);

  // Leaderboard: prefer open-window return, else cumulative
  const leaderboard = STRATEGIES.map((s) => {
    const open = openPortfolios?.find((p) => p.id === s.id);
    const tr = trackRecord[s.id];
    return {
      id: s.id,
      name: s.name,
      blurb: s.blurb,
      isBaseline: s.isBaseline,
      openReturnPct: open?.returnPct ?? null,
      avgReturnPct: tr.avgReturnPct,
      cumulativeReturnPct: tr.cumulativeReturnPct,
      cumulativeValue: tr.cumulativeValue,
      windows: tr.windows,
      bestWindowPct: tr.bestWindowPct,
      worstWindowPct: tr.worstWindowPct,
      currentHoldings: (open?.holdings || livePortfolios.find((p) => p.id === s.id)?.holdings || []).slice(0, HOLDINGS),
    };
  }).sort((a, b) => {
    const ar = a.openReturnPct ?? a.cumulativeReturnPct ?? -Infinity;
    const br = b.openReturnPct ?? b.cumulativeReturnPct ?? -Infinity;
    return br - ar;
  });

  return {
    leaderboard,
    livePortfolios,
    openSnapshot: openSnap
      ? { date: openSnap.date, portfolios: openPortfolios }
      : null,
    resolvedSnapshots: resolvedSnaps.map((s) => ({
      date: s.date,
      resolvedAt: s.resolvedAt,
      portfolios: STRATEGIES.map((st) => ({
        id: st.id,
        name: st.name,
        isBaseline: st.isBaseline,
        returnPct: s.portfolios?.[st.id]?.returnPct ?? null,
        holdings: s.portfolios?.[st.id]?.holdings || [],
      })),
    })),
    trackRecord,
    kvOk,
    windowDays: WINDOW_DAYS,
    holdingsCount: HOLDINGS,
    startingValue: STARTING_VALUE,
    strategies: STRATEGIES.map(({ id, name, blurb, isBaseline }) => ({
      id,
      name,
      blurb,
      isBaseline,
    })),
  };
}
