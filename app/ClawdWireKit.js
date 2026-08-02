"use client";
import { useEffect, useId, useRef, useState } from "react";
import {
  fmtPct,
  fmtUsdSigned,
  formatTapeHourLocal,
  localTimeZoneAbbr,
  num,
  parseWalletLines,
  shortAddr,
  toneColor,
} from "@/lib/clawdWireFormat";

/**
 * Presentational kit for ClawdWire.
 *
 * Colour discipline (enforced by convention, not by code):
 *   teal   = inflow / positive direction
 *   coral  = outflow / negative direction
 *   amber  = heuristic or unconfirmed — used only by SuspectBadge and the
 *            integrity layer, so it keeps its warning value
 *   green  = CLAWD identity + the primary action, nothing else
 * Everything else is greyscale. Motion only ever marks a value that changed.
 *
 * Inherit site theme tokens — never force light cream onto dark skins.
 * Full-width shell matches the page chrome above it.
 *
 * Every class is `cw-` prefixed and the stylesheet is injected by the panel,
 * so nothing here can leak into Tripwire's other pages.
 */

export const CLAWDWIRE_CSS = `
.cw-root {
  width: 100%;
  max-width: none;
  margin: 0;
}
.cw-mono {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
.cw-display {
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
  letter-spacing: -0.035em;
  font-weight: 800;
  line-height: 0.95;
}
.cw-shell {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg);
  overflow: hidden;
}
.cw-pulse {
  padding: 20px 22px 18px;
  background: var(--bg-subtle);
  border-bottom: 1px solid var(--border);
}
.cw-hero-top {
  display: flex; flex-wrap: wrap; align-items: baseline;
  gap: 6px 14px; margin-bottom: 18px;
}
.cw-net {
  display: grid;
  gap: 14px 20px;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
  align-items: stretch;
}
.cw-ticker {
  font-size: 28px; font-weight: 800; letter-spacing: -0.03em;
  color: var(--text); line-height: 1;
}
.cw-story {
  display: grid; gap: 10px;
  grid-template-columns: 1fr;
  height: 100%;
}
.cw-story-cell {
  border: 1px solid var(--border); border-radius: 10px;
  background: var(--bg); padding: 12px 14px 11px; min-width: 0;
  display: flex; flex-direction: column; justify-content: center;
}
.cw-story-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--text-faint);
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-bottom: 6px;
}
.cw-story-value {
  font-size: clamp(22px, 2.8vw, 30px); font-weight: 800;
  letter-spacing: -0.03em; line-height: 1.05;
}
.cw-story-note { font-size: 11px; color: var(--text-muted); margin-top: 6px; line-height: 1.35; }
.cw-chip-band {
  font-size: 10px; font-weight: 700; letter-spacing: 0.07em;
  text-transform: uppercase; white-space: nowrap;
  display: inline-flex; align-items: center; gap: 5px;
}
.cw-tokenpick { position: relative; display: inline-flex; }
.cw-tokenpick-btn {
  appearance: none; background: transparent; border: none; padding: 0;
  cursor: pointer; color: inherit; font: inherit;
  display: inline-flex; align-items: baseline; gap: 7px;
}
.cw-tokenpick-btn:hover .cw-ticker,
.cw-tokenpick-btn[aria-expanded="true"] .cw-ticker { color: var(--clawd-row-border); }
.cw-tokenpick-caret {
  font-size: 12px; color: var(--text-faint); transition: transform 160ms ease;
}
.cw-tokenpick-btn[aria-expanded="true"] .cw-tokenpick-caret { transform: rotate(180deg); }
.cw-tokenpick-pop {
  position: absolute; top: calc(100% + 8px); left: 0; z-index: 60;
  width: min(340px, 86vw);
  background: var(--bg); border: 1px solid var(--border-strong);
  border-radius: 10px; box-shadow: 0 14px 40px rgba(0,0,0,0.4);
  padding: 8px; display: flex; flex-direction: column; gap: 7px;
}
.cw-tokenpick-search {
  width: 100%; box-sizing: border-box;
  background: var(--bg-subtle); border: 1px solid var(--border);
  border-radius: 7px; padding: 8px 10px; font-size: 13px; color: var(--text);
  outline: none;
}
.cw-tokenpick-search:focus { border-color: var(--clawd-row-border); }
.cw-tokenpick-list {
  max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 1px;
}
.cw-tokenpick-item {
  appearance: none; background: transparent; border: none; cursor: pointer;
  width: 100%; text-align: left; padding: 7px 9px; border-radius: 6px;
  display: flex; align-items: baseline; gap: 9px; color: var(--text); font: inherit;
}
.cw-tokenpick-item:hover, .cw-tokenpick-item[data-active="true"] { background: var(--bg-muted); }
.cw-tokenpick-item[aria-current="true"] { box-shadow: inset 0 0 0 1px var(--clawd-row-border); }
.cw-tokenpick-sym {
  font-size: 13px; font-weight: 700; min-width: 74px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.cw-tokenpick-name {
  font-size: 11.5px; color: var(--text-faint); flex: 1 1 auto;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cw-tokenpick-fresh {
  font-size: 9px; font-weight: 700; letter-spacing: 0.07em; text-transform: uppercase;
  color: var(--read-teal-text); white-space: nowrap;
}
.cw-tokenpick-empty { padding: 10px; font-size: 12px; color: var(--text-faint); }
.cw-tokenpick-note {
  font-size: 10px; color: var(--text-xfaint); padding: 0 4px 2px; line-height: 1.45;
}
.cw-rail {
  position: sticky; top: 0; z-index: 40;
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px;
  background: var(--bg-muted);
  border-bottom: 1px solid var(--border);
  padding: 10px 16px;
  transition: box-shadow 160ms ease;
}
.cw-rail[data-stuck="true"] { box-shadow: 0 8px 24px rgba(0,0,0,0.28); }
.cw-rail-spacer { flex: 1 1 8px; }
.cw-chapters {
  display: flex; flex-wrap: wrap; gap: 6px;
  padding: 10px 16px;
  background: var(--bg);
  border-bottom: 1px solid var(--border);
  position: sticky; top: 52px; z-index: 35;
}
.cw-chapters button {
  appearance: none; cursor: pointer; border-radius: 999px;
  border: 1px solid var(--border); background: transparent;
  color: var(--text-muted); font: inherit; font-size: 12.5px; font-weight: 650;
  padding: 7px 14px; min-height: 34px;
  transition: background 120ms ease, color 120ms ease, border-color 120ms ease;
}
.cw-chapters button:hover { color: var(--text); border-color: var(--border-strong); background: var(--bg-muted); }
.cw-chapters button[aria-selected="true"] {
  background: var(--btn-active-bg);
  border-color: var(--btn-active-bg);
  color: var(--btn-active-text);
}
.cw-body { padding: 18px 18px 24px; width: 100%; box-sizing: border-box; }
.cw-chapter-head {
  font-size: 13px; font-weight: 800; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--text);
  margin: 0 0 6px;
}
.cw-chapter-sub {
  font-size: 12.5px; color: var(--text-muted); margin: 0 0 14px;
  line-height: 1.45; max-width: 720px;
}
.cw-wallet-grid {
  display: grid; gap: 12px 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 16px;
}
.cw-note { margin: 10px 0 0; font-size: 12px; color: var(--text-muted); line-height: 1.45; }
.cw-note[data-tone="pos"] { color: var(--read-teal-text); }
.cw-note[data-tone="neg"] { color: var(--read-coral-text); }
.cw-alert {
  margin: 0; padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  font-size: 12.5px; color: var(--text); line-height: 1.45;
}
.cw-alert[data-tone="caution"] {
  background: var(--read-amber-bg);
  color: var(--read-amber-text);
}
.cw-empty {
  margin: 0; padding: 36px 20px;
  text-align: center; color: var(--text-muted); font-size: 13px;
}
.cw-empty-title { font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
.cw-empty-body { max-width: 460px; margin: 0 auto; line-height: 1.55; }
.cw-empty-foot { margin-top: 10px; font-size: 11.5px; color: var(--text-xfaint); }
.cw-seg { display: inline-flex; border: 1px solid var(--border-strong); border-radius: 8px; overflow: hidden; }
.cw-seg button {
  appearance: none; border: none; background: transparent; cursor: pointer;
  padding: 6px 12px; font-size: 12px; font-weight: 700; color: var(--text-muted);
  min-height: 32px; letter-spacing: 0.01em;
}
.cw-seg button + button { border-left: 1px solid var(--border); }
.cw-seg button:hover { color: var(--text); background: var(--bg-subtle); }
.cw-seg button[aria-pressed="true"] {
  background: var(--btn-active-bg); color: var(--btn-active-text);
}
.cw-seg-sm button { padding: 5px 10px; font-size: 11px; min-height: 28px; }
.cw-flow-window {
  width: 100%;
  padding: 16px 18px 18px;
  border: 1px solid var(--border-strong);
  border-radius: 12px;
  background: var(--bg);
  box-sizing: border-box;
}
.cw-flow-window-head {
  display: flex; align-items: center; justify-content: space-between;
  gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
}
.cw-flow-window-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--text-faint);
}
.cw-flow-window-hint {
  margin-top: 3px; font-size: 11px; color: var(--text-muted); line-height: 1.35;
}
.cw-btn {
  appearance: none; cursor: pointer; border-radius: 8px;
  font-weight: 700; font-size: 12px; min-height: 32px; padding: 7px 14px;
  border: 1px solid var(--border-strong); background: transparent; color: var(--text-muted);
}
.cw-btn:hover:not(:disabled) { color: var(--text); border-color: var(--text-faint); }
.cw-btn-primary {
  border-color: var(--btn-active-bg); background: var(--btn-active-bg); color: var(--btn-active-text);
}
.cw-btn-primary:hover:not(:disabled) { filter: brightness(1.06); }
.cw-btn:disabled { cursor: not-allowed; opacity: 0.55; }
.cw-pressure { display: flex; height: 8px; border-radius: 999px; overflow: hidden; background: var(--bg-muted); }
.cw-pressure > i { display: block; height: 100%; transition: width 420ms ease; }
.cw-pressure-buy { background: var(--read-teal-text); }
.cw-pressure-sell { background: var(--read-coral-text); }
.cw-subhead {
  font-size: 11px; font-weight: 700; letter-spacing: 0.1em;
  text-transform: uppercase; color: var(--text-muted); margin-bottom: 10px;
}
.cw-secchev {
  font-size: 10px; color: var(--text-muted); transition: transform 200ms ease;
  display: inline-block; width: 12px; text-align: center;
}
.cw-disc-head[aria-expanded="false"] .cw-secchev { transform: rotate(-90deg); }
.cw-collapse { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 220ms ease; }
.cw-collapse[data-open="true"] { grid-template-rows: 1fr; }
.cw-collapse > .cw-collapse-inner {
  overflow: hidden; min-height: 0;
  visibility: hidden; transition: visibility 220ms ease;
}
.cw-collapse[data-open="true"] > .cw-collapse-inner { visibility: visible; }
.cw-disc { margin-top: 12px; }
.cw-disc-head {
  appearance: none;
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  width: 100%; text-align: left; color: inherit; font: inherit;
  padding: 10px 12px;
  border: 1px solid var(--border-strong);
  border-radius: 8px;
  background: var(--bg-muted);
  box-sizing: border-box;
}
.cw-disc-head:hover { border-color: var(--clawd-row-border); background: var(--bg-subtle); }
.cw-disc-head[aria-expanded="true"] {
  border-color: var(--clawd-row-border); background: var(--clawd-row-bg);
}
.cw-disc-title {
  font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text); white-space: nowrap;
}
.cw-disc-rule { flex: 1 1 20px; height: 1px; background: var(--border); opacity: 0.85; }
.cw-disc-count { font-size: 11px; color: var(--text-muted); white-space: nowrap; }
.cw-disc-head .cw-secchev { font-size: 10px; color: var(--text-muted); }
.cw-disc .cw-collapse[data-open="true"] { margin-top: 10px; }
.cw-matrix-wrap {
  overflow-x: auto; border: 1px solid var(--border);
  border-radius: 10px; background: var(--bg-subtle); width: 100%;
}
.cw-matrix { width: 100%; border-collapse: collapse; table-layout: fixed; min-width: 560px; }
.cw-matrix .cw-rowhead { width: 190px; }
.cw-matrix th, .cw-matrix td {
  padding: 8px 14px; text-align: right; white-space: nowrap;
  font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;
}
.cw-matrix thead th {
  font-size: 10px; font-weight: 700; letter-spacing: 0.09em; text-transform: uppercase;
  color: var(--text-faint); border-bottom: 1px solid var(--border); padding-top: 10px; padding-bottom: 10px;
}
.cw-matrix thead th[data-active="true"] { color: var(--text); }
.cw-matrix td { font-size: 12.5px; color: var(--text); }
.cw-matrix tbody tr + tr th, .cw-matrix tbody tr + tr td { border-top: 1px solid var(--border); }
.cw-rowhead {
  text-align: left !important; position: sticky; left: 0; z-index: 1;
  background: var(--bg-subtle); font-size: 12px; font-weight: 600;
  color: var(--text-muted); box-shadow: 1px 0 0 var(--border);
}
.cw-rowhead small { display: block; font-size: 10px; font-weight: 400; color: var(--text-xfaint); margin-top: 1px; }
.cw-matrix tbody tr:hover td, .cw-matrix tbody tr:hover .cw-rowhead { background: var(--bg-muted); }
.cw-matrix tr[data-emph="true"] td { font-size: 14px; font-weight: 700; }
.cw-matrix tr[data-emph="true"] .cw-rowhead { color: var(--text); font-weight: 700; }
.cw-matrix td[data-active="true"] { background: var(--bg-muted); }
.cw-matrix tbody tr:hover td[data-active="true"] { background: var(--bg); }
.cw-strip {
  display: grid; background: var(--bg-subtle);
  border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  width: 100%;
}
/* Sparse strips (≤3 cells): hug content instead of stretching across the row. */
.cw-strip[data-fit="true"] {
  width: fit-content;
  max-width: 100%;
  grid-template-columns: repeat(var(--cw-strip-n, 3), minmax(148px, auto));
}
.cw-strip > div {
  padding: 10px 12px; min-width: 0;
  box-shadow: inset -1px 0 0 var(--border), inset 0 -1px 0 var(--border);
}
.cw-strip-label {
  font-size: 9.5px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
  color: var(--text-faint); margin-bottom: 4px; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.cw-strip-value {
  font-size: 15px; font-weight: 700; letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;
  color: var(--text);
}
.cw-ladder { display: flex; flex-direction: column; gap: 7px; }
.cw-ladder-row { display: flex; align-items: center; gap: 12px; }
.cw-ladder-key {
  font-size: 11px; font-weight: 700; color: var(--text-faint);
  width: 34px; flex: 0 0 34px; letter-spacing: 0.05em; text-transform: uppercase;
}
.cw-ladder-track { flex: 1 1 auto; height: 14px; background: var(--bg-muted); border-radius: 3px; overflow: hidden; }
.cw-ladder-fill {
  display: block; height: 100%; background: var(--clawd-row-border);
  opacity: 0.75; transition: width 420ms ease;
}
.cw-ladder-val {
  font-size: 12.5px; font-weight: 700; width: 58px; flex: 0 0 58px; text-align: right;
  font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;
}
.cw-tape-wrap { overflow-x: auto; width: 100%; }
.cw-tape {
  display: flex; align-items: stretch; gap: 2px;
  min-width: 480px; height: 132px; position: relative;
}
.cw-tape-col {
  flex: 1 1 0; min-width: 0; display: flex; flex-direction: column;
  position: relative; cursor: default;
}
.cw-tape-col:hover { background: var(--bg-muted); }
.cw-tape-half { flex: 1 1 50%; display: flex; min-height: 0; }
.cw-tape-half-up { align-items: flex-end; }
.cw-tape-bar { width: 100%; border-radius: 2px; min-height: 2px; transition: height 420ms ease; }
.cw-tape-up { background: var(--read-teal-text); }
.cw-tape-down { background: var(--read-coral-text); }
.cw-tape-axis {
  position: absolute; left: 0; right: 0; top: 50%; height: 1px;
  background: var(--border-strong); pointer-events: none;
}
.cw-tape-col[data-mark="peak"] { background: var(--clawd-row-bg); box-shadow: inset 0 0 0 1px var(--clawd-row-border); }
.cw-tape-col[data-mark="worst"] { box-shadow: inset 0 0 0 1px var(--read-coral-text); }
.cw-tape-hours {
  display: flex; gap: 2px; min-width: 480px; margin-top: 5px;
  font-variant-numeric: tabular-nums; font-feature-settings: "tnum" 1;
}
.cw-tape-hours > span {
  flex: 1 1 0; min-width: 0; text-align: center;
  font-size: 9px; color: var(--text-xfaint);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.cw-tape-hours > span[data-mark="peak"] { color: var(--clawd-row-border); font-weight: 700; }
.cw-tape-hours > span[data-mark="worst"] { color: var(--read-coral-text); font-weight: 700; }
.cw-tape-legend {
  display: flex; flex-wrap: wrap; gap: 4px 14px; margin-top: 9px;
  font-size: 10px; color: var(--text-xfaint);
}
.cw-badge-suspect {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase;
  color: var(--read-amber-text); border: 1px solid var(--read-amber-text);
  background: var(--read-amber-bg); border-radius: 4px; padding: 2px 5px;
  white-space: nowrap; vertical-align: middle;
}
.cw-suspect-panel {
  border: 1px solid var(--border); border-left: 3px solid var(--read-amber-text);
  border-radius: 10px; background: var(--bg-subtle); padding: 13px 14px;
}
.cw-suspect-note {
  font-size: 11px; color: var(--read-amber-text); line-height: 1.5;
  margin: 0 0 11px; display: flex; align-items: flex-start; gap: 8px;
}
.cw-wallet {
  display: flex; flex-wrap: wrap; gap: 6px 14px; align-items: baseline;
  padding: 9px 12px; background: var(--bg-subtle);
  border: 1px solid var(--border); border-radius: 8px;
  font-variant-numeric: tabular-nums;
}
.cw-wallet:hover { border-color: var(--border-strong); }
.cw-wallet-rank { font-size: 10px; font-weight: 700; color: var(--text-xfaint); min-width: 16px; }
.cw-wallet a { text-decoration: none; }
.cw-wallet a:hover { text-decoration: underline; }
.cw-wallet-stack { display: flex; flex-direction: column; gap: 5px; }
.cw-dot { position: relative; display: inline-block; width: 7px; height: 7px; border-radius: 50%; flex: 0 0 7px; }
.cw-dot::after {
  content: ""; position: absolute; inset: 0; border-radius: 50%;
  background: inherit; animation: cwPing 2.2s cubic-bezier(0,0,0.2,1) infinite;
}
.cw-dot[data-ping="false"]::after { display: none; }
@keyframes cwPing { 0% { transform: scale(1); opacity: 0.7; } 70%, 100% { transform: scale(2.6); opacity: 0; } }
.cw-flash { border-radius: 3px; margin: 0 -3px; padding: 0 3px; }
.cw-flash[data-flash="pos"] { animation: cwFlashPos 900ms ease-out; }
.cw-flash[data-flash="neg"] { animation: cwFlashNeg 900ms ease-out; }
@keyframes cwFlashPos { from { background: var(--read-teal-bg); } to { background: transparent; } }
@keyframes cwFlashNeg { from { background: var(--read-coral-bg); } to { background: transparent; } }
@media (max-width: 900px) {
  .cw-net { grid-template-columns: 1fr; }
  .cw-story { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 767px) {
  .cw-pulse { padding: 16px 14px 14px; }
  .cw-rail { padding: 9px 12px; }
  .cw-chapters { top: 48px; padding: 10px 12px; }
  .cw-body { padding: 14px 12px 18px; }
  .cw-story { grid-template-columns: 1fr; }
  .cw-wallet-grid { grid-template-columns: 1fr; }
  .cw-matrix .cw-rowhead { width: 140px; }
  .cw-strip { grid-template-columns: repeat(auto-fit, minmax(108px, 1fr)); }
  .cw-strip[data-fit="true"] {
    grid-template-columns: repeat(var(--cw-strip-n, 3), minmax(108px, auto));
  }
  .cw-rail-spacer { display: none; }
}
@media (prefers-reduced-motion: reduce) {
  .cw-collapse, .cw-collapse > .cw-collapse-inner, .cw-pressure > i,
  .cw-ladder-fill, .cw-secchev, .cw-rail { transition: none; }
  .cw-dot::after, .cw-flash[data-flash] { animation: none; }
}
`;


/* ── Chapter navigation ─────────────────────────────────────────────────── */

export function ChapterNav({ chapters, value, onChange }) {
  return (
    <nav className="cw-chapters" role="tablist" aria-label="Pulse chapters">
      {chapters.map((ch) => (
        <button
          key={ch.key}
          type="button"
          role="tab"
          aria-selected={value === ch.key}
          onClick={() => onChange(ch.key)}
        >
          {ch.label}
        </button>
      ))}
    </nav>
  );
}

/* ── Live dot ───────────────────────────────────────────────────────────── */

export function LiveDot({ tone = "faint", ping = false }) {
  return (
    <span
      className="cw-dot"
      data-ping={ping ? "true" : "false"}
      style={{ background: toneColor(tone) }}
      aria-hidden="true"
    />
  );
}

/* ── Value flash ────────────────────────────────────────────────────────── */

/**
 * Tints only the digits that changed, and only in the direction they moved.
 * Whole-card animation would be noise; this is the live signal.
 */
export function FlashNum({ raw, children, className = "", style }) {
  const [flash, setFlash] = useState(null);
  const prev = useRef(raw);
  const seeded = useRef(false);

  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      prev.current = raw;
      return undefined;
    }
    if (prev.current === raw) return undefined;
    const before = num(prev.current);
    const after = num(raw);
    prev.current = raw;
    if (before == null || after == null || before === after) return undefined;
    setFlash(after > before ? "pos" : "neg");
    const t = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(t);
  }, [raw]);

  return (
    <span
      key={flash || "idle"}
      className={`cw-flash ${className}`.trim()}
      data-flash={flash || undefined}
      style={style}
    >
      {children}
    </span>
  );
}

/* ── Suspect badge ──────────────────────────────────────────────────────── */

export function SuspectBadge({ title = "Heuristic — inferred from trade shape, not confirmed on-chain intent" }) {
  return (
    <span className="cw-badge-suspect" title={title}>
      <span aria-hidden="true">◺</span> suspected
    </span>
  );
}

/* ── Section ────────────────────────────────────────────────────────────── */

export function Section({
  index,
  title,
  subtitle,
  headline,
  collapsible = false,
  defaultOpen = true,
  children,
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  const expanded = collapsible ? open : true;

  const head = (
    <>
      {index ? <span className="cw-secidx cw-mono">{index}</span> : null}
      <span className="cw-sectitle">{title}</span>
      <span className="cw-secrule" />
      {headline ? <span className="cw-sechl">{headline}</span> : null}
      {collapsible ? <span className="cw-secchev" aria-hidden="true">▾</span> : null}
    </>
  );

  return (
    <section className="cw-section">
      {collapsible ? (
        <button
          type="button"
          className="cw-sechead"
          data-interactive="true"
          aria-expanded={expanded}
          aria-controls={bodyId}
          onClick={() => setOpen((v) => !v)}
        >
          {head}
        </button>
      ) : (
        <div className="cw-sechead">{head}</div>
      )}
      <div className="cw-collapse" data-open={expanded} id={bodyId}>
        <div className="cw-collapse-inner">
          {subtitle ? <p className="cw-secsub">{subtitle}</p> : null}
          {children}
        </div>
      </div>
    </section>
  );
}

/* ── Disclosure ─────────────────────────────────────────────────────────── */

/** Nested collapse for secondary depth. Styled as a bordered control so closed
 *  extras stay findable — not a peer of numbered sections. */
export function Disclosure({ title, note, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  return (
    <div className="cw-disc">
      <button
        type="button"
        className="cw-disc-head"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="cw-disc-title">{title}</span>
        <span className="cw-disc-rule" />
        {note ? <span className="cw-disc-count">{note}</span> : null}
        <span className="cw-secchev" aria-hidden="true">▾</span>
      </button>
      <div className="cw-collapse" data-open={open} id={bodyId}>
        <div className="cw-collapse-inner">{children}</div>
      </div>
    </div>
  );
}

/* ── Matrix ─────────────────────────────────────────────────────────────── */

/**
 * columns: [{ key, label, note?, active? }]
 * rows:    [{ label, hint?, emph?, cells: [{ text, tone?, raw?, title? }] }]
 *
 * A metric-by-window table beats a wall of equal-weight cards: every value
 * keeps its own cell, but the comparison the user actually makes — across
 * windows, across tiers — becomes a straight line for the eye.
 */
export function Matrix({ columns, rows, rowHeadLabel = "" }) {
  return (
    <div className="cw-matrix-wrap">
      <table className="cw-matrix">
        <thead>
          <tr>
            <th scope="col" className="cw-rowhead" style={{ borderBottom: "1px solid var(--border)" }}>
              {rowHeadLabel}
            </th>
            {columns.map((c) => (
              <th key={c.key} scope="col" data-active={c.active ? "true" : undefined}>
                {c.label}
                {c.note ? <small style={{ display: "block", fontWeight: 400, letterSpacing: 0, textTransform: "none", fontSize: "9.5px", color: "var(--text-xfaint)", marginTop: "2px" }}>{c.note}</small> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} data-emph={r.emph ? "true" : undefined}>
              <th scope="row" className="cw-rowhead">
                {r.label}
                {r.hint ? <small>{r.hint}</small> : null}
              </th>
              {r.cells.map((cell, i) => (
                <td
                  key={columns[i] ? columns[i].key : i}
                  data-active={columns[i] && columns[i].active ? "true" : undefined}
                  style={{ color: toneColor(cell.tone) }}
                  title={cell.title}
                >
                  <FlashNum raw={cell.raw}>{cell.text}</FlashNum>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Stat strip ─────────────────────────────────────────────────────────── */

/** items: [{ label, value, tone?, raw? }] — set fit to hug content; auto for ≤3 cells. */
export function StatStrip({ items, fit }) {
  const hug = fit ?? items.length <= 3;
  return (
    <div
      className="cw-strip"
      data-fit={hug ? "true" : undefined}
      style={hug ? { "--cw-strip-n": items.length } : undefined}
    >
      {items.map((it) => (
        <div key={it.label}>
          <div className="cw-strip-label" title={it.label}>
            {it.label}
          </div>
          <div className="cw-strip-value" style={{ color: toneColor(it.tone) }}>
            <FlashNum raw={it.raw}>{it.value}</FlashNum>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Pressure bar ───────────────────────────────────────────────────────── */

export function PressureBar({ buy, sell }) {
  const b = Math.max(0, num(buy) ?? 0);
  const s = Math.max(0, num(sell) ?? 0);
  const total = b + s;
  const buyPct = total > 0 ? (b / total) * 100 : 0;
  return (
    <div
      className="cw-pressure"
      role="img"
      aria-label={
        total > 0
          ? `Buy pressure ${fmtPct(buyPct)} of traded volume, sell pressure ${fmtPct(100 - buyPct)}`
          : "No traded volume in this window"
      }
    >
      <i className="cw-pressure-buy" style={{ width: `${buyPct}%` }} />
      <i className="cw-pressure-sell" style={{ width: `${total > 0 ? 100 - buyPct : 0}%` }} />
    </div>
  );
}

/* ── Ladder ─────────────────────────────────────────────────────────────── */

/** steps: [{ key, pct }] — a curve read top to bottom instead of four loose cards. */
export function Ladder({ steps }) {
  return (
    <div className="cw-ladder">
      {steps.map((s) => {
        const n = num(s.pct);
        return (
          <div className="cw-ladder-row" key={s.key}>
            <span className="cw-ladder-key">{s.key}</span>
            <span className="cw-ladder-track">
              <span className="cw-ladder-fill" style={{ width: `${Math.max(0, Math.min(100, n ?? 0))}%` }} />
            </span>
            <span className="cw-ladder-val" style={{ color: n == null ? "var(--text-faint)" : "var(--text)" }}>
              {fmtPct(n)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Hourly tape ────────────────────────────────────────────────────────── */

/**
 * The 24h net-flow tape as a signed column chart around a zero axis.
 *
 * The query already hands this over as a readable string, but a string of 24
 * numbers is something you parse, not something you see. Drawn, the shape of
 * the day — where the buying stacked up, where it broke — reads instantly,
 * which is what makes this the section worth screenshotting.
 */
export function HourlyTape({ bars, peakHour = null, worstHour = null, label }) {
  const peak = Math.max(...bars.map((b) => Math.abs(b.usd)), 1);
  const mark = (hour) =>
    hour && hour === peakHour ? "peak" : hour && hour === worstHour ? "worst" : undefined;
  const tz = localTimeZoneAbbr();

  return (
    <div>
      <div className="cw-tape-wrap">
        <div className="cw-tape" role="img" aria-label={label}>
          <span className="cw-tape-axis" />
          {bars.map((b) => {
            const h = `${(Math.abs(b.usd) / peak) * 100}%`;
            const up = b.usd >= 0;
            const localHour = formatTapeHourLocal(b.hour);
            return (
              <div
                className="cw-tape-col"
                key={b.hour}
                data-mark={mark(b.hour)}
                title={`${localHour}${tz ? ` ${tz}` : ""} · net ${fmtUsdSigned(b.usd)}`}
              >
                <div className="cw-tape-half cw-tape-half-up">
                  {up ? <span className="cw-tape-bar cw-tape-up" style={{ height: h }} /> : null}
                </div>
                <div className="cw-tape-half">
                  {!up ? <span className="cw-tape-bar cw-tape-down" style={{ height: h }} /> : null}
                </div>
              </div>
            );
          })}
        </div>
        <div className="cw-tape-hours" aria-hidden="true">
          {bars.map((b) => (
            <span key={b.hour} data-mark={mark(b.hour)}>
              {formatTapeHourLocal(b.hour)}
            </span>
          ))}
        </div>
      </div>
      <div className="cw-tape-legend">
        <span>{tz || "Local"} hour · net $ · tallest bar {fmtUsdSigned(peak)}</span>
        {peakHour ? (
          <span style={{ color: "var(--clawd-row-border)" }}>▮ price peak hour</span>
        ) : null}
        {worstHour ? (
          <span style={{ color: "var(--read-coral-text)" }}>▮ worst net hour</span>
        ) : null}
      </div>
    </div>
  );
}

/* ── Wallet lens ────────────────────────────────────────────────────────── */

export function WalletLens({ title, subtitle, raw }) {
  const lines = parseWalletLines(raw);
  return (
    <div className="cw-wallet-stack">
      <div className="cw-wallet-stack-head">
        <h4 className="cw-wallet-stack-title">{title}</h4>
        {subtitle ? <span className="cw-wallet-stack-sub">{subtitle}</span> : null}
      </div>
      {lines.length === 0 ? (
        <div className="cw-wallet-stack-empty">No wallets in this window yet.</div>
      ) : (
        <div className="cw-wallet-stack-rows">
          {lines.map((line, i) => (
            <div className="cw-wallet" key={`${title}-${i}`}>
              <span className="cw-wallet-rank cw-mono">{i + 1}</span>
              {line.wallet ? (
                <a
                  className="cw-mono"
                  href={`https://basescan.org/address/${line.wallet}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "12px", fontWeight: 600, color: "var(--text)" }}
                  title={line.wallet}
                >
                  {shortAddr(line.wallet)}
                </a>
              ) : null}
              <span className="cw-mono" style={{ fontSize: "12px", color: "var(--text-muted)", flex: "1 1 180px" }}>
                {line.detail}
              </span>
              {line.tx ? (
                <a
                  className="cw-mono"
                  href={`https://basescan.org/tx/${line.tx}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: "11px", color: "var(--text-faint)" }}
                >
                  tx {shortAddr(line.tx)}
                </a>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
