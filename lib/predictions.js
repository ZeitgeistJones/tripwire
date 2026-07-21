import { kv } from "@vercel/kv";

// ─────────────────────────────────────────────────────────────
// Paper portfolio race v4 — 3 formula strategies + top-10-mcap
// baseline. Continuous: mark to market on every load; trade only
// when the behavioral data actually changes.
//
// v4 design (vs v3's naive daily reshuffle):
//  • Rebalance trigger: Dune data refreshed (lastUpdated changed),
//    with a 72h backstop. MTM is free; trading isn't.
//  • Hysteresis: only sell a holding if it drops below rank
//    HOLDINGS+5 in its strategy (or fails a gate). Only trade kept
//    positions if weight drifted > DRIFT_BAND from target.
//  • Friction: 1% cost on all traded notional, every portfolio,
//    baseline included. Churn has a price, like reality.
//  • Liquidity gate (all strategies): price exists AND Vol 30d ≥ $25k.
//  • Sizing: score-proportional, capped 20% / floored 5% (formulas);
//    pure equal weight for the baseline.
//  • Versioned formulas: bumping a version marks an era boundary in
//    history instead of resetting it.
// ─────────────────────────────────────────────────────────────

const HOLDINGS = 10;
const SELL_RANK = HOLDINGS + 5; // hysteresis: sell only below this rank
const STARTING_VALUE = 100;
const FEE_RATE = 0.01; // 1% of traded notional
const DRIFT_BAND = 0.03; // rebalance a kept position only if >3pts off target
const WEIGHT_CAP = 0.2;
const WEIGHT_FLOOR = 0.05;
const MIN_VOL_30D = 25000; // liquidity gate
const BACKSTOP_HOURS = 72; // rebalance anyway if data stale this long
const KV_STATE = "tripwire:folio:v4:state";
const MAX_HISTORY = 365;
const MAX_TRADELOG = 50;

function clip(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function num(v, fallback = null) {
  if (v == null || v === "") return fallback;
  const n = Number(v);
  return Number.isNaN(n) ? fallback : n;
}

function round2(v) {
  return Math.round(v * 100) / 100;
}

// ── gates ────────────────────────────────────────────────────

function liquidityGate(row) {
  return (
    row.priceUsd != null &&
    row.priceUsd > 0 &&
    num(row["Vol 30d"], 0) >= MIN_VOL_30D
  );
}

// ── strategy score functions (components normalized 0–100) ───

// What's moving right now. Fast book — pays the most friction.
function scoreMomentum(row) {
  if (num(row["Qlty %"], 100) < 60) return null; // don't chase bot spam
  const signal = ((clip(num(row.signalScore, 0), -50, 50) + 50) / 100) * 100;
  const volG = ((clip(num(row["Vol Grw %"], 0), -100, 200) + 100) / 300) * 100;
  const usrG = ((clip(num(row["User Grw %"], 0), -100, 200) + 100) / 300) * 100;
  const txG = ((clip(num(row["Tx Grw %"], 0), -100, 200) + 100) / 300) * 100;
  return 0.4 * signal + 0.3 * volG + 0.2 * usrG + 0.1 * txG;
}

// What holds its people. Slow book, low turnover.
function scoreSticky(row) {
  const ret = clip(num(row["Retention %"], 0), 0, 100);
  const sus = clip(num(row.Sus, 0), 0, 100);
  const qlty = clip(num(row["Qlty %"], 0), 0, 100);
  const accum = clip(num(row["Accum %"], 50), 0, 100);
  const avgTxs = clip(num(row["Avg Txs Ret"], 0) * 10, 0, 100);
  return 0.3 * ret + 0.25 * sus + 0.2 * qlty + 0.15 * accum + 0.1 * avgTxs;
}

// Follow the money. Whale flow scaled by market cap, so $50k into a
// $500k token counts more than $50k into a $500M one. Neutral (50s)
// until the whale columns are live in the Dune query.
function scoreWhale(row) {
  const mcap = num(row.marketCapUsd, null);
  const whaleNet = num(row["Whale Net 7d"], null);
  let flow = 50;
  if (mcap != null && mcap > 0 && whaleNet != null) {
    // ±0.1% of mcap in weekly whale flow = full scale
    flow = ((clip(whaleNet / (0.001 * mcap), -1, 1) + 1) / 2) * 100;
  }
  const accum = clip(num(row["Accum %"], 50), 0, 100);
  const bs = num(row["Buy/Sell Ratio"], null);
  const breadth = bs == null ? 50 : (clip(bs, 0, 3) / 3) * 100;
  const volWlt = clip(num(row["Vol/Wlt"], 0) / 50, 0, 100); // $5k/wallet = 100
  return 0.35 * flow + 0.25 * accum + 0.2 * breadth + 0.2 * volWlt;
}

function scoreMcap(row) {
  const mcap = num(row.marketCapUsd, null);
  return mcap != null && mcap > 0 ? mcap : null;
}

/**
 * Strategy registry. `id` stays stable forever so history sticks;
 * bump `version` when you change a scoreFn — history keeps flowing
 * and the UI marks the era boundary.
 */
export const STRATEGIES = [
  {
    id: "momentum",
    version: 2,
    name: "Momentum Hunt",
    blurb: "What's moving right now — signal plus volume/user/tx growth. Skips anything with quality below 60.",
    scoreFn: scoreMomentum,
    isBaseline: false,
  },
  {
    id: "sticky",
    version: 2,
    name: "Sticky Flow",
    blurb: "What holds its people — retention, sustainability, quality, whale accumulation, repeat activity.",
    scoreFn: scoreSticky,
    isBaseline: false,
  },
  {
    id: "whale",
    version: 1,
    name: "Whale Shadow",
    blurb: "Follow the money — whale net flow scaled by market cap, accumulation, buyer breadth, volume depth.",
    scoreFn: scoreWhale,
    isBaseline: false,
  },
  {
    id: "mcap",
    version: 1,
    name: "Top 10 Mcap",
    blurb: "Baseline — equal-weight the 10 largest market caps. The do-nothing strategy the formulas must beat.",
    scoreFn: scoreMcap,
    isBaseline: true,
  },
];

// ── ranking + sizing ─────────────────────────────────────────

function rankAll(rows, strategy) {
  return rows
    .filter(liquidityGate)
    .map((row) => {
      const score = strategy.scoreFn(row);
      if (score == null) return null;
      return {
        project: row.Project,
        symbol: row.Symbol,
        address: row.Address || null,
        price: row.priceUsd,
        score: Math.round(score * 10) / 10,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}

/** Score-proportional weights, capped/floored, renormalized. */
function targetWeights(picks, isBaseline) {
  if (!picks.length) return {};
  if (isBaseline) {
    const w = 1 / picks.length;
    return Object.fromEntries(picks.map((p) => [p.project, w]));
  }
  const minScore = Math.min(...picks.map((p) => p.score));
  const shifted = picks.map((p) => ({ project: p.project, s: p.score - minScore + 1 }));
  const total = shifted.reduce((s, p) => s + p.s, 0);
  let weights = Object.fromEntries(shifted.map((p) => [p.project, p.s / total]));
  // cap & floor, then renormalize (two passes is plenty for n=10)
  for (let pass = 0; pass < 2; pass++) {
    let sum = 0;
    for (const k of Object.keys(weights)) {
      weights[k] = clip(weights[k], WEIGHT_FLOOR, WEIGHT_CAP);
      sum += weights[k];
    }
    for (const k of Object.keys(weights)) weights[k] = weights[k] / sum;
  }
  return weights;
}

// ── portfolio accounting ─────────────────────────────────────

function markValue(holdings, priceNow) {
  let value = 0;
  let priced = 0;
  for (const h of holdings || []) {
    const p = priceNow[h.project];
    if (p == null || h.shares == null) continue;
    value += h.shares * p;
    priced++;
  }
  return priced === 0 ? null : round2(value);
}

/**
 * Rebalance with hysteresis + drift bands + friction.
 * Returns { holdings, trades, fee, turnoverNotional }.
 */
function rebalancePortfolio(prevHoldings, ranked, priceNow, strategy) {
  const V0 = markValue(prevHoldings, priceNow) ?? STARTING_VALUE;
  const rankIndex = new Map(ranked.map((r, i) => [r.project, i]));
  const rankByProject = new Map(ranked.map((r) => [r.project, r]));

  // 1. keep holdings still ranked above SELL_RANK and still gated in
  const kept = [];
  const sold = [];
  for (const h of prevHoldings || []) {
    const idx = rankIndex.get(h.project);
    const p = priceNow[h.project];
    if (idx != null && idx < SELL_RANK && p != null) kept.push(h);
    else sold.push(h);
  }

  // 2. fill open slots from the top of the ranks
  const heldSet = new Set(kept.map((h) => h.project));
  const buys = [];
  for (const r of ranked) {
    if (kept.length + buys.length >= HOLDINGS) break;
    if (!heldSet.has(r.project)) buys.push(r);
  }

  const book = [
    ...kept.map((h) => ({ project: h.project, score: rankByProject.get(h.project)?.score ?? 0 })),
    ...buys.map((b) => ({ project: b.project, score: b.score })),
  ];
  const weights = targetWeights(book, strategy.isBaseline);

  // 3. decide which kept positions actually trade (drift band)
  const currentValue = {};
  for (const h of kept) currentValue[h.project] = (priceNow[h.project] ?? 0) * (h.shares ?? 0);

  let sellNotional = sold.reduce((s, h) => s + ((priceNow[h.project] ?? h.avgCost ?? 0) * (h.shares ?? 0)), 0);
  let buyNotional = 0;
  const adjusting = new Set();

  for (const h of kept) {
    const tgt = (weights[h.project] ?? 0) * V0;
    const cur = currentValue[h.project] ?? 0;
    if (V0 > 0 && Math.abs(tgt - cur) / V0 > DRIFT_BAND) {
      adjusting.add(h.project);
      if (tgt > cur) buyNotional += tgt - cur;
      else sellNotional += cur - tgt;
    }
  }
  for (const b of buys) buyNotional += (weights[b.project] ?? 0) * V0;

  const turnoverNotional = sellNotional + buyNotional;
  const fee = round2(turnoverNotional * FEE_RATE);
  const V1 = Math.max(0, V0 - fee);

  // 4. build final holdings: untraded kept keep their shares;
  //    traded/new positions split the remaining value by target weight
  const untraded = kept.filter((h) => !adjusting.has(h.project));
  const untradedValue = untraded.reduce((s, h) => s + (currentValue[h.project] ?? 0), 0);
  const tradedBook = book.filter((b) => adjusting.has(b.project) || !heldSet.has(b.project));
  const tradedWeightSum = tradedBook.reduce((s, b) => s + (weights[b.project] ?? 0), 0);
  const remaining = Math.max(0, V1 - untradedValue);

  const holdings = [];
  for (const h of untraded) {
    holdings.push({ ...h, score: rankByProject.get(h.project)?.score ?? h.score ?? null });
  }
  for (const b of tradedBook) {
    const price = priceNow[b.project] ?? rankByProject.get(b.project)?.price;
    if (price == null || price <= 0 || tradedWeightSum <= 0) continue;
    const value = ((weights[b.project] ?? 0) / tradedWeightSum) * remaining;
    const prev = kept.find((h) => h.project === b.project);
    const prevShares = prev?.shares ?? 0;
    const prevCost = prev?.avgCost ?? price;
    const shares = value / price;
    // avg cost: keep on trims, blend on adds
    const avgCost =
      shares > prevShares && prevShares > 0
        ? (prevCost * prevShares + (shares - prevShares) * price) / shares
        : prevShares > 0
        ? prevCost
        : price;
    const meta = rankByProject.get(b.project);
    holdings.push({
      project: b.project,
      symbol: meta?.symbol ?? prev?.symbol,
      address: meta?.address ?? prev?.address ?? null,
      shares,
      avgCost,
      score: meta?.score ?? null,
    });
  }

  const trades = {
    sold: sold.map((h) => h.project),
    bought: buys.map((b) => b.project),
    adjusted: [...adjusting],
    held: kept.filter((h) => !adjusting.has(h.project)).map((h) => h.project),
  };

  return { holdings, trades, fee, turnoverNotional: round2(turnoverNotional) };
}

// ── state plumbing ───────────────────────────────────────────

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function hoursSince(iso, now) {
  if (!iso) return Infinity;
  return (now - new Date(iso).getTime()) / 3600000;
}

function versionsOf() {
  return Object.fromEntries(STRATEGIES.map((s) => [s.id, s.version]));
}

function initState(priced) {
  const nowIso = new Date().toISOString();
  const portfolios = {};
  const values = {};
  for (const s of STRATEGIES) {
    const ranked = rankAll(priced, s);
    const picks = ranked.slice(0, HOLDINGS);
    const weights = targetWeights(
      picks.map((p) => ({ project: p.project, score: p.score })),
      s.isBaseline
    );
    portfolios[s.id] = {
      id: s.id,
      holdings: picks
        .filter((p) => p.price > 0)
        .map((p) => ({
          project: p.project,
          symbol: p.symbol,
          address: p.address,
          shares: ((weights[p.project] ?? 0) * STARTING_VALUE) / p.price,
          avgCost: p.price,
          score: p.score,
        })),
      lastRebalanceAt: nowIso,
      tradeCount: 0,
      totalFees: 0,
      turnover: [], // [{date, notional}]
      tradeLog: [],
    };
    values[s.id] = STARTING_VALUE;
  }
  return {
    version: 4,
    startedAt: todayKey(),
    lastRebalanceAt: nowIso,
    lastDataVersion: null,
    strategyVersions: versionsOf(),
    eras: Object.fromEntries(STRATEGIES.map((s) => [s.id, [{ version: s.version, from: todayKey() }]])),
    portfolios,
    history: [{ date: todayKey(), values }],
  };
}

function kvConfigured() {
  return !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function appendTradeLog(portfolio, trades, fee, date) {
  const entries = [];
  for (const p of trades.sold) entries.push({ date, action: "sell", project: p, reason: "fell out of rank / gate" });
  for (const p of trades.bought) entries.push({ date, action: "buy", project: p, reason: "entered top picks" });
  for (const p of trades.adjusted) entries.push({ date, action: "resize", project: p, reason: "weight drifted off target" });
  if (fee > 0) entries.push({ date, action: "fee", project: null, reason: `$${fee.toFixed(2)} trading cost` });
  portfolio.tradeLog = [...entries, ...(portfolio.tradeLog || [])].slice(0, MAX_TRADELOG);
}

function maxDrawdownPct(history, id) {
  let peak = -Infinity;
  let maxDd = 0;
  for (const point of history || []) {
    const v = point.values?.[id];
    if (v == null) continue;
    if (v > peak) peak = v;
    else if (peak > 0) maxDd = Math.max(maxDd, (peak - v) / peak);
  }
  return Math.round(maxDd * 1000) / 10;
}

function turnover30Pct(portfolio, value) {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const notional = (portfolio.turnover || [])
    .filter((t) => t.date >= cutoff)
    .reduce((s, t) => s + (t.notional || 0), 0);
  if (!value || value <= 0) return null;
  return Math.round((notional / value) * 1000) / 10;
}

function buildLeaderboard(state, priceNow) {
  const board = STRATEGIES.map((s) => {
    const p = state.portfolios[s.id];
    const value = markValue(p?.holdings, priceNow) ?? STARTING_VALUE;
    const holdings = (p?.holdings || [])
      .map((h) => {
        const pn = priceNow[h.project] ?? null;
        const valueNow = pn != null && h.shares != null ? round2(h.shares * pn) : null;
        return {
          project: h.project,
          symbol: h.symbol,
          priceNow: pn,
          valueNow,
          weightPct: null, // filled below
          changePct:
            pn != null && h.avgCost ? Math.round(((pn - h.avgCost) / h.avgCost) * 1000) / 10 : null,
          score: h.score ?? null,
        };
      })
      .sort((a, b) => (b.valueNow ?? 0) - (a.valueNow ?? 0));
    const totalNow = holdings.reduce((s2, h) => s2 + (h.valueNow ?? 0), 0);
    for (const h of holdings) {
      h.weightPct = totalNow > 0 && h.valueNow != null ? Math.round((h.valueNow / totalNow) * 1000) / 10 : null;
    }
    return {
      id: s.id,
      version: s.version,
      name: s.name,
      blurb: s.blurb,
      isBaseline: s.isBaseline,
      value: round2(value),
      returnPct: Math.round((value / STARTING_VALUE - 1) * 1000) / 10,
      maxDrawdownPct: maxDrawdownPct(state.history, s.id),
      turnover30Pct: turnover30Pct(p || {}, value),
      totalFees: round2(p?.totalFees || 0),
      tradeCount: p?.tradeCount || 0,
      lastRebalanceAt: p?.lastRebalanceAt || state.lastRebalanceAt,
      holdings,
      tradeLog: (p?.tradeLog || []).slice(0, 8),
      eras: state.eras?.[s.id] || [],
    };
  }).sort((a, b) => b.value - a.value);

  const baseline = board.find((b) => b.isBaseline);
  for (const b of board) {
    b.spreadVsBaselinePct =
      baseline && !b.isBaseline ? Math.round((b.returnPct - baseline.returnPct) * 10) / 10 : null;
  }
  return board;
}

// ── main entry ───────────────────────────────────────────────

export async function getForecastState(rows, dataVersion = null) {
  const now = Date.now();
  const priced = rows.filter((r) => r.priceUsd != null);
  const priceNow = {};
  for (const r of priced) priceNow[r.Project] = r.priceUsd;

  let state = null;
  let kvOk = kvConfigured();
  let kvError = kvOk ? null : "KV env vars missing (KV_REST_API_URL / KV_REST_API_TOKEN)";
  let justRebalanced = false;

  try {
    if (!kvOk) {
      state = initState(priced);
      throw new Error(kvError);
    }

    state = (await kv.get(KV_STATE)) || null;

    if (!state?.portfolios || state.version !== 4) {
      state = initState(priced);
      state.lastDataVersion = dataVersion;
      await kv.set(KV_STATE, state);
      justRebalanced = true;
    } else {
      // era tracking: record formula version bumps without resetting history
      const liveVersions = versionsOf();
      for (const s of STRATEGIES) {
        if (state.strategyVersions?.[s.id] !== liveVersions[s.id]) {
          state.eras = state.eras || {};
          state.eras[s.id] = [...(state.eras[s.id] || []), { version: liveVersions[s.id], from: todayKey() }];
        }
      }
      state.strategyVersions = liveVersions;

      const dataChanged = dataVersion != null && dataVersion !== state.lastDataVersion;
      const backstop = hoursSince(state.lastRebalanceAt, now) >= BACKSTOP_HOURS;

      if ((dataChanged || backstop) && priced.length > 0) {
        const day = todayKey();
        for (const s of STRATEGIES) {
          const prev = state.portfolios[s.id] || { holdings: [], tradeCount: 0, totalFees: 0, turnover: [], tradeLog: [] };
          const ranked = rankAll(priced, s);
          if (ranked.length === 0) continue;
          const { holdings, trades, fee, turnoverNotional } = rebalancePortfolio(
            prev.holdings,
            ranked,
            priceNow,
            s
          );
          const moves = trades.sold.length + trades.bought.length + trades.adjusted.length;
          const next = {
            ...prev,
            id: s.id,
            holdings,
            lastRebalanceAt: new Date().toISOString(),
            tradeCount: (prev.tradeCount || 0) + moves,
            totalFees: round2((prev.totalFees || 0) + fee),
            turnover: [...(prev.turnover || []), { date: day, notional: turnoverNotional }].slice(-40),
          };
          appendTradeLog(next, trades, fee, day);
          state.portfolios[s.id] = next;
        }
        state.lastRebalanceAt = new Date().toISOString();
        state.lastDataVersion = dataVersion ?? state.lastDataVersion;
        justRebalanced = true;
      }

      // MTM: always keep today's NAV point current
      const values = {};
      for (const s of STRATEGIES) {
        values[s.id] = markValue(state.portfolios[s.id]?.holdings, priceNow) ?? STARTING_VALUE;
      }
      const day = todayKey();
      const hist = Array.isArray(state.history) ? [...state.history] : [];
      const last = hist[hist.length - 1];
      let dirty = justRebalanced;
      if (!last || last.date !== day) {
        hist.push({ date: day, values });
        dirty = true;
      } else if (JSON.stringify(last.values) !== JSON.stringify(values)) {
        last.values = values;
        dirty = true;
      }
      state.history = hist.slice(-MAX_HISTORY);
      if (dirty) await kv.set(KV_STATE, state);
    }
  } catch (err) {
    console.error("[predictions] KV error:", String(err));
    kvOk = false;
    kvError = String(err?.message || err);
    if (!state) state = initState(priced);
  }

  return {
    leaderboard: buildLeaderboard(state, priceNow),
    history: state.history || [],
    startedAt: state.startedAt,
    lastRebalanceAt: state.lastRebalanceAt,
    justRebalanced,
    kvOk,
    kvError,
    holdingsCount: HOLDINGS,
    startingValue: STARTING_VALUE,
    feePct: FEE_RATE * 100,
    minVol30d: MIN_VOL_30D,
    backstopHours: BACKSTOP_HOURS,
    strategies: STRATEGIES.map(({ id, version, name, blurb, isBaseline }) => ({
      id,
      version,
      name,
      blurb,
      isBaseline,
    })),
  };
}
