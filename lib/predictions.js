import { kv } from "@vercel/kv";

// ─────────────────────────────────────────────────────────────
// Ongoing paper portfolios — 3 formulas + 1 market-cap baseline.
//
// Each strategy starts with STARTING_VALUE, fully invested in its
// top HOLDINGS picks (equal weight). On each rebalance (default
// daily), holdings are marked to market, then the full value is
// redistributed into the formula's current top picks — sell what
// dropped out, buy what entered, reinvest elsewhere.
//
// No lock / no graded windows. Swap any scoreFn later — keep `id`
// stable to preserve history.
// ─────────────────────────────────────────────────────────────

const HOLDINGS = 10;
const STARTING_VALUE = 100;
const REBALANCE_HOURS = 24;
const KV_STATE = "tripwire:folio:v3:state";
const MAX_HISTORY = 180; // daily NAV points to keep

function clip(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function num(v, fallback = null) {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

function scoreMomentum(row) {
  if (row.priceUsd == null) return null;
  const signal = num(row.signalScore, 0);
  const vol = num(row["Vol Grw %"], 0);
  const usr = num(row["User Grw %"], 0);
  const mom = num(row.Mom, 0);
  const risk = num(row["Risk %"], 50);
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

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function pickTop(rows, strategy) {
  return rows
    .map((row) => {
      const score = strategy.scoreFn(row);
      if (score == null || row.priceUsd == null || row.priceUsd <= 0) return null;
      return {
        project: row.Project,
        symbol: row.Symbol,
        address: row.Address || null,
        price: row.priceUsd,
        score: Math.round(score * 10) / 10,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, HOLDINGS);
}

function markValue(holdings, priceNowByProject) {
  let value = 0;
  let priced = 0;
  for (const h of holdings || []) {
    const p = priceNowByProject[h.project];
    if (p == null || h.shares == null) continue;
    value += h.shares * p;
    priced++;
  }
  if (priced === 0) return null;
  return Math.round(value * 100) / 100;
}

function enrichHoldings(holdings, priceNowByProject) {
  return (holdings || []).map((h) => {
    const priceNow = priceNowByProject[h.project] ?? null;
    const valueNow = priceNow != null && h.shares != null ? h.shares * priceNow : null;
    const cost = h.shares != null && h.avgCost != null ? h.shares * h.avgCost : null;
    const changePct =
      priceNow != null && h.avgCost
        ? Math.round(((priceNow - h.avgCost) / h.avgCost) * 1000) / 10
        : null;
    return {
      project: h.project,
      symbol: h.symbol,
      address: h.address,
      shares: h.shares,
      avgCost: h.avgCost,
      priceNow,
      valueNow: valueNow != null ? Math.round(valueNow * 100) / 100 : null,
      cost: cost != null ? Math.round(cost * 100) / 100 : null,
      changePct,
      score: h.score ?? null,
    };
  });
}

function buildHoldingsFromPicks(picks, totalValue) {
  if (!picks.length || totalValue == null || totalValue <= 0) return [];
  const per = totalValue / picks.length;
  return picks.map((p) => ({
    project: p.project,
    symbol: p.symbol,
    address: p.address,
    shares: per / p.price,
    avgCost: p.price,
    score: p.score,
  }));
}

/** Diff old vs new picks for UI/trade log */
function diffTrades(oldHoldings, newHoldings) {
  const oldSet = new Set((oldHoldings || []).map((h) => h.project));
  const newSet = new Set((newHoldings || []).map((h) => h.project));
  const sold = [...oldSet].filter((p) => !newSet.has(p));
  const bought = [...newSet].filter((p) => !oldSet.has(p));
  const held = [...newSet].filter((p) => oldSet.has(p));
  return { sold, bought, held };
}

function hoursSince(iso, now) {
  if (!iso) return Infinity;
  return (now - new Date(iso).getTime()) / 3600000;
}

function emptyPortfolioState(strategy, rows) {
  const picks = pickTop(rows, strategy);
  const holdings = buildHoldingsFromPicks(picks, STARTING_VALUE);
  return {
    id: strategy.id,
    holdings,
    lastRebalanceAt: new Date().toISOString(),
    tradeCount: 0,
  };
}

function initState(rows) {
  const nowIso = new Date().toISOString();
  const portfolios = {};
  for (const s of STRATEGIES) {
    portfolios[s.id] = emptyPortfolioState(s, rows);
  }
  const values = {};
  for (const s of STRATEGIES) {
    values[s.id] = STARTING_VALUE;
  }
  return {
    version: 3,
    startedAt: todayKey(),
    lastRebalanceAt: nowIso,
    portfolios,
    history: [{ date: todayKey(), values }],
  };
}

function kvConfigured() {
  return !!(
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  );
}

function buildLeaderboard(state, priced, priceNow, lastTrades) {
  return STRATEGIES.map((s) => {
    const p = state.portfolios[s.id] || emptyPortfolioState(s, priced);
    const holdings = enrichHoldings(p.holdings, priceNow);
    const value = markValue(p.holdings, priceNow) ?? STARTING_VALUE;
    const returnPct = Math.round(((value / STARTING_VALUE - 1) * 1000)) / 10;
    const trades = lastTrades?.[s.id] || null;
    return {
      id: s.id,
      name: s.name,
      blurb: s.blurb,
      isBaseline: s.isBaseline,
      value: Math.round(value * 100) / 100,
      returnPct,
      tradeCount: p.tradeCount || 0,
      lastRebalanceAt: p.lastRebalanceAt || state.lastRebalanceAt,
      holdings,
      lastTrades: trades,
    };
  }).sort((a, b) => b.value - a.value);
}

export async function getForecastState(rows) {
  const now = Date.now();
  const priced = rows.filter((r) => r.priceUsd != null);
  const priceNow = {};
  for (const r of priced) priceNow[r.Project] = r.priceUsd;

  let state = null;
  let kvOk = kvConfigured();
  let kvError = kvOk ? null : "KV env vars missing (KV_REST_API_URL / KV_REST_API_TOKEN)";
  let justRebalanced = false;
  let lastTrades = null;

  // Always have a renderable state even if storage is down
  const fallback = () => initState(priced);

  try {
    if (!kvOk) {
      state = fallback();
      throw new Error(kvError);
    }

    state = (await kv.get(KV_STATE)) || null;

    if (!state?.portfolios || state.version !== 3) {
      state = initState(priced);
      await kv.set(KV_STATE, state);
      justRebalanced = true;
      lastTrades = Object.fromEntries(
        STRATEGIES.map((s) => [
          s.id,
          { sold: [], bought: (state.portfolios[s.id].holdings || []).map((h) => h.project), held: [] },
        ])
      );
    } else if (hoursSince(state.lastRebalanceAt, now) >= REBALANCE_HOURS && priced.length > 0) {
      // Ongoing rebalance: mark → sell dropouts → buy new → reinvest full value
      const trades = {};
      for (const s of STRATEGIES) {
        const prev = state.portfolios[s.id] || { holdings: [] };
        const marked = markValue(prev.holdings, priceNow) ?? STARTING_VALUE;
        const picks = pickTop(priced, s);
        const nextHoldings = buildHoldingsFromPicks(picks, marked);
        trades[s.id] = diffTrades(prev.holdings, nextHoldings);
        const tradeMoves = trades[s.id].sold.length + trades[s.id].bought.length;
        state.portfolios[s.id] = {
          id: s.id,
          holdings: nextHoldings,
          lastRebalanceAt: new Date().toISOString(),
          tradeCount: (prev.tradeCount || 0) + tradeMoves,
        };
      }
      state.lastRebalanceAt = new Date().toISOString();

      const values = {};
      for (const s of STRATEGIES) {
        values[s.id] = markValue(state.portfolios[s.id].holdings, priceNow) ?? STARTING_VALUE;
      }
      const day = todayKey();
      const hist = Array.isArray(state.history) ? [...state.history] : [];
      const last = hist[hist.length - 1];
      if (last?.date === day) last.values = values;
      else hist.push({ date: day, values });
      state.history = hist.slice(-MAX_HISTORY);

      await kv.set(KV_STATE, state);
      justRebalanced = true;
      lastTrades = trades;
    } else {
      // Between rebalances: still append/update today's NAV for the equity curve
      const values = {};
      for (const s of STRATEGIES) {
        values[s.id] =
          markValue(state.portfolios[s.id]?.holdings, priceNow) ?? STARTING_VALUE;
      }
      const day = todayKey();
      const hist = Array.isArray(state.history) ? [...state.history] : [];
      const last = hist[hist.length - 1];
      if (!last || last.date !== day) {
        hist.push({ date: day, values });
        state.history = hist.slice(-MAX_HISTORY);
        await kv.set(KV_STATE, state);
      } else if (JSON.stringify(last.values) !== JSON.stringify(values)) {
        last.values = values;
        state.history = hist;
        await kv.set(KV_STATE, state);
      }
    }
  } catch (err) {
    console.error("[predictions] KV error:", String(err));
    kvOk = false;
    kvError = String(err?.message || err);
    if (!state) state = fallback();
  }

  const leaderboard = buildLeaderboard(state, priced, priceNow, lastTrades);

  return {
    leaderboard,
    history: state.history || [],
    startedAt: state.startedAt,
    lastRebalanceAt: state.lastRebalanceAt,
    justRebalanced,
    kvOk,
    kvError,
    holdingsCount: HOLDINGS,
    startingValue: STARTING_VALUE,
    rebalanceHours: REBALANCE_HOURS,
    strategies: STRATEGIES.map(({ id, name, blurb, isBaseline }) => ({
      id,
      name,
      blurb,
      isBaseline,
    })),
  };
}
