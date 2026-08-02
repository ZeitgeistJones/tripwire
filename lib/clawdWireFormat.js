/**
 * Formatting + banding helpers for ClawdWire.
 *
 * Two rules drive everything here:
 *  1. Numbers are for scanning, so every formatter returns a fixed-shape string
 *     (tabular digits, real minus sign U+2212, "—" for missing).
 *  2. Bands are presentation only. Each one is derived from a single named
 *     metric with a stated threshold — nothing is blended into a new score.
 */

export function num(v) {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

const MINUS = "−";

export function fmtUsd(v, digits = 0) {
  const n = num(v);
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `$${n.toLocaleString(undefined, { maximumFractionDigits: digits })}`;
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

/** Compact USD for dense grids and the hero readout. */
export function fmtUsdCompact(v) {
  const n = num(v);
  if (n == null) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? MINUS : "";
  if (abs >= 1_000_000_000) return `${sign}$${(abs / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  if (abs >= 100) return `${sign}$${abs.toFixed(0)}`;
  return `${sign}$${abs.toFixed(2)}`;
}

/** Net flow always carries an explicit sign — direction is the whole point. */
export function fmtUsdSigned(v) {
  const n = num(v);
  if (n == null) return "—";
  if (n === 0) return "$0";
  return `${n > 0 ? "+" : MINUS}${fmtUsdCompact(Math.abs(n))}`;
}

export function fmtInt(v) {
  const n = num(v);
  if (n == null) return "—";
  return Math.round(n).toLocaleString();
}

export function fmtPct(v, digits = 1) {
  const n = num(v);
  if (n == null) return "—";
  return `${n.toFixed(digits)}%`;
}

/** For percentages that legitimately live below 0.1% — a fixed 1dp reads "0.0%". */
export function fmtPctSmall(v) {
  const n = num(v);
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs === 0) return "0%";
  if (abs >= 0.1) return `${n.toFixed(1)}%`;
  if (abs >= 0.01) return `${n.toFixed(3)}%`;
  return `${n.toFixed(4)}%`;
}

export function fmtPctSigned(v, digits = 1) {
  const n = num(v);
  if (n == null) return "—";
  if (n === 0) return "0.0%";
  return `${n > 0 ? "+" : MINUS}${Math.abs(n).toFixed(digits)}%`;
}

export function fmtScore(v) {
  const n = num(v);
  if (n == null) return "—";
  return n.toFixed(1);
}

export function fmtRatio(v) {
  const n = num(v);
  if (n == null) return "—";
  return n.toFixed(2);
}

export function fmtMins(v) {
  const n = num(v);
  if (n == null) return "—";
  if (n < 60) return `${Math.round(n)}m`;
  if (n < 60 * 24) return `${(n / 60).toFixed(1)}h`;
  return `${(n / (60 * 24)).toFixed(1)}d`;
}

/** Memecoin prices need significant digits, not a fixed decimal count. */
export function fmtPrice(v) {
  const n = num(v);
  if (n == null) return "—";
  const abs = Math.abs(n);
  if (abs === 0) return "$0";
  if (abs >= 1) return `$${n.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
  const leadingZeros = Math.max(0, Math.ceil(-Math.log10(abs)) - 1);
  return `$${n.toFixed(Math.min(18, leadingZeros + 4))}`;
}

export function shortAddr(addr) {
  if (!addr || addr.length < 12) return addr || "—";
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

export function parseWalletLines(raw) {
  if (raw == null || raw === "") return [];
  return String(raw)
    .split(" | ")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(" · ").map((p) => p.trim());
      const wallet = parts.find((p) => /^0x[a-fA-F0-9]{40}$/.test(p)) || null;
      const txPart = parts.find((p) => /^tx0x[a-fA-F0-9]+$/i.test(p));
      const tx = txPart ? txPart.replace(/^tx/i, "") : null;
      const rest = parts.filter((p) => p !== wallet && p !== txPart);
      return { wallet, tx, detail: rest.join(" · ") || line };
    });
}

/**
 * Direction tone. Teal / coral mean inflow / outflow everywhere on the page and
 * nothing else — they are never used for "good" or "bad".
 */
export function netTone(v) {
  const n = num(v);
  if (n == null || n === 0) return "flat";
  return n > 0 ? "pos" : "neg";
}

export function toneColor(tone) {
  if (tone === "pos") return "var(--read-teal-text)";
  if (tone === "neg") return "var(--read-coral-text)";
  if (tone === "caution") return "var(--read-amber-text)";
  if (tone === "muted") return "var(--text-muted)";
  if (tone === "faint") return "var(--text-faint)";
  return "var(--text)";
}

/** Whale − retail divergence in bps of market cap. */
export function divergenceBps(whaleNet, retailNet, marketCap) {
  const mcap = num(marketCap);
  const w = num(whaleNet);
  const r = num(retailNet);
  if (mcap == null || mcap <= 0 || w == null || r == null) return null;
  return ((w - r) / mcap) * 10000;
}

// ── Bands ────────────────────────────────────────────────────────────────
// Each band names the metric and threshold it came from so the caption can
// state it out loud. No band is a composite of several metrics.

/** A perfectly flat day puts 1/24 ≈ 4.2% of its volume in any given hour. */
export const FLAT_HOUR_SHARE = 100 / 24;

export function heatBand(heatPct1h) {
  const n = num(heatPct1h);
  if (n == null) return { label: "no data", tone: "faint" };
  if (n >= FLAT_HOUR_SHARE * 3) return { label: "hot", tone: "pos" };
  if (n >= FLAT_HOUR_SHARE) return { label: "active", tone: "pos" };
  if (n > 0) return { label: "quiet", tone: "faint" };
  return { label: "flat", tone: "faint" };
}

/**
 * Round-trip share of volume. Deliberately never called "wash" anywhere in the
 * product: this is a trade-shape heuristic, and market making produces the same
 * shape as anything less benign.
 */
export function roundTripBand(roundTripPct24h) {
  const n = num(roundTripPct24h);
  if (n == null) return { label: "no data", tone: "faint" };
  if (n >= 20) return { label: "high", tone: "caution" };
  if (n >= 5) return { label: "elevated", tone: "caution" };
  return { label: "low", tone: "faint" };
}

export function holdBand(survive1dPct) {
  const n = num(survive1dPct);
  if (n == null) return { label: "no data", tone: "faint" };
  if (n >= 66) return { label: "sticky", tone: "pos" };
  if (n >= 33) return { label: "mixed", tone: "faint" };
  return { label: "thin", tone: "caution" };
}

/**
 * Dune hands timestamps back as strings shaped like
 * "2026-08-01 07:00:00.000 UTC" — a trailing zone name that Date() rejects.
 */
function parseDuneTs(v) {
  if (v == null || v === "") return null;
  let s = String(v).trim();
  if (!/^\d{4}-\d{2}-\d{2}/.test(s)) return null;
  s = s.replace(/\s+UTC$/i, "").trim().replace(" ", "T");
  if (!/([Zz]|[+-]\d{2}:?\d{2})$/.test(s)) s += "Z";
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Browser/OS short zone label, e.g. "EDT". */
export function localTimeZoneAbbr(at = new Date()) {
  try {
    const part = new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
      .formatToParts(at instanceof Date ? at : new Date(at))
      .find((p) => p.type === "timeZoneName");
    return part?.value || "";
  } catch {
    return "";
  }
}

/**
 * Compact local-time hour label from a Dune UTC timestamp, e.g. "Aug 1, 3:00 AM EDT".
 * Data stays UTC under the hood; display follows the viewer's timezone.
 */
export function fmtLocalHour(v) {
  if (v == null || v === "") return "—";
  const d = parseDuneTs(v);
  if (!d) return String(v);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** @deprecated use fmtLocalHour */
export function fmtUtcHour(v) {
  return fmtLocalHour(v);
}

/** The two-digit UTC hour of a Dune timestamp, for lining up with the tape bars. */
export function utcHourKey(v) {
  if (v == null || v === "") return null;
  const d = parseDuneTs(v);
  if (d) return d.toISOString().slice(11, 13);
  const m = String(v).match(/\b(\d{2}):\d{2}/);
  return m ? m[1] : null;
}

/**
 * Tape bars are keyed by UTC hour ("00"…"23"). Show that slot in the viewer's
 * local clock. Uses "today" for the DST offset — close enough for a 24h tape.
 */
export function formatTapeHourLocal(utcHour) {
  const h = parseInt(String(utcHour), 10);
  if (!Number.isFinite(h) || h < 0 || h > 23) return String(utcHour ?? "—");
  const d = new Date();
  d.setUTCHours(h, 0, 0, 0);
  return d.toLocaleTimeString(undefined, { hour: "numeric" });
}

/**
 * Hourly tape arrives as "HH:+1.2k · HH:-0.4k · …" straight from the query.
 * Parsing it back into numbers is what turns a string of digits into a chart.
 *
 * Trino renders small doubles in scientific notation, so a quiet token's tape
 * comes through as "05:+9.0E-1k" rather than "05:+0.9k". Both forms are
 * accepted: the query now formats these explicitly, but a cached pulse written
 * before that change still has to draw.
 */
export function parseHourlyTape(raw) {
  if (raw == null || raw === "") return [];
  return String(raw)
    .split("·")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const m = part.match(/^(\d{1,2})\s*:\s*([+-]?[\d.]+(?:[eE][+-]?\d+)?)\s*k$/);
      if (!m) return null;
      const usd = Number(m[2]) * 1000;
      return Number.isFinite(usd) ? { hour: m[1].padStart(2, "0"), usd } : null;
    })
    .filter(Boolean);
}

export function timeAgo(iso) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = mins / 60;
  if (hours < 24) return `${hours.toFixed(hours < 10 ? 1 : 0)}h ago`;
  return `${(hours / 24).toFixed(1)}d ago`;
}

/** Absolute local clock for the pulse — pairs with timeAgo in the hero. */
export function formatPulseClock(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  // Component fields only — dateStyle/timeStyle + timeZoneName throws in browsers.
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** Freshness of the last Dune pulse — drives the live dot, not a claim of realtime. */
export function freshness(iso) {
  if (!iso) return { label: "no pulse", tone: "faint" };
  const mins = (Date.now() - new Date(iso).getTime()) / 60000;
  if (Number.isNaN(mins)) return { label: "no pulse", tone: "faint" };
  if (mins <= 15) return { label: "live", tone: "pos" };
  if (mins <= 60) return { label: "recent", tone: "faint" };
  return { label: "stale", tone: "caution" };
}
