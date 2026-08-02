"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { listPulseTokens } from "@/lib/clawdWire";
import { timeAgo } from "@/lib/clawdWireFormat";

/**
 * Coin selector, hung off the ticker in the hero — the page's identity is the
 * token, so changing it belongs on the name rather than buried in a toolbar.
 *
 * Selecting never triggers a run. It only ever changes which cached pulse is
 * read, so a visitor can click through all 173 coins without costing anything.
 * Coins that already have a pulse are marked, because those are the ones that
 * will actually show numbers — and it doubles as the "what's fresh right now"
 * signal.
 */
export default function ClawdWireTokenPicker({ value, symbol, onChange }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [fresh, setFresh] = useState({});
  const [cursor, setCursor] = useState(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const tokens = useMemo(() => listPulseTokens(), []);

  // Which coins already have a cached pulse. Cheap, public, and only fetched
  // when the list is actually opened.
  useEffect(() => {
    if (!open) return undefined;
    let alive = true;
    fetch("/api/clawdwire/recent?limit=50")
      .then((r) => r.json())
      .then((j) => {
        if (!alive) return;
        const map = {};
        for (const e of j?.recent || []) {
          if (e?.address) map[String(e.address).toLowerCase()] = e.lastRunAt || null;
        }
        setFresh(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    setQuery("");
    setCursor(0);
    const t = setTimeout(() => inputRef.current?.focus(), 0);
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withFresh = tokens.map((t) => ({ ...t, lastRunAt: fresh[t.address] ?? null }));
    const matched = q
      ? withFresh.filter(
          (t) =>
            t.symbol?.toLowerCase().includes(q) ||
            t.name?.toLowerCase().includes(q) ||
            t.address.includes(q)
        )
      : withFresh;
    // Coins with a pulse first — those are the ones that show numbers now.
    return matched
      .slice()
      .sort((a, b) => {
        if (!!a.lastRunAt !== !!b.lastRunAt) return a.lastRunAt ? -1 : 1;
        if (a.lastRunAt && b.lastRunAt) {
          return new Date(b.lastRunAt) - new Date(a.lastRunAt);
        }
        return (a.symbol || "").localeCompare(b.symbol || "");
      })
      .slice(0, 120);
  }, [tokens, query, fresh]);

  function pick(t) {
    setOpen(false);
    if (t.address !== value) onChange?.(t);
  }

  function onListKey(e) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter" && filtered[cursor]) {
      e.preventDefault();
      pick(filtered[cursor]);
    }
  }

  return (
    <span className="cw-tokenpick" ref={rootRef}>
      <button
        type="button"
        className="cw-tokenpick-btn"
        aria-expanded={open}
        aria-haspopup="listbox"
        title="Change token"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cw-ticker">{symbol}</span>
        <span className="cw-tokenpick-caret" aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className="cw-tokenpick-pop" role="dialog" aria-label="Choose a token">
          <input
            ref={inputRef}
            className="cw-tokenpick-search"
            placeholder="Search ticker, name or address…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onListKey}
          />
          <div className="cw-tokenpick-note">
            Switching is free — it reads a cached pulse and never starts a run.
          </div>
          <div className="cw-tokenpick-list" role="listbox">
            {filtered.length === 0 ? (
              <div className="cw-tokenpick-empty">No tracked token matches that.</div>
            ) : (
              filtered.map((t, i) => (
                <button
                  key={t.address}
                  type="button"
                  role="option"
                  className="cw-tokenpick-item"
                  aria-selected={t.address === value}
                  aria-current={t.address === value ? "true" : undefined}
                  data-active={i === cursor ? "true" : undefined}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => pick(t)}
                >
                  <span className="cw-tokenpick-sym">{t.symbol}</span>
                  <span className="cw-tokenpick-name">{t.name}</span>
                  {t.lastRunAt ? (
                    <span className="cw-tokenpick-fresh">● {timeAgo(t.lastRunAt)}</span>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </div>
      ) : null}
    </span>
  );
}
