"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/**
 * Mobile bottom sheet for column definitions (MT-5).
 * Desktop should keep hover tooltips and not open this.
 */
export default function DefSheet({ open, title, body, windowLabel, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title || "Definition"}
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10050,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: "560px",
          maxHeight: "70vh",
          overflowY: "auto",
          background: "var(--bg)",
          borderTopLeftRadius: "14px",
          borderTopRightRadius: "14px",
          border: "1px solid var(--border-strong)",
          borderBottom: "none",
          padding: "16px 18px 28px",
          boxShadow: "0 -8px 32px rgba(0,0,0,0.25)",
        }}
      >
        <div
          style={{
            width: "36px",
            height: "4px",
            borderRadius: "999px",
            background: "var(--border-strong)",
            margin: "0 auto 14px",
          }}
        />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--text)" }}>
              {title || "Definition"}
            </div>
            {windowLabel ? (
              <div style={{ fontSize: "12px", color: "var(--text-faint)", marginTop: "2px" }}>
                Window · {windowLabel}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              border: "1px solid var(--border)",
              background: "var(--bg-subtle)",
              color: "var(--text-muted)",
              borderRadius: "8px",
              padding: "6px 10px",
              fontSize: "13px",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            Close
          </button>
        </div>
        <p style={{ margin: "14px 0 0", fontSize: "14px", lineHeight: 1.55, color: "var(--text-muted)" }}>
          {body}
        </p>
        <p style={{ margin: "12px 0 0", fontSize: "11px", color: "var(--text-faint)" }}>
          Tip: tap a header to sort · long-press or ⓘ for this definition
        </p>
      </div>
    </div>,
    document.body
  );
}
