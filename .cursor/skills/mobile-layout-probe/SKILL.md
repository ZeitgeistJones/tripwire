---
name: mobile-layout-probe
description: >-
  Reproduce and measure Tripwire mobile layout bugs with Playwright at phone
  viewport (390x844). Use when debugging sticky columns, overflow, overlap, or
  mobile CSS without asking the user to reproduce manually.
---

# Mobile layout probe

## When to use

- Mobile UI bugs (overlap, sticky columns, overflow, density)
- User declines to reproduce manually
- Need runtime layout metrics (widths, computed styles, overlap px)

## Workflow

1. Ensure `playwright` is installed (`npm i -D playwright` + `npx playwright install chromium`).
2. Start the app if needed (`npm run dev`).
3. Run:

```bash
node scripts/mobile-layout-probe.js http://127.0.0.1:3000/dashboard
```

4. Read printed JSON + `debug-a643bc.log` (or current session log).
5. Key fields:
   - `projectW` / `projectMaxWidth` / `projectWhiteSpace`
   - `stickySharePct` (actions + project vs viewport)
   - `overlapPx` (project right − next column left; >0 means sticky covers next col origin)
6. Fix behind `@media (max-width: 767px)` / `1023px` only; never change desktop zoom/compact.

## Tripwire constraints

- Keep `@media (min-width: 1024px) { html:not(.comfort-view) body { zoom: 0.85 } }`
- Prefer CSS on `.tw-sticky-project` for name column caps + ellipsis
