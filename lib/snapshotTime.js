/** Shared snapshot timestamp for admin copies / share cards. */

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
    return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
  }
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
}

/** One-line "As of …" for paste texts. */
export function snapshotAsOfLine(scoresLastUpdated, fallback = "As of: timing unknown — use Tripwire scores banner") {
  const label = formatSnapshotTime(scoresLastUpdated, { style: "long" });
  return label ? `As of ${label} (Tripwire / Dune query snapshot)` : fallback;
}
