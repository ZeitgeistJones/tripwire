"use client";

/**
 * Tripwire look system — named skins, not a binary dark/light flip.
 *
 * Legacy keys `dark` / `light` map to Wire / Paper so existing localStorage
 * keeps working. New looks are identity-forward but still semantic
 * (teal = in, coral = out, amber = caution).
 */

export const THEME_STORAGE_KEY = "zdash-theme";

export const THEMES = [
  {
    id: "minimal",
    label: "Minimal",
    blurb: "Quiet graphite. Almost nothing.",
    swatch: "#0c0d0f",
    accent: "#8a9099",
    bg: "#0c0d0f",
  },
  {
    id: "wire",
    label: "Wire",
    blurb: "Charcoal + CLAWD green.",
    swatch: "#16181c",
    accent: "#7ab84a",
    bg: "#16181c",
  },
  {
    id: "volt",
    label: "Volt",
    blurb: "Near-black, acid signal.",
    swatch: "#070a06",
    accent: "#b8f000",
    bg: "#070a06",
  },
  {
    id: "tide",
    label: "Tide",
    blurb: "Deep sea, cyan edge.",
    swatch: "#0a1218",
    accent: "#3ec7c0",
    bg: "#0a1218",
  },
  {
    id: "ember",
    label: "Ember",
    blurb: "Warm night, copper tip.",
    swatch: "#14110f",
    accent: "#e08a4a",
    bg: "#14110f",
  },
  {
    id: "ink",
    label: "Ink",
    blurb: "Blue-black terminal.",
    swatch: "#0b0e16",
    accent: "#6ea8ff",
    bg: "#0b0e16",
  },
  {
    id: "paper",
    label: "Paper",
    blurb: "Daylight field notes.",
    swatch: "#f8f7f4",
    accent: "#3B6D11",
    bg: "#f8f7f4",
  },
  {
    id: "bone",
    label: "Bone",
    blurb: "Cool light, steel type.",
    swatch: "#eef1f4",
    accent: "#1a5f7a",
    bg: "#eef1f4",
  },
];

const THEME_IDS = new Set(THEMES.map((t) => t.id));

/** Map legacy storage values → current ids. */
export function normalizeThemeId(raw) {
  if (raw === "dark") return "wire";
  if (raw === "light") return "paper";
  if (THEME_IDS.has(raw)) return raw;
  return "wire";
}

export function themeBg(id) {
  const t = THEMES.find((x) => x.id === id);
  return t?.bg || "#16181c";
}

export function applyTheme(rawId) {
  const id = normalizeThemeId(rawId);
  document.documentElement.setAttribute("data-theme", id);
  document.documentElement.style.background = themeBg(id);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  return id;
}
