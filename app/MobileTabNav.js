"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

/** Public primary chrome — live pulse first. Snapshot tables live under More. */
export const MOBILE_PRIMARY_TABS = ["ClawdWire", "About"];
export const SNAPSHOT_TABS = [
  "Overview",
  "Flow",
  "Whales & Risk",
  "Watchlist",
  "CLAWD",
  "The Wire",
];
export const MOBILE_MORE_TABS = [...SNAPSHOT_TABS];

const chipBase = {
  padding: "8px 16px",
  borderRadius: "6px",
  textDecoration: "none",
  fontSize: "14px",
  cursor: "pointer",
  fontFamily: "inherit",
  whiteSpace: "nowrap",
};

function chipStyle(active) {
  return {
    ...chipBase,
    border: active ? "1px solid var(--btn-active-bg)" : "1px solid var(--btn-inactive-border)",
    background: active ? "var(--btn-active-bg)" : "var(--btn-inactive-bg)",
    color: active ? "var(--btn-active-text)" : "var(--btn-inactive-text)",
    fontWeight: active ? 600 : 400,
  };
}

function itemKey(item) {
  return typeof item === "string" ? item : item.key;
}
function itemLabel(item) {
  return typeof item === "string" ? item : item.label;
}

/**
 * More menu portals to document.body so it is not clipped by overflow-x tab strips.
 */
export function MoreMenu({ items, activeKey, onSelect, renderItem, chipLabel = "More" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState(null);
  const btnRef = useRef(null);
  const menuRef = useRef(null);
  const moreActive = items.some((item) => itemKey(item) === activeKey);
  const activeItem = items.find((item) => itemKey(item) === activeKey);
  const chipText = moreActive && activeItem ? itemLabel(activeItem) : chipLabel;

  useLayoutEffect(() => {
    if (!open || !btnRef.current) {
      setPos(null);
      return;
    }
    const place = () => {
      const r = btnRef.current.getBoundingClientRect();
      setPos({
        top: Math.round(r.bottom + 4),
        right: Math.round(Math.max(8, window.innerWidth - r.right)),
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (btnRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const menu =
    open &&
    pos &&
    typeof document !== "undefined" &&
    createPortal(
      <div
        ref={menuRef}
        role="menu"
        style={{
          position: "fixed",
          top: pos.top,
          right: pos.right,
          minWidth: "180px",
          maxHeight: "min(70vh, 420px)",
          overflowY: "auto",
          background: "var(--bg)",
          border: "1px solid var(--border-strong)",
          borderRadius: "8px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
          zIndex: 10000,
          padding: "6px",
          display: "flex",
          flexDirection: "column",
          gap: "2px",
        }}
      >
        {items.map((item) => {
          const key = itemKey(item);
          const label = itemLabel(item);
          const active = key === activeKey;
          if (renderItem) {
            return (
              <div key={key} onClick={() => setOpen(false)}>
                {renderItem({ key, label, active, close: () => setOpen(false) })}
              </div>
            );
          }
          return (
            <button
              key={key}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect?.(key);
              }}
              style={{
                ...chipBase,
                width: "100%",
                textAlign: "left",
                border: "none",
                background: active ? "var(--btn-active-bg)" : "transparent",
                color: active ? "var(--btn-active-text)" : "var(--text)",
                fontWeight: active ? 600 : 400,
                borderRadius: "6px",
              }}
            >
              {label}
            </button>
          );
        })}
      </div>,
      document.body
    );

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      <button
        ref={btnRef}
        type="button"
        style={chipStyle(moreActive || open)}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        title={moreActive ? `More · ${chipText}` : "More tabs"}
      >
        {chipText} ▾
      </button>
      {menu}
    </div>
  );
}

/** Dashboard: button tabs. Desktop strip is rendered by parent; this is mobile-only chrome. */
export function DashboardMobileNav({ activeTab, onTabChange, tabLabel }) {
  const labelOf = (tab) => (tabLabel ? tabLabel(tab) : tab);
  return (
    <div className="tw-tab-strip tw-nav-mobile" style={{ display: "none", gap: "8px", marginBottom: "6px", alignItems: "center" }}>
      <Link href="/" style={chipStyle(false)}>Movers</Link>
      {MOBILE_PRIMARY_TABS.map((tab) => (
        <button
          key={tab}
          type="button"
          onClick={() => onTabChange(tab)}
          style={chipStyle(activeTab === tab)}
        >
          {labelOf(tab)}
        </button>
      ))}
      <MoreMenu
        chipLabel="Snapshot"
        items={MOBILE_MORE_TABS.map((t) => ({ key: t, label: labelOf(t) }))}
        activeKey={activeTab}
        onSelect={(key) => onTabChange(key)}
      />
    </div>
  );
}

/** Link-based mobile nav (Movers page) with ?tab= deep links */
export function LinkMobileNav({ currentPage }) {
  const dashHref = (tab) => `/dashboard?tab=${encodeURIComponent(tab)}`;
  const moreItems = [
    ...MOBILE_MORE_TABS.map((t) => ({ key: t, label: t === "Whales & Risk" ? "Whales" : t })),
    { key: "Movers", label: "Movers" },
  ];
  return (
    <div className="tw-tab-strip tw-nav-mobile" style={{ display: "none", gap: "8px", marginBottom: "16px", alignItems: "center" }}>
      <Link href={dashHref("ClawdWire")} style={chipStyle(false)}>
        ClawdWire
      </Link>
      <Link href={dashHref("About")} style={chipStyle(false)}>
        About
      </Link>
      {currentPage === "movers" ? (
        <span style={chipStyle(true)}>Movers</span>
      ) : null}
      <MoreMenu
        chipLabel="Snapshot"
        items={moreItems}
        activeKey={currentPage === "movers" ? "Movers" : null}
        renderItem={({ key, label, active, close }) => (
          <Link
            href={key === "Movers" ? "/movers" : dashHref(key)}
            onClick={close}
            style={{
              ...chipBase,
              display: "block",
              border: "none",
              background: active ? "var(--btn-active-bg)" : "transparent",
              color: active ? "var(--btn-active-text)" : "var(--text)",
              fontWeight: active ? 600 : 400,
              borderRadius: "6px",
            }}
          >
            {label}
          </Link>
        )}
      />
    </div>
  );
}
