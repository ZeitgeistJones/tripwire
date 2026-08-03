"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  CLAWDWIRE_CSS,
  ChapterNav,
  Disclosure,
  FlashNum,
  HourlyTape,
  Ladder,
  LiveDot,
  Matrix,
  CohortPie,
  PressureBar,
  StatStrip,
  SuspectBadge,
  WalletLens,
} from "./ClawdWireKit";
import {
  FLAT_HOUR_SHARE,
  divergenceBps,
  exclusiveCohortMetrics,
  exclusiveCohortMix,
  fmtInt,
  fmtMins,
  fmtPct,
  fmtPctSigned,
  fmtPrice,
  fmtRatio,
  fmtUsd,
  fmtUsdCompact,
  fmtUsdSigned,
  fmtUtcHour,
  megaFloorNote,
  formatPulseClock,
  freshness,
  heatBand,
  holdBand,
  localTimeZoneAbbr,
  netTone,
  num,
  parseHourlyTape,
  roundTripBand,
  timeAgo,
  toneColor,
  utcHourKey,
} from "@/lib/clawdWireFormat";
import { CLAWD_TOKEN_ADDRESS, defaultPulseToken } from "@/lib/clawdWire";
import ClawdWireTokenPicker from "./ClawdWireTokenPicker";
const SYNC_MS = 45_000;
/**
 * Trade windows for Net flow (hero + sticky rail) and the highlighted Flow matrix column.
 */
const WINDOWS = [
  { key: "15m", label: "15m", note: "immediate" },
  { key: "1h", label: "1h", note: "short pulse" },
  { key: "6h", label: "6h", note: "session" },
  { key: "24h", label: "24h", note: "full day" },
];
const PARTICIPATION_WINDOWS = [
  { key: "24h", label: "24h" },
  { key: "7d", label: "7d" },
  { key: "30d", label: "30d" },
];
const CHAPTERS = [
  { key: "flow", label: "Flow" },
  { key: "who", label: "Who" },
  { key: "when", label: "When" },
  { key: "shape", label: "Shape" },
  { key: "lab", label: "Lab" },
];
function WindowSeg({ value, onChange, size = "md", "aria-label": ariaLabel = "Net flow window" }) {
  return (
    <span className={`cw-seg${size === "sm" ? " cw-seg-sm" : ""}`} role="group" aria-label={ariaLabel}>
      {WINDOWS.map((w) => (
        <button
          key={w.key}
          type="button"
          aria-pressed={w.key === value}
          onClick={() => onChange(w.key)}
        >
          {w.label}
        </button>
      ))}
    </span>
  );
}
function cell(raw, text, tone) {
  return { raw, text, tone };
}
/** Round-trip fields were renamed in the query; keep reading the old key too. */
function roundTripVol(row) {
  return row?.["Round-trip Vol % 24h"] ?? row?.["Wash Vol % 24h"] ?? null;
}
function roundTripWallets(row) {
  return row?.["Round-trip Wallets 24h"] ?? row?.["Wash Wallets 24h"] ?? null;
}
export default function ClawdWirePanel({
  canTrip = false,
  walletAddress = null,
  initialToken = null,
  onMeta = null,
  /** Price / MC only — no snapshot ranks or Opp/Mom/Sus on this page. */
  clawdRow = null,
}) {
  const [status, setStatus] = useState("idle");
  const [row, setRow] = useState(null);
  const [lastRunAt, setLastRunAt] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [syncHint, setSyncHint] = useState("");
  const [cooldownMsg, setCooldownMsg] = useState("");
  const [activeWindow, setActiveWindow] = useState("1h");
  const [chapter, setChapter] = useState("flow");
  const [, setTick] = useState(0);
  const [token, setToken] = useState(() => initialToken || defaultPulseToken());
  const tokenAddress = token.address;
  const tokenSymbol = token.symbol;
  const [stuck, setStuck] = useState(false);
  const pollRef = useRef(null);
  const attemptsRef = useRef(0);
  const lastRunRef = useRef(null);
  const executingRef = useRef(false);
  const sentinelRef = useRef(null);
  const chapterBodyRef = useRef(null);
  const chapterMounted = useRef(false);
  useEffect(() => {
    if (!chapterMounted.current) {
      chapterMounted.current = true;
      return;
    }
    chapterBodyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [chapter]);
  function stopExecPoll() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = null;
  }
  function wireHeaders() {
    const h = {};
    if (walletAddress) h["x-wallet-address"] = String(walletAddress).toLowerCase();
    return h;
  }
  const publishMeta = useCallback(
    (runAt, syncing) => {
      onMeta?.({ lastRunAt: runAt, syncing: !!syncing });
    },
    [onMeta]
  );
  const applyPayload = useCallback(
    (json, { quiet } = {}) => {
      const nextRun = json.lastRunAt || null;
      const nextRow = (json.rows && json.rows[0]) || null;
      const prev = lastRunRef.current;
      const newer =
        nextRun && (!prev || new Date(nextRun).getTime() > new Date(prev).getTime());
      if (nextRow) setRow(nextRow);
      if (nextRun && (newer || !prev)) {
        lastRunRef.current = nextRun;
        setLastRunAt(nextRun);
        publishMeta(nextRun, false);
        if (!quiet && prev && newer) setSyncHint("Picked up a newer Dune run");
      } else {
        publishMeta(lastRunRef.current || nextRun, false);
      }
    },
    [publishMeta]
  );
  const pullLatest = useCallback(
    async ({ quiet = true } = {}) => {
      if (executingRef.current) return;
      try {
        if (!quiet) publishMeta(lastRunRef.current, true);
        const res = await fetch(`/api/clawdwire/latest?token=${tokenAddress}`, {
          headers: wireHeaders(),
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          if (!quiet) setErrorMsg(json.error || "Failed to load latest results");
          publishMeta(lastRunRef.current, false);
          return;
        }
        applyPayload(json, { quiet });
        // Functional update — do not close over `status` (that recreated this
        // callback on every Trip state change and remounted the auto-sync effect).
        if (!quiet) setStatus((s) => (s === "idle" ? "done" : s));
      } catch (err) {
        if (!quiet) setErrorMsg(String(err.message || err));
        publishMeta(lastRunRef.current, false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [applyPayload, publishMeta, walletAddress, tokenAddress]
  );
  // Switching tokens must blank the old numbers immediately. Leaving them up
  // while the new pulse loads would show one coin's data under another's
  // ticker — briefly, but that is exactly the failure this whole design is
  // built to prevent.
  useEffect(() => {
    setRow(null);
    setLastRunAt(null);
    setErrorMsg("");
    setSyncHint("");
    setCooldownMsg("");
    lastRunRef.current = null;
  }, [tokenAddress]);
  // Reads are cache-first and free, so everyone syncs — the wallet only ever
  // decides whether the Trip button can spend.
  useEffect(() => {
    pullLatest({ quiet: true });
    const id = setInterval(() => pullLatest({ quiet: true }), SYNC_MS);
    function onVis() {
      if (document.visibilityState === "visible") pullLatest({ quiet: true });
    }
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
      // Do NOT stopExecPoll here. pullLatest churn used to clear the
      // Trip interval while status stayed "running" (stuck forever).
    };
  }, [pullLatest]);
  // Clear Trip poll only on unmount.
  useEffect(() => {
    return () => stopExecPoll();
  }, []);
  useEffect(() => {
    if (!syncHint) return undefined;
    const t = setTimeout(() => setSyncHint(""), 4000);
    return () => clearTimeout(t);
  }, [syncHint]);
  // Keep relative pulse age honest without waiting for the next Sync.
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);
  // Shadow under the rail only once it has actually pinned to the top.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return undefined;
    const io = new IntersectionObserver(([entry]) => setStuck(!entry.isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  async function runClawdWire() {
    executingRef.current = true;
    setStatus("starting");
    setErrorMsg("");
    setSyncHint("");
    setCooldownMsg("");
    attemptsRef.current = 0;
    publishMeta(lastRunRef.current, true);
    try {
      const startRes = await fetch(`/api/clawdwire/start?token=${tokenAddress}`, {
        method: "POST",
        headers: wireHeaders(),
      });
      const startJson = await startRes.json();
      if (startRes.status === 429 || startJson.cooldown) {
        executingRef.current = false;
        setStatus("idle");
        setCooldownMsg(startJson.error || "This token was pulsed recently — wait before Tripping again.");
        publishMeta(lastRunRef.current, false);
        return;
      }
      if (!startRes.ok || !startJson.executionId) {
        throw new Error(startJson.error || "Failed to start ClawdWire run");
      }
      setStatus("running");
      pollRef.current = setInterval(async () => {
        attemptsRef.current += 1;
        if (attemptsRef.current > 90) {
          stopExecPoll();
          executingRef.current = false;
          setStatus("error");
          setErrorMsg("Taking longer than expected. Try again in a moment.");
          publishMeta(lastRunRef.current, false);
          return;
        }
        try {
          const statusRes = await fetch(
            `/api/clawdwire/status?executionId=${startJson.executionId}&token=${tokenAddress}`,
            { headers: wireHeaders() }
          );
          const statusJson = await statusRes.json();
          if (statusJson.state === "QUERY_STATE_COMPLETED") {
            stopExecPoll();
            executingRef.current = false;
            applyPayload(statusJson, { quiet: false });
            setStatus("done");
            setSyncHint("Fresh execute complete");
          } else if (
            statusJson.state === "QUERY_STATE_FAILED" ||
            statusJson.state === "QUERY_STATE_CANCELLED"
          ) {
            stopExecPoll();
            executingRef.current = false;
            setStatus("error");
            setErrorMsg("Dune query failed or was cancelled.");
            publishMeta(lastRunRef.current, false);
          }
        } catch {
          // keep polling
        }
      }, 2000);
    } catch (err) {
      executingRef.current = false;
      setStatus("error");
      setErrorMsg(String(err.message || err));
      publishMeta(lastRunRef.current, false);
    }
  }
  const isRunning = status === "starting" || status === "running";
  const isClawdToken = tokenAddress?.toLowerCase() === CLAWD_TOKEN_ADDRESS.toLowerCase();
  // Live solo CoinGecko quote is stamped on the pulse row at Trip/enrich time.
  // Snapshot fallback is CLAWD-only so another ticker never inherits CLAWD price.
  const displayPrice = row?.priceUsd ?? (isClawdToken ? clawdRow?.priceUsd : null) ?? null;
  const displayChange24h =
    row?.priceChange24h ?? (isClawdToken ? clawdRow?.priceChange7d : null) ?? null;
  const marketCap = row?.marketCapUsd ?? (isClawdToken ? clawdRow?.marketCapUsd : null) ?? null;
  // ── Derived reads (presentation only — every band names one source metric) ──
  const activeNet = row ? row[`Net USD ${activeWindow}`] : null;
  const activeBuy = row ? row[`Buy USD ${activeWindow}`] : null;
  const activeSell = row ? row[`Sell USD ${activeWindow}`] : null;
  // Prefer DEX trader counts (same tape as buy/sell $). Contract wallets/txs can
  // tick with $0 flow (approvals/transfers) and confused the hero.
  const activeBuyers = row ? row[`Buyers ${activeWindow}`] : null;
  const activeSellers = row ? row[`Sellers ${activeWindow}`] : null;
  const activeContractTxs = row ? row[`Txs ${activeWindow}`] : null;
  const hasDexTraders = activeBuyers != null || activeSellers != null;
  const heat = heatBand(row?.["Heat % 1h"]);
  const shape = roundTripBand(roundTripVol(row));
  const hold = holdBand(row?.["Survive 1d %"]);
  const whaleNet24h = row?.["Whale Net 24h"] ?? null;
  const fresh = freshness(lastRunAt);
  const peakHourKey = utcHourKey(row?.["Peak Price Hour"]);
  const worstHourKey = utcHourKey(row?.["Worst Net Hour"]);
  const tzAbbr = localTimeZoneAbbr();
  const hourLabel = tzAbbr ? `hour (${tzAbbr})` : "hour (local)";
  const netTape = useMemo(() => parseHourlyTape(row?.["Hourly Net Tape 24h"]), [row]);
  const whaleTape = useMemo(() => parseHourlyTape(row?.["Hourly Whale Tape 24h"]), [row]);
  const flowColumns = useMemo(
    () => WINDOWS.map((w) => ({ ...w, active: w.key === activeWindow })),
    [activeWindow]
  );
  const flowRows = useMemo(() => {
    if (!row) return [];
    const per = (field, fmt, toned) =>
      WINDOWS.map((w) => {
        const raw = row[`${field} ${w.key}`];
        return cell(raw, fmt(raw), toned ? netTone(raw) : undefined);
      });
    return [
      { label: "Net $", hint: "buy − sell", emph: true, cells: per("Net USD", fmtUsdSigned, true) },
      { label: "Buy $", cells: per("Buy USD", fmtUsdCompact).map((c) => ({ ...c, tone: "pos" })) },
      { label: "Sell $", cells: per("Sell USD", fmtUsdCompact).map((c) => ({ ...c, tone: "neg" })) },
      { label: "Buy vol %", hint: "share of window volume", cells: per("Buy Vol %", fmtPct) },
      { label: "Wallets", hint: "contract calls", cells: per("Wallets", fmtInt) },
      { label: "Txs", hint: "contract calls", cells: per("Txs", fmtInt) },
      { label: "Buyers", hint: "DEX swaps", cells: per("Buyers", fmtInt) },
      { label: "Sellers", hint: "DEX swaps", cells: per("Sellers", fmtInt) },
      { label: "Max trade $", hint: "largest single swap", cells: per("Max Trade USD", fmtUsdCompact) },
    ];
  }, [row]);
  const cohortRows = useMemo(() => {
    if (!row) return [];
    const m = exclusiveCohortMetrics(row);
    if (!m) return [];
    const whaleMin = fmtUsd(row["Whale Min $"]);
    const megaMin = fmtUsd(row["Hump Min $"]);
    const floor = megaFloorNote(row["Hump Min $"]);
    const line = (label, hint, emph, t) => ({
      label,
      hint,
      emph,
      cells: [
        cell(t.net24, fmtUsdSigned(t.net24), netTone(t.net24)),
        cell(t.net7, fmtUsdSigned(t.net7), netTone(t.net7)),
        cell(t.buyers24, fmtInt(t.buyers24)),
        cell(t.sellers24, fmtInt(t.sellers24)),
        cell(t.buyers7, fmtInt(t.buyers7)),
        cell(t.sellers7, fmtInt(t.sellers7)),
      ],
    });
    return [
      line("Mega whale", `≥ ${megaMin}${floor} · top 1%`, true, m.mega),
      line("Whale", `${whaleMin} → ${megaMin} · top 10%`, false, m.whaleOnly),
      line("Retail", `< ${whaleMin}`, false, m.retail),
    ];
  }, [row]);
  const cohortPies = useMemo(() => {
    if (!row) return [];
    const colors = {
      mega: "var(--clawd-row-border)",
      whaleOnly: "var(--text-muted)",
      retail: "var(--text-faint)",
    };
    return ["24h", "7d"].map((window) => {
      const mix = exclusiveCohortMix(row, window);
      if (!mix) return null;
      return {
        window,
        mode: mix.mode,
        slices: [
          { key: "mega", label: "Mega", pct: mix.mega, color: colors.mega },
          { key: "whale", label: "Whale", pct: mix.whaleOnly, color: colors.whaleOnly },
          { key: "retail", label: "Retail", pct: mix.retail, color: colors.retail },
        ],
      };
    }).filter(Boolean);
  }, [row]);
  const participationRows = useMemo(() => {
    if (!row) return [];
    const per = (field, fmt) =>
      PARTICIPATION_WINDOWS.map((w) => {
        const raw = row[`${field} ${w.key}`];
        return cell(raw, fmt(raw));
      });
    return [
      { label: "Volume $", emph: true, cells: per("Vol", fmtUsdCompact) },
      { label: "Traders", hint: "unique addresses", cells: per("Traders", fmtInt) },
      { label: "Wallets", hint: "contract calls", cells: per("Wallets", fmtInt) },
      { label: "Txs", hint: "contract calls", cells: per("Txs", fmtInt) },
      { label: "Buyers", hint: "DEX swaps", cells: per("Buyers", fmtInt) },
      { label: "Sellers", hint: "DEX swaps", cells: per("Sellers", fmtInt) },
      { label: "New-in-30d buyers", hint: "first buy in this 30d scan fell in window — not lifetime", cells: per("1st Buyers", fmtInt) },
      { label: "New-in-30d sellers", hint: "first sell in this 30d scan fell in window — not lifetime", cells: per("1st Sellers", fmtInt) },
      { label: "Buy/sell ratio", cells: per("Buy/Sell Ratio", fmtRatio) },
      { label: "Buy vol %", cells: per("Buy Vol %", fmtPct) },
      { label: "Vol per tx $", cells: per("Vol/Tx", fmtUsdCompact) },
      { label: "Txs per trader", cells: per("Txs/Trader", fmtRatio) },
    ];
  }, [row]);
  // Timing: the three hours around the price peak, all flow vs whale flow.
  const peakRows = useMemo(() => {
    if (!row) return [];
    const line = (label, before, at, after) => ({
      label,
      emph: label === "All flow",
      cells: [before, at, after].map((k) => cell(row[k], fmtUsdSigned(row[k]), netTone(row[k]))),
    });
    return [
      line("All flow", "Net Hour Before Peak", "Net At Peak Hour", "Net Hour After Peak"),
      line("Whale flow", "Whale Net Hour Before Peak", "Whale Net At Peak Hour", "Whale Net Hour After Peak"),
    ];
  }, [row]);
  const matchRows = useMemo(() => {
    if (!row) return [];
    const pair = (label, k24, k30, fmt, toned) => ({
      label,
      emph: label === "Net result $",
      cells: [k24, k30].map((k) =>
        cell(row[k], fmt(row[k]), toned ? netTone(row[k]) : undefined)
      ),
    });
    return [
      pair("Above-match %", "Winner % 24h", "Winner % 30d", fmtPct),
      pair("Above-match wallets", "PnL Winners 24h", "PnL Winners 30d", fmtInt),
      pair("Below-match wallets", "PnL Losers 24h", "PnL Losers 30d", fmtInt),
      pair("Both-side wallets", "Closed Wallets 24h", "Closed Wallets 30d", fmtInt),
      pair("Above-match $", "Closed Gains $ 24h", "Closed Gains $ 30d", fmtUsdCompact),
      pair("Below-match $", "Closed Losses $ 24h", "Closed Losses $ 30d", fmtUsdCompact),
      pair("Net result $", "Net Closed PnL $ 24h", "Net Closed PnL $ 30d", fmtUsdSigned, true),
    ];
  }, [row]);
  const pulseAge = timeAgo(lastRunAt);
  const pulseClock = formatPulseClock(lastRunAt);
  const railStatus = isRunning
    ? status === "starting"
      ? "Starting Dune execute…"
      : "Running on Dune…"
    : lastRunAt
    ? `Pulse ${pulseAge}`
    : "No pulse yet";
  return (
    <div className="cw-root">
      <style>{CLAWDWIRE_CSS}</style>
      <div className="cw-shell">
        <div className="cw-pulse">
          <div className="cw-hero-top">
            <ClawdWireTokenPicker
              value={tokenAddress}
              symbol={tokenSymbol}
              onChange={setToken}
            />
            {displayPrice != null ? (
              <span className="cw-mono" style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>
                <FlashNum raw={displayPrice}>{fmtPrice(displayPrice)}</FlashNum>
              </span>
            ) : null}
            {displayChange24h != null ? (
              <span
                className="cw-mono"
                style={{ fontSize: "13px", fontWeight: 700, color: toneColor(netTone(displayChange24h)) }}
              >
                {fmtPctSigned(displayChange24h)}
                <span style={{ color: "var(--text-xfaint)", fontWeight: 400 }}> 24h</span>
              </span>
            ) : null}
            {marketCap != null ? (
              <span className="cw-mono" style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                MC {fmtUsd(marketCap)}
              </span>
            ) : null}
          </div>
          <div className="cw-net">
            <div className="cw-flow-window" data-window={activeWindow}>
              <div className="cw-flow-window-head">
                <div>
                  <div className="cw-flow-window-label">Net flow</div>
                  <div className="cw-flow-window-hint">DEX buy $ − sell $ — price can diverge</div>
                </div>
                <WindowSeg value={activeWindow} onChange={setActiveWindow} />
              </div>
          <div
            className="cw-display"
            key={activeWindow}
            style={{
              fontSize: "clamp(42px, 8vw, 64px)",
              color: row ? toneColor(netTone(activeNet)) : "var(--text-faint)",
            }}
          >
            <FlashNum raw={activeNet}>{row ? fmtUsdSigned(activeNet) : "—"}</FlashNum>
          </div>
          <div style={{ marginTop: "12px", maxWidth: "420px" }}>
            <PressureBar buy={activeBuy} sell={activeSell} />
            <div
              className="cw-mono"
              style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "6px", fontSize: "11px" }}
            >
              <span style={{ color: "var(--read-teal-text)" }}>buy {fmtUsdCompact(activeBuy)}</span>
              <span style={{ color: "var(--text-xfaint)" }} title={hasDexTraders ? "Distinct DEX swap traders in this window" : "Calls to the token contract (not the same as swap $)"}>
                {hasDexTraders
                  ? `${fmtInt(activeBuyers ?? 0)} buyers · ${fmtInt(activeSellers ?? 0)} sellers`
                  : `${fmtInt(activeContractTxs)} contract txs`}
              </span>
              <span style={{ color: "var(--read-coral-text)" }}>sell {fmtUsdCompact(activeSell)}</span>
            </div>
          </div>
            </div>
            <div className="cw-story">
          <div className="cw-story-cell">
            <div className="cw-story-label">
              <span>Whale net · 24h</span>
              <span className="cw-chip-band" style={{ color: toneColor(whaleNet24h == null ? "faint" : netTone(whaleNet24h)) }}>
                <LiveDot tone={whaleNet24h == null ? "faint" : netTone(whaleNet24h)} />
                {whaleNet24h == null ? "no data" : num(whaleNet24h) > 0 ? "accumulating" : "distributing"}
              </span>
            </div>
            <div
              className="cw-story-value cw-mono"
              style={{ color: whaleNet24h == null ? "var(--text-faint)" : toneColor(netTone(whaleNet24h)) }}
            >
              <FlashNum raw={whaleNet24h}>{fmtUsdSigned(whaleNet24h)}</FlashNum>
            </div>
            <div className="cw-story-note">
              Large-wallet buy $ − sell $. Whale vol {fmtPct(row?.["Whale Vol % 24h"])} of day.
            </div>
          </div>
          <div className="cw-story-cell">
            <div className="cw-story-label">
              <span>Heat · 1h</span>
              <span className="cw-chip-band" style={{ color: toneColor(heat.tone) }}>
                <LiveDot tone={heat.tone} />
                {heat.label}
              </span>
            </div>
            <div
              className="cw-story-value cw-mono"
              style={{ color: row?.["Heat % 1h"] == null ? "var(--text-faint)" : "var(--text)" }}
            >
              <FlashNum raw={row?.["Heat % 1h"]}>{fmtPct(row?.["Heat % 1h"])}</FlashNum>
            </div>
            <div className="cw-story-note">
              Share of 24h volume in the last hour. Flat day ≈ {FLAT_HOUR_SHARE.toFixed(1)}%.
            </div>
          </div>
          <div className="cw-story-cell">
            <div className="cw-story-label">
              <span>Survive · 1d</span>
              <span className="cw-chip-band" style={{ color: toneColor(hold.tone) }}>
                <LiveDot tone={hold.tone} />
                {hold.label}
              </span>
            </div>
            <div
              className="cw-story-value cw-mono"
              style={{ color: row?.["Survive 1d %"] == null ? "var(--text-faint)" : "var(--text)" }}
            >
              <FlashNum raw={row?.["Survive 1d %"]}>{fmtPct(row?.["Survive 1d %"])}</FlashNum>
            </div>
            <div className="cw-story-note">
              New-in-30d buyers still holding a day later (cohort{" "}
              {fmtInt(row?.["1st Buyer Cohort 30d"])}).
            </div>
          </div>
        </div>
          </div>
        </div>
        <div ref={sentinelRef} aria-hidden="true" style={{ height: "1px" }} />
        {/* ── Command rail — sticky control surface ──────────────────────── */}
      <div className="cw-rail" data-stuck={stuck ? "true" : "false"}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
          <LiveDot tone={isRunning ? "caution" : fresh.tone} ping={isRunning || fresh.tone === "pos"} />
          <span style={{ minWidth: 0 }}>
            <span
              className="cw-mono"
              style={{
                display: "block",
                fontSize: "15px",
                fontWeight: 700,
                color: isRunning
                  ? "var(--read-amber-text)"
                  : toneColor(fresh.tone === "pos" ? "pos" : fresh.tone === "caution" ? "caution" : "muted"),
                whiteSpace: "nowrap",
              }}
            >
              {railStatus}
            </span>
            {pulseClock && !isRunning ? (
              <span className="cw-mono" style={{ display: "block", fontSize: "11px", color: "var(--text-faint)" }}>
                {pulseClock}
              </span>
            ) : null}
          </span>
        </span>
        {stuck ? (
          <>
            <WindowSeg value={activeWindow} onChange={setActiveWindow} size="sm" />
            {row ? (
              <span
                className="cw-mono"
                style={{ fontSize: "13px", fontWeight: 700, color: toneColor(netTone(activeNet)), whiteSpace: "nowrap" }}
              >
                {fmtUsdSigned(activeNet)}
              </span>
            ) : null}
          </>
        ) : null}
        <span className="cw-rail-spacer" />
        <button type="button" className="cw-btn" onClick={() => pullLatest({ quiet: false })} disabled={isRunning}>
          Sync
        </button>
        <button
          type="button"
          className="cw-btn cw-btn-primary"
          onClick={runClawdWire}
          disabled={isRunning || !canTrip}
          title={
            canTrip
              ? `Run a fresh pulse for ${tokenSymbol}`
              : "Connect a wallet with 10M+ CLAWD to Trip"
          }
        >
          {isRunning ? "Running…" : canTrip ? "Trip ClawdWire" : "Trip · 10M CLAWD"}
        </button>
      </div>
      {fresh.tone === "caution" && lastRunAt && !isRunning ? (
        <p className="cw-alert" data-tone="caution">
          Pulse is <strong>{pulseAge}</strong> old — Trip for a fresh Dune run (or Sync if someone else just did).
        </p>
      ) : null}
      {cooldownMsg ? (
        <p className="cw-alert" data-tone="caution">{cooldownMsg}</p>
      ) : null}
      {syncHint || (status === "error" && errorMsg) || isRunning ? (
        <p
          className="cw-note"
          data-tone={status === "error" && errorMsg ? "neg" : syncHint ? "pos" : undefined}
          style={{ padding: "10px 14px", borderTop: "1px solid var(--border)", margin: 0 }}
        >
          {status === "error" && errorMsg
            ? errorMsg
            : syncHint || "Executing on Dune — results land here automatically."}
        </p>
      ) : null}
      {!row ? (
          <div className="cw-empty">
            <div className="cw-empty-title">No pulse yet for {tokenSymbol}</div>
            <div className="cw-empty-body">
              {canTrip ? (
                <>
                  Nobody has run a live pulse on this token. Hit <strong>Trip ClawdWire</strong> to run
                  one — it takes about a minute, and once it lands it is cached, so everyone else can
                  read it for free.
                </>
              ) : (
                <>
                  Nobody has run a live pulse on this token yet. Running one costs Dune credits, so{" "}
                  <strong>Trip</strong> needs a wallet with 10M+ CLAWD — once anybody runs it, the
                  result is cached and free for everyone to read.
                </>
              )}
            </div>
            <div className="cw-empty-foot">
              Browsing other tokens never starts a run. Tokens with a pulse already are marked in the
              picker.
            </div>
          </div>
        ) : (
          <>
            <ChapterNav chapters={CHAPTERS} value={chapter} onChange={setChapter} />

            <div className="cw-body" ref={chapterBodyRef}>
              {chapter === "flow" ? (
                <>
                  <h3 className="cw-chapter-head">Flow</h3>
                  <p className="cw-chapter-sub">
                    Highlighted column = {activeWindow} (same as the net-flow toggle above). Net $ is buy minus sell.
                  </p>
                  <Matrix columns={flowColumns} rows={flowRows} rowHeadLabel="Metric" />
                  <div style={{ marginTop: "10px" }}>
                    <StatStrip
                      items={[
                        { label: "Heat % 1h", value: fmtPct(row["Heat % 1h"]), raw: row["Heat % 1h"] },
                        { label: "Heat % 6h", value: fmtPct(row["Heat % 6h"]), raw: row["Heat % 6h"] },
                        { label: "Trade heat % 1h", value: fmtPct(row["Trade Heat % 1h"]), raw: row["Trade Heat % 1h"] },
                        { label: "Median trade $", value: fmtUsd(row["Median Trade 24h"]), raw: row["Median Trade 24h"] },
                        { label: "P90 trade $", value: fmtUsd(row["P90 Trade 24h"]), raw: row["P90 Trade 24h"] },
                      ]}
                    />
                    <p className="cw-note" style={{ fontSize: "10.5px", color: "var(--text-xfaint)" }}>
                      Heat = share of 24h volume inside the window. Flat-day baselines: {FLAT_HOUR_SHARE.toFixed(1)}% at 1h, 25% at 6h.
                    </p>
                  </div>
                </>
              ) : null}

              {chapter === "who" ? (
                <>
                  <h3 className="cw-chapter-head">Who</h3>
                  <p className="cw-chapter-sub">
                    Wallets behind today&apos;s biggest flows, then tier cohorts and participation by window.
                  </p>

                  <div className="cw-wallet-grid">
                    <WalletLens title="Top buyers 24h" subtitle="wallet · buy $ · buy txs · net · biggest trade" raw={row["Top Buyers 24h"]} />
                    <WalletLens title="Top sellers 24h" subtitle="wallet · sell $ · sell txs · net · biggest trade" raw={row["Top Sellers 24h"]} />
                    <WalletLens title="Top net accumulators 24h" subtitle="largest buy − sell net, with total txs" raw={row["Top Net Accumulators 24h"]} />
                    <WalletLens title="Biggest prints 24h" subtitle="largest single DEX trades — side · $ · wallet · tx" raw={row["Biggest Prints 24h"]} />
                  </div>
                  <p className="cw-note" style={{ marginBottom: "18px", fontSize: "10.5px" }}>
                    One address is not one person. A single actor can split across wallets, and one wallet can be a
                    router, a market maker, or an exchange hot wallet moving for many users.
                  </p>

                  <SubHead>Cohort tiers</SubHead>
                  <p className="cw-note" style={{ margin: "0 0 10px", fontSize: "11.5px" }}>
                    Exclusive size bands from CLAWD&apos;s 30d tape — mega ≥ {fmtUsd(row["Hump Min $"])}
                    {megaFloorNote(row["Hump Min $"])}, whale {fmtUsd(row["Whale Min $"])}→{fmtUsd(row["Hump Min $"])},
                    retail below. Mega is split out of whale so nothing is counted twice.
                  </p>
                  {cohortPies.length ? (
                    <div className="cw-cohort">
                      {cohortPies.map((p) => (
                        <CohortPie
                          key={p.window}
                          title={`${p.window} mix`}
                          slices={p.slices}
                          caption={
                            p.mode === "volume"
                              ? "Share of DEX volume in each exclusive band."
                              : "Share of |net USD| until next Trip adds volume splits — same exclusive bands."
                          }
                        />
                      ))}
                    </div>
                  ) : null}
                  <Matrix
                    rowHeadLabel="Tier"
                    columns={[
                      { key: "net24", label: "Net 24h" },
                      { key: "net7", label: "Net 7d" },
                      { key: "b24", label: "Buyers 24h" },
                      { key: "s24", label: "Sellers 24h" },
                      { key: "b7", label: "Buyers 7d" },
                      { key: "s7", label: "Sellers 7d" },
                    ]}
                    rows={cohortRows}
                  />
                  <Disclosure title="Whale depth" note={`net 24h ${fmtUsdSigned(whaleNet24h)}`}>
                    <StatStrip
                      items={[
                        { label: "Accum % 24h", value: fmtPct(row["Accum % 24h"]), raw: row["Accum % 24h"] },
                        { label: "Accum % 7d", value: fmtPct(row["Accum %"]), raw: row["Accum %"] },
                        { label: "Whale vol % 24h", value: fmtPct(row["Whale Vol % 24h"]), raw: row["Whale Vol % 24h"] },
                        { label: "Whale vol % 7d", value: fmtPct(row["Whale Vol %"]), raw: row["Whale Vol %"] },
                        {
                          label: "W/R div bps 24h",
                          value: fmtRatio(divergenceBps(row["Whale Net 24h"], row["Retail Net 24h"], marketCap)),
                          raw: divergenceBps(row["Whale Net 24h"], row["Retail Net 24h"], marketCap),
                          tone: netTone(divergenceBps(row["Whale Net 24h"], row["Retail Net 24h"], marketCap)),
                        },
                        {
                          label: "W/R div bps 7d",
                          value: fmtRatio(divergenceBps(row["Whale Net 7d"], row["Retail Net 7d"], marketCap)),
                          raw: divergenceBps(row["Whale Net 7d"], row["Retail Net 7d"], marketCap),
                          tone: netTone(divergenceBps(row["Whale Net 7d"], row["Retail Net 7d"], marketCap)),
                        },
                        { label: "Whale traders 7d", value: fmtInt(row["Whale Traders 7d"]), raw: row["Whale Traders 7d"] },
                        { label: "Whale active 24h", value: fmtInt(row["Whale Active 24h"]), raw: row["Whale Active 24h"] },
                        { label: "Whale persist %", value: fmtPct(row["Whale Persist %"]), raw: row["Whale Persist %"] },
                        { label: "Flippers 24h", value: fmtInt(row["Flippers 24h"]), raw: row["Flippers 24h"] },
                        { label: "Flipper % 24h", value: fmtPct(row["Flipper % 24h"]), raw: row["Flipper % 24h"] },
                      ]}
                    />
                    <p className="cw-note" style={{ fontSize: "10.5px", color: "var(--text-xfaint)" }}>
                      Tiering is address-level. Batched exchange withdrawals and smart-contract wallets can land in the wrong tier.
                    </p>
                  </Disclosure>

                  <div style={{ marginTop: "18px" }}>
                    <SubHead>Participation</SubHead>
                    <Matrix rowHeadLabel="Metric" columns={PARTICIPATION_WINDOWS} rows={participationRows} />
                  </div>

                  <Disclosure title="Week over week" note={`${fmtInt(row["Traders 24h"])} traders, 24h`}>
                    <StatStrip
                      items={[
                        { label: "Vol grw %", value: fmtPctSigned(row["Vol Grw %"]), raw: row["Vol Grw %"], tone: netTone(row["Vol Grw %"]) },
                        { label: "Tx grw %", value: fmtPctSigned(row["Tx Grw %"]), raw: row["Tx Grw %"], tone: netTone(row["Tx Grw %"]) },
                        { label: "User grw %", value: fmtPctSigned(row["User Grw %"]), raw: row["User Grw %"], tone: netTone(row["User Grw %"]) },
                        { label: "Retention %", value: fmtPct(row["Retention %"]), raw: row["Retention %"] },
                        { label: "Retained traders", value: fmtInt(row["Retained Traders"]), raw: row["Retained Traders"] },
                        { label: "New vs prev week", value: fmtInt(row["New vs Prev Week"]), raw: row["New vs Prev Week"] },
                        { label: "New traders 7d", value: fmtInt(row["New Traders 7d"]), raw: row["New Traders 7d"] },
                        { label: "Returning 7d", value: fmtInt(row["Returning Traders 7d"]), raw: row["Returning Traders 7d"] },
                        { label: "Returning % 7d", value: fmtPct(row["Returning % 7d"]), raw: row["Returning % 7d"] },
                        { label: "Vol prev 7d", value: fmtUsdCompact(row["Vol Prev 7d"]), raw: row["Vol Prev 7d"] },
                        { label: "Txs prev 7d", value: fmtInt(row["Txs Prev 7d"]), raw: row["Txs Prev 7d"] },
                        { label: "Traders prev 7d", value: fmtInt(row["Traders Prev 7d"]), raw: row["Traders Prev 7d"] },
                      ]}
                    />
                  </Disclosure>
                </>
              ) : null}

              {chapter === "when" ? (
                <>
                  <h3 className="cw-chapter-head">When</h3>
                  <p className="cw-chapter-sub">
                    On-chain flow lined up against the 24h trade-price peak. Match the peak hour here to the spike on your chart.
                  </p>
                  <Matrix
                    rowHeadLabel="Net $"
                    columns={[
                      { key: "before", label: "Hour before peak" },
                      { key: "at", label: "Peak hour", active: true },
                      { key: "after", label: "Hour after peak" },
                    ]}
                    rows={peakRows}
                  />
                  <div style={{ marginTop: "10px" }}>
                    <StatStrip
                      items={[
                        { label: `Peak ${hourLabel}`, value: fmtUtcHour(row["Peak Price Hour"]) },
                        { label: "Vol at peak hour", value: fmtUsd(row["Vol At Peak Hour"]), raw: row["Vol At Peak Hour"] },
                        { label: `Best ${hourLabel}`, value: fmtUtcHour(row["Best Net Hour"]) },
                        { label: "Best hour net", value: fmtUsdSigned(row["Best Hour Net $"]), raw: row["Best Hour Net $"], tone: netTone(row["Best Hour Net $"]) },
                        { label: "Whale at best hour", value: fmtUsdSigned(row["Whale Net At Best Hour"]), raw: row["Whale Net At Best Hour"], tone: netTone(row["Whale Net At Best Hour"]) },
                        { label: `Worst ${hourLabel}`, value: fmtUtcHour(row["Worst Net Hour"]) },
                        { label: "Worst hour net", value: fmtUsdSigned(row["Worst Hour Net $"]), raw: row["Worst Hour Net $"], tone: netTone(row["Worst Hour Net $"]) },
                        { label: "Whale at worst hour", value: fmtUsdSigned(row["Whale Net At Worst Hour"]), raw: row["Whale Net At Worst Hour"], tone: netTone(row["Whale Net At Worst Hour"]) },
                        { label: "Vol at worst hour", value: fmtUsd(row["Vol At Worst Hour"]), raw: row["Vol At Worst Hour"] },
                      ]}
                    />
                  </div>

                  {netTape.length ? (
                    <div style={{ marginTop: "20px" }}>
                      <SubHead>Hourly tape · all flow</SubHead>
                      <HourlyTape
                        bars={netTape}
                        peakHour={peakHourKey}
                        worstHour={worstHourKey}
                        label={`Net dollar flow per local hour (${tzAbbr || "your timezone"}) over the last 24 hours`}
                      />
                    </div>
                  ) : null}

                  {whaleTape.length ? (
                    <div style={{ marginTop: "20px" }}>
                      <SubHead>Hourly tape · whale flow</SubHead>
                      <HourlyTape
                        bars={whaleTape}
                        peakHour={peakHourKey}
                        worstHour={worstHourKey}
                        label={`Whale-tier net dollar flow per local hour (${tzAbbr || "your timezone"}) over the last 24 hours`}
                      />
                    </div>
                  ) : null}

                  <div style={{ marginTop: "20px" }}>
                    <SubHead>Run-up · hour before peak + peak hour</SubHead>
                    <StatStrip
                      items={[
                        { label: "Run-up net $", value: fmtUsdSigned(row["Run-up Net $"]), raw: row["Run-up Net $"], tone: netTone(row["Run-up Net $"]) },
                        { label: "Buy $", value: fmtUsdCompact(row["Run-up Buy $"]), raw: row["Run-up Buy $"], tone: "pos" },
                        { label: "Sell $", value: fmtUsdCompact(row["Run-up Sell $"]), raw: row["Run-up Sell $"], tone: "neg" },
                        { label: "Buyers", value: fmtInt(row["Run-up Buyers"]), raw: row["Run-up Buyers"] },
                        { label: "Sellers", value: fmtInt(row["Run-up Sellers"]), raw: row["Run-up Sellers"] },
                      ]}
                    />
                    <div className="cw-wallet-grid" style={{ marginTop: "12px" }}>
                      <WalletLens title="Run-up top buyers" subtitle="bought in the hour before peak + peak hour" raw={row["Run-up Top Buyers"]} />
                      <WalletLens title="Run-up top sellers" subtitle="sold into the rip, same 2h window" raw={row["Run-up Top Sellers"]} />
                    </div>
                  </div>

                  <div style={{ marginTop: "20px" }}>
                    <SubHead>Dump hour · worst net hour in the last 24h</SubHead>
                    <StatStrip
                      items={[
                        { label: "Dump hour net $", value: fmtUsdSigned(row["Dump Hour Net $"]), raw: row["Dump Hour Net $"], tone: netTone(row["Dump Hour Net $"]) },
                        { label: "Buy $", value: fmtUsdCompact(row["Dump Hour Buy $"]), raw: row["Dump Hour Buy $"], tone: "pos" },
                        { label: "Sell $", value: fmtUsdCompact(row["Dump Hour Sell $"]), raw: row["Dump Hour Sell $"], tone: "neg" },
                        { label: "Buyers", value: fmtInt(row["Dump Hour Buyers"]), raw: row["Dump Hour Buyers"] },
                        { label: "Sellers", value: fmtInt(row["Dump Hour Sellers"]), raw: row["Dump Hour Sellers"] },
                        { label: `Worst ${hourLabel}`, value: fmtUtcHour(row["Worst Net Hour"]) },
                      ]}
                    />
                    <div className="cw-wallet-grid" style={{ marginTop: "12px" }}>
                      <WalletLens title="Dump hour top sellers" subtitle="sold in the worst net hour" raw={row["Dump Hour Top Sellers"]} />
                      <WalletLens title="Dump hour top buyers" subtitle="bought the dip in that same hour" raw={row["Dump Hour Top Buyers"]} />
                    </div>
                  </div>
                </>
              ) : null}

              {chapter === "shape" ? (
                <>
                  <h3 className="cw-chapter-head">Shape</h3>
                  <p className="cw-chapter-sub">
                    Is the move real, and will it hold? Measured price efficiency is kept separate from inferred trade-shape signals.
                  </p>
                  <div className="cw-suspect-panel">
                    <p className="cw-suspect-note">
                      <SuspectBadge />
                      <span>
                        Research heuristics from trade sizes and timing — not accusations, and not proof of intent.
                        Uniform sizing, repeated round-trips and long one-sided streaks are shapes that automated
                        strategies leave behind, and ordinary market making leaves the same ones.
                      </span>
                    </p>
                    <StatStrip
                      items={[
                        {
                          label: "Round-trip vol % 24h",
                          value: fmtPct(roundTripVol(row)),
                          raw: roundTripVol(row),
                          tone: shape.tone === "caution" ? "caution" : undefined,
                        },
                        { label: "Round-trip wallets 24h", value: fmtInt(roundTripWallets(row)), raw: roundTripWallets(row) },
                        { label: "Size uniformity %", value: fmtPct(row["Size Uniformity %"]), raw: row["Size Uniformity %"] },
                        { label: "Size CV 24h", value: fmtRatio(row["Size CV 24h"]), raw: row["Size CV 24h"] },
                        { label: "Longest buy streak", value: fmtInt(row["Longest Buy Streak"]), raw: row["Longest Buy Streak"] },
                        { label: "Longest sell streak", value: fmtInt(row["Longest Sell Streak"]), raw: row["Longest Sell Streak"] },
                      ]}
                    />
                  </div>

                  <div style={{ marginTop: "16px" }}>
                    <SubHead>Measured price efficiency</SubHead>
                    <StatStrip
                      items={[
                        { label: "Vol per 1% move $", value: fmtUsd(row["Vol per 1% Move $"]), raw: row["Vol per 1% Move $"] },
                        { label: "Abs move % 24h", value: fmtPct(row["Abs Move % 24h"]), raw: row["Abs Move % 24h"] },
                      ]}
                    />
                    <p className="cw-note" style={{ fontSize: "10.5px", color: "var(--text-xfaint)" }}>
                      Straight arithmetic on observed 24h volume and open→close price — no inference. High volume per 1%
                      move means the book absorbed size; read it next to the shape signals above.
                    </p>
                  </div>

                  <div style={{ marginTop: "18px" }}>
                    <SubHead>Conviction</SubHead>
                    <div
                      style={{
                        display: "grid",
                        gap: "16px",
                        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
                        alignItems: "start",
                      }}
                    >
                      <div
                        style={{
                          border: "1px solid var(--border)",
                          borderRadius: "10px",
                          background: "var(--bg-subtle)",
                          padding: "13px 14px",
                        }}
                      >
                        <div style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.09em", textTransform: "uppercase", color: "var(--text-faint)", marginBottom: "10px" }}>
                          New-in-30d buyers still holding after
                        </div>
                        <Ladder
                          steps={[
                            { key: "1h", pct: row["Survive 1h %"] },
                            { key: "1d", pct: row["Survive 1d %"] },
                            { key: "3d", pct: row["Survive 3d %"] },
                            { key: "7d", pct: row["Survive 7d %"] },
                          ]}
                        />
                        <p className="cw-note" style={{ margin: "10px 0 0", fontSize: "10.5px", color: "var(--text-xfaint)" }}>
                          Cohort of {fmtInt(row["1st Buyer Cohort 30d"])} wallets whose first buy in the last 30 days is in this scan — not lifetime first buy.
                        </p>
                      </div>
                      <StatStrip
                        items={[
                          { label: "Median flip", value: fmtMins(row["Median Flip Mins"]), raw: row["Median Flip Mins"] },
                          { label: "Flip · new-in-7d", value: fmtMins(row["Median Flip Mins New"]), raw: row["Median Flip Mins New"] },
                          { label: "Flip · returning", value: fmtMins(row["Median Flip Mins Returning"]), raw: row["Median Flip Mins Returning"] },
                          { label: "New-in-30d cohort", value: fmtInt(row["1st Buyer Cohort 30d"]), raw: row["1st Buyer Cohort 30d"] },
                        ]}
                      />
                    </div>
                  </div>
                </>
              ) : null}

              {chapter === "lab" ? (
                <>
                  <h3 className="cw-chapter-head">Lab</h3>
                  <p className="cw-chapter-sub">
                    Matched VWAP experiment — above match {fmtPct(row["Winner % 24h"])}, 24h.
                  </p>
                  <div className="cw-suspect-panel">
                    <p className="cw-suspect-note">
                      <SuspectBadge title="Research heuristic — an experiment, not a settled measure" />
                      <span>
                        An experiment, and honestly not the sharpest tool in the shed. For each wallet we match buys
                        against sells inside the window — matched tokens = min(buy amount, sell amount), result =
                        matched × (sell VWAP − buy VWAP) — using on-chain swaps on this pair only. It cannot see
                        transfers, bridges, other venues, or anything a wallet did before the window opened, so plenty
                        of real activity is invisible to it. Interesting to look at; don&apos;t take it to the bank.
                      </span>
                    </p>
                    <Matrix
                      rowHeadLabel="Metric"
                      columns={[
                        { key: "24h", label: "24h" },
                        { key: "30d", label: "30d" },
                      ]}
                      rows={matchRows}
                    />
                    <p className="cw-note" style={{ margin: "10px 0 0", fontSize: "10.5px", color: "var(--text-xfaint)", lineHeight: 1.5 }}>
                      &ldquo;Above match&rdquo; simply means a wallet&apos;s sell VWAP came in above its buy VWAP on the
                      tokens it round-tripped inside the window. Wallets that only bought, or only sold, never enter the count.
                    </p>
                  </div>

                  <p className="cw-note" style={{ fontSize: "11px", lineHeight: 1.55, maxWidth: "820px" }}>
                    To be unambiguous about what this is not: it is not FIFO, not cost basis, not realized gain or
                    loss, and not a tax, accounting, legal, or financial figure of any kind. Do not use it for filing
                    or for any reporting purpose. Community research display only — Tripwire does not provide tax,
                    legal, or financial advice.
                  </p>

                  <Disclosure title="Top matched-result wallets · 24h" note="research heuristic, not a tax form">
                    <WalletLens
                      title="Top above-match wallets 24h"
                      subtitle="highest in-window matched VWAP result — wallet · result · buy VWAP · sell VWAP"
                      raw={row["Top Closed Winners 24h"]}
                    />
                    <WalletLens
                      title="Top below-match wallets 24h"
                      subtitle="lowest in-window matched VWAP result"
                      raw={row["Top Closed Losers 24h"]}
                    />
                  </Disclosure>
                </>
              ) : null}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
function SubHead({ children }) {
  return <div className="cw-subhead">{children}</div>;
}

