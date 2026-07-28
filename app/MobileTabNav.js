"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export const MOBILE_PRIMARY_TABS = ["Overview", "Whales & Risk", "Watchlist", "Activity"];
export const MOBILE_MORE_TABS = ["Buyers", "Wallets", "Growth", "Discover", "CLAWD", "The Wire", "About"];

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

function MoreMenu({ items, activeKey, onSelect, renderItem }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const moreActive = items.some((item) => (typeof item === "string" ? item : item.key) === activeKey);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  return (
    <div ref={wrapRef} style={{ position: "relative", flexShrink: 0 }}>
      <button
        type="button"
        style={chipStyle(moreActive || open)}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        More{moreActive ? " ·" : ""} ▾
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            right: 0,
            minWidth: "180px",
            background: "var(--bg)",
            border: "1px solid var(--border-strong)",
            borderRadius: "8px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
            zIndex: 50,
            padding: "6px",
            display: "flex",
            flexDirection: "column",
            gap: "2px",
          }}
        >
          {items.map((item) => {
            const key = typeof item === "string" ? item : item.key;
            const label = typeof item === "string" ? item : item.label;
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
        </div>
      )}
    </div>
  );
}

/** Dashboard: button tabs. Desktop strip is rendered by parent; this is mobile-only chrome. */
export function DashboardMobileNav({ activeTab, onTabChange, tabLabel }) {
  const labelOf = (tab) => (tabLabel ? tabLabel(tab) : tab);
  return (
    <div className="tw-tab-strip tw-nav-mobile" style={{ display: "none", gap: "8px", marginBottom: "6px" }}>
      <Link href="/" style={chipStyle(false)}>Movers</Link>
      <Link href="/forecast" style={chipStyle(false)}>Forecast</Link>
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
        items={MOBILE_MORE_TABS.map((t) => ({ key: t, label: labelOf(t) }))}
        activeKey={activeTab}
        onSelect={onTabChange}
      />
    </div>
  );
}

/** Movers / Forecast: link-based mobile nav with ?tab= deep links */
export function LinkMobileNav({ currentPage }) {
  const dashHref = (tab) => `/dashboard?tab=${encodeURIComponent(tab)}`;
  return (
    <div className="tw-tab-strip tw-nav-mobile" style={{ display: "none", gap: "8px", marginBottom: "16px" }}>
      {currentPage === "movers" ? (
        <span style={chipStyle(true)}>Movers</span>
      ) : (
        <Link href="/" style={chipStyle(false)}>Movers</Link>
      )}
      {currentPage === "forecast" ? (
        <span style={chipStyle(true)}>Forecast</span>
      ) : (
        <Link href="/forecast" style={chipStyle(false)}>Forecast</Link>
      )}
      {MOBILE_PRIMARY_TABS.map((tab) => (
        <Link key={tab} href={dashHref(tab)} style={chipStyle(false)}>
          {tab === "Whales & Risk" ? "Whales" : tab}
        </Link>
      ))}
      <MoreMenu
        items={MOBILE_MORE_TABS}
        activeKey={null}
        renderItem={({ key, label, close }) => (
          <Link
            href={dashHref(key)}
            onClick={close}
            style={{
              ...chipBase,
              display: "block",
              border: "none",
              background: "transparent",
              color: "var(--text)",
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

/** Desktop full strip wrapper class helper — pair with tw-nav-desktop in CSS */
export function desktopNavClass() {
  return "tw-tab-strip tw-nav-desktop";
}
