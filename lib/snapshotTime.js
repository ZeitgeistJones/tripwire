/** Shared snapshot timestamp for admin copies / share cards. */

/**
 * Local wall-clock with zone abbr. Must NOT mix dateStyle/timeStyle with
 * timeZoneName — that throws "Invalid option" in the browser and whitescreens.
 */
export function formatLocalDateTime(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/**
 * Format the Dune query / dashboard snapshot time for humans.
 * @param {string|Date|null|undefined} scoresLastUpdated
 * @param {{ style?: "short"|"long"|"iso"|"date" }} opts
 */
export function formatSnapshotTime(scoresLastUpdated, opts = {}) {
  if (!scoresLastUpdated) return null;
  const d = new Date(scoresLastUpdated);
  if (Number.isNaN(d.getTime())) return null;
  const style = opts.style || "long";
  if (style === "iso") return d.toISOString();
  if (style === "date") {
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }
  if (style === "short") {
    return formatLocalDateTime(d);
  }
  return formatLocalDateTime(d);
}

/** One-line "As of …" for paste texts. */
export function snapshotAsOfLine(scoresLastUpdated, fallback = "As of: timing unknown — use Tripwire scores banner") {
  const label = formatSnapshotTime(scoresLastUpdated, { style: "long" });
  return label ? `As of ${label} (Tripwire / Dune query snapshot)` : fallback;
}
