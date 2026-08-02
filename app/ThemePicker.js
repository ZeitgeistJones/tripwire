"use client";

import { useEffect, useId, useRef, useState } from "react";
import { THEMES, applyTheme, normalizeThemeId } from "./themeCatalog";

/**
 * Compact look picker for the top header — swatches + names.
 * Lives out of the tab strip so nav stays full-width and centered.
 */
export default function ThemePicker({ compact = false }) {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("wire");
  const rootRef = useRef(null);
  const listId = useId();

  useEffect(() => {
    const current = normalizeThemeId(document.documentElement.getAttribute("data-theme"));
    setTheme(current);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const active = THEMES.find((t) => t.id === theme) || THEMES[1];

  function pick(id) {
    setTheme(applyTheme(id));
    setOpen(false);
  }

  return (
    <div ref={rootRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        title={`Look · ${active.label}`}
        onClick={() => setOpen((v) => !v)}
        style={{
          appearance: "none",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: compact ? "6px" : "8px",
          padding: compact ? "4px 8px" : "5px 10px",
          borderRadius: "8px",
          border: "1px solid var(--border-strong)",
          background: "var(--bg-muted)",
          color: "var(--text)",
          fontFamily: "inherit",
          fontSize: compact ? "11px" : "12px",
          fontWeight: 600,
          minHeight: compact ? 28 : 32,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${active.swatch} 45%, ${active.accent} 45%)`,
            border: "1px solid var(--border-strong)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
            flexShrink: 0,
          }}
        />
        <span>{active.label}</span>
        <span aria-hidden="true" style={{ color: "var(--text-faint)", fontSize: "10px" }}>
          {open ? "▴" : "▾"}
        </span>
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Color look"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            zIndex: 80,
            width: "min(280px, 86vw)",
            padding: "6px",
            borderRadius: "10px",
            border: "1px solid var(--border-strong)",
            background: "var(--bg)",
            boxShadow: "0 16px 40px rgba(0,0,0,0.35)",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "4px",
          }}
        >
          {THEMES.map((t) => {
            const selected = t.id === theme;
            return (
              <button
                key={t.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => pick(t.id)}
                style={{
                  appearance: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  borderRadius: "8px",
                  border: selected ? "1px solid var(--clawd-row-border)" : "1px solid transparent",
                  background: selected ? "var(--clawd-row-bg)" : "transparent",
                  padding: "8px 9px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  fontFamily: "inherit",
                  color: "var(--text)",
                }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span
                    aria-hidden="true"
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: "6px",
                      background: `linear-gradient(135deg, ${t.swatch} 48%, ${t.accent} 48%)`,
                      border: "1px solid var(--border)",
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>{t.label}</span>
                </span>
                <span style={{ fontSize: "10px", color: "var(--text-faint)", lineHeight: 1.35, paddingLeft: "26px" }}>
                  {t.blurb}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
