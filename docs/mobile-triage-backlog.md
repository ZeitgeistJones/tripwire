# Mobile triage layer — backlog

**Constraint (all tickets):** Desktop ≥1024px must look/behave as today (`zoom: 0.85` + Compact/`zdash-compact`). All new UX behind `max-width: 1023px` (or `767px`) / progressive enhancement. Do not stack a second table zoom. Preserve ←/→ `[data-h-scroll]`, Humpback labels, Watchlist tooltip props when touching those files.

**Strategy:** Phone is a prioritized dashboard (triage), not a scaled desktop. Dense matrix stays available as expert/secondary mode.

---

## Priority map

| ID | Pri | Title | Primary files |
|----|-----|-------|---------------|
| MT-1 | P1 | Phone-first dashboard viewport | `DashboardTable.js`, maybe thin CLAWD summary extract |
| MT-2 | P1 | Primary nav: 5 destinations + More | `DashboardTable.js`, `MoversPanel.js`, `ForecastPanel.js`, `layout.js` |
| MT-3 | P1 | Hybrid tables: summary list → full table | `DashboardTable.js`, `WatchlistPanel.js` |
| MT-4 | P2 | Mobile comfort default (Compact opt-in) | `DashboardTable.js`, `layout.js` FOUC script |
| MT-5 | P2 | Discovery: bottom sheet defs + inline row expand | `DashboardTable.js`, `WatchlistPanel.js`, `layout.js` |
| MT-6 | P2 | CLAWD status block + quieter actions | `ClawdPanel.js` |
| MT-7 | P3 | Expert full-table mode polish (sticky header + sticky Project) | `DashboardTable.js`, `layout.js` |

Suggested ship order: **MT-2 → MT-3 → MT-1 → MT-4 → MT-6 → MT-5 → MT-7**  
(Nav + hybrid table unlock the triage viewport; comfort/status/discovery polish after.)

---

## MT-1 — Phone-first first viewport (P1)

**Goal:** On phone, landing the dashboard should show trust/state/action before any full matrix.

**Behavior (≤1023px only):**
- When opening `/dashboard` (or Overview), first viewport shows:
  1. Dominant CLAWD health strip (Read + Signal + one-line explanation) — compact, not full ClawdPanel
  2. One key summary block (e.g. top Opp movers / anomalous Whale Net or Absorbed+whales) — 3–5 rows max
  3. One clear next action (e.g. “Open full Overview table” / “CLAWD health check”)
- Full column table is not above the fold.

**Out of scope:** Redesigning Movers `/` or Forecast.

**Acceptance:**
- Desktop Overview unchanged (table + ProfSignalKey as today)
- Phone: health + summary + CTA visible without horizontal scroll; full table behind secondary control or after scroll past triage

**Cursor prompt:**
```
Implement MT-1 from docs/mobile-triage-backlog.md.
Add a mobile-only triage block above the Overview table in DashboardTable.js (max-width 1023px).
Reuse CLAWD row fields (Prof/signal/read/signalNote) for a dominant health strip; show 3–5 top/anomalous peers as a simple list; CTA to reveal full table / jump to CLAWD.
Desktop ≥1024px must be unchanged. Do not alter zoom/compact desktop logic.
```

---

## MT-2 — Nav: 4–5 primaries + More (P1)

**Goal:** Replace ~12 equal tab chips with a small primary set.

**Primary destinations (phone):**
1. Overview  
2. Whales & Risk  
3. Watchlist  
4. Activity  
5. More → Buyers, Wallets, Discover, CLAWD, The Wire, About (+ keep Movers/Forecast as links)

**Behavior:**
- ≤1023px: show primary chips + More (sheet or popover listing secondary tabs)
- ≥1024px: keep current full tab strip (all tabs visible, wrap as today)
- Sync Movers/Forecast tab bars the same way (or link into dashboard More)

**Acceptance:**
- Desktop still shows all tabs; no missing destinations
- Phone: ≤6 chrome controls in the top strip; every former tab reachable in ≤2 taps

**Cursor prompt:**
```
Implement MT-2 from docs/mobile-triage-backlog.md.
On max-width 1023px only, replace the flat all-tabs strip in DashboardTable.js (and mirror MoversPanel/ForecastPanel) with primary tabs Overview, Whales & Risk, Watchlist, Activity, plus a More control that opens secondary destinations.
Desktop ≥1024px must keep the current full tab strip. Do not change zoom/compact.
```

---

## MT-3 — Hybrid table: summary default + full-table mode (P1)

**Goal:** Overview and Whales & Risk on phone default to a prioritized list/card summary; full wide table is a secondary mode.

**Summary row (suggested fields):**
- Overview: Project, Read (or Prof), Opp, Mom, Sus, signal (+ whale note if present)
- Whales: Project, Whale Net 7d, Accum %, Retail Net, Whale Vol %, signal/Read

**Behavior:**
- ≤767px (or ≤1023px): default `viewMode = "summary"`; toggle “Full table”
- Full table = current h-scroll + sticky Project/actions (existing `tw-hscroll` classes)
- Desktop always full table; no toggle

**Acceptance:**
- Phone Overview/Whales open in summary; one tap reaches full matrix
- Sort/filter/pin/watch still work in full mode; summary can support star + tap-through
- Desktop unchanged

**Cursor prompt:**
```
Implement MT-3 from docs/mobile-triage-backlog.md.
For Overview and Whales & Risk on phone only, default to a summary list (prioritized columns) with a toggle to the existing full h-scroll table (sticky Project).
Desktop always shows the current full table. Keep pin/watch/sort working in full mode. No desktop visual changes.
```

---

## MT-4 — Mobile comfort default (P2)

**Goal:** On phone, readable density by default; Compact is opt-in.

**Behavior:**
- ≤1023px: treat Compact as OFF unless user explicitly set `zdash-compact=1` *while on mobile* (use a separate key e.g. `zdash-compact-mobile`, or interpret null as comfort on mobile only)
- ≥1024px: keep current semantics (`null` = Compact ON, drives `comfort-view` / zoom)
- FOUC script in `layout.js` must stay desktop-correct

**Acceptance:**
- Fresh phone user sees comfort/readable cells without toggling
- Desktop first visit still Compact/zoom 0.85
- Toggle still works on both; prefs don’t clobber each other

**Cursor prompt:**
```
Implement MT-4 from docs/mobile-triage-backlog.md.
Make Compact default OFF on viewports ≤1023px (separate mobile preference or null→comfort on mobile only) while desktop keeps null=Compact ON and zoom 0.85.
Update DashboardTable load/save + layout.js FOUC script carefully so desktop FOUC is unchanged.
```

---

## MT-5 — Discovery: bottom sheet + inline expand (P2)

**Goal:** Replace hover-era discovery with consistent touch rules.

**Rules:**
- Column definitions / glossary → bottom sheet (global)
- Peer rank + row-specific detail → inline expand under the row (or row drawer)
- Tiny single-field clarifications may keep short tooltip/tap pop

**Acceptance:**
- Phone: tap header opens sheet with definition; tap metric expands rank locally
- Desktop hover tooltips remain
- Dismiss: sheet scrim / expand second tap

**Cursor prompt:**
```
Implement MT-5 from docs/mobile-triage-backlog.md.
On touch/narrow viewports, open column definitions in a bottom sheet and peer-rank/row detail via inline expand under the row. Keep desktop hover tooltips. Build on existing useDelayedTooltip in DashboardTable.js; extend Watchlist similarly. Desktop unchanged.
```

---

## MT-6 — CLAWD hierarchy: status block + quieter actions (P2)

**Goal:** One dominant health block; share/report as secondary cluster.

**Behavior (≤1023px):**
- Merge Read / Profile / Signal into one visual status hero (Read dominant)
- Share buttons + report in a quieter secondary row (smaller type, less equal weight than status)
- Keep Telegram paste hint

**Acceptance:**
- First glance answers “what’s CLAWD’s state?” before “how do I copy?”
- Desktop ClawdPanel layout unchanged (or only CSS-class mobile overrides)

**Cursor prompt:**
```
Implement MT-6 from docs/mobile-triage-backlog.md.
On phone only, regroup ClawdPanel ProfileSignalBanner + ShareButtons into one dominant health/status block and a quieter secondary action cluster. Keep all copy buttons and Telegram hint. Desktop layout unchanged.
```

---

## MT-7 — Expert full-table polish (P3)

**Goal:** Full-table mode is excellent for power users, not the default burden.

**Behavior:**
- Sticky header row + sticky Project/actions (enhance existing CSS)
- Optional “Columns” hint / jump-to-scroll affordance
- Only surfaces when user chooses Full table (after MT-3)

**Cursor prompt:**
```
Implement MT-7 from docs/mobile-triage-backlog.md.
Polish mobile full-table mode only: sticky thead + existing sticky Project/actions, clear scroll affordance. Do not make full table the phone default. Desktop unchanged.
```

---

## Done when (pass definition)

- Phone first visit: triage → summary → optional full table; ≤5 primary nav items
- Desktop: pixel/behavior parity with pre-pass for zoom, Compact, full tabs, full matrix
- No new hover-only features; touch has sheet/expand/summary paths
