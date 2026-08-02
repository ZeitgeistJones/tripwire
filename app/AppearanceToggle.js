"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "zdash-theme";

function applyTheme(next) {
  const theme = next === "light" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.background = theme === "light" ? "#f8f7f4" : "#16181c";
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
  return theme;
}

/**
 * Light / Dark appearance control. Persists to localStorage; boot script in
 * layout.js applies the choice before paint to avoid a flash.
 */
export default function AppearanceToggle({ compact = false }) {
  const [theme, setTheme] = useState("dark");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme");
    if (current === "light" || current === "dark") setTheme(current);
  }, []);

  const set = (next) => setTheme(applyTheme(next));

  const btn = (value, label) => {
    const active = theme === value;
    return (
      <button
        key={value}
        type="button"
        aria-pressed={active}
        onClick={() => set(value)}
        style={{
          appearance: "none",
          border: "none",
          cursor: "pointer",
          padding: compact ? "5px 9px" : "6px 11px",
          fontSize: compact ? "11px" : "12px",
          fontWeight: active ? 700 : 500,
          fontFamily: "inherit",
          background: active ? "var(--btn-active-bg)" : "transparent",
          color: active ? "var(--btn-active-text)" : "var(--text-muted)",
          minHeight: compact ? 28 : 32,
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <span
      role="group"
      aria-label="Appearance"
      style={{
        display: "inline-flex",
        border: "1px solid var(--border-strong)",
        borderRadius: "7px",
        overflow: "hidden",
        background: "var(--bg-muted)",
        flexShrink: 0,
      }}
    >
      {btn("dark", "Dark")}
      {btn("light", "Light")}
    </span>
  );
}
