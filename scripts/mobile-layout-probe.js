/**
 * Mobile layout probe — measures sticky Project column overlap at phone width.
 * Usage: node scripts/mobile-layout-probe.js [url]
 */
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const URL = process.argv[2] || "http://127.0.0.1:3000/dashboard";
const LOG = path.join(__dirname, "..", "debug-a643bc.log");
const INGEST = "http://127.0.0.1:7267/ingest/fcedb7d7-4701-4f48-8ac8-84fbb0361359";

function writeLog(payload) {
  const line = JSON.stringify({ sessionId: "a643bc", timestamp: Date.now(), ...payload });
  fs.appendFileSync(LOG, line + "\n");
  fetch(INGEST, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "a643bc" },
    body: line,
  }).catch(() => {});
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  });

  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);

  // Prefer Full table if toggle exists
  const fullBtn = page.locator("button.tw-table-mode-toggle, button:has-text('Full table')").first();
  if (await fullBtn.count()) {
    const label = await fullBtn.textContent();
    if (label && /full table/i.test(label)) await fullBtn.click();
    await page.waitForTimeout(500);
  }

  // Wait for sticky project cell or summary
  await page.waitForTimeout(1000);

  const metrics = await page.evaluate(() => {
    const vp = window.innerWidth;
    const scroller = document.querySelector("[data-h-scroll]");
    const projectTd = document.querySelector("td.tw-sticky-project");
    const actionsTd = document.querySelector("td.tw-sticky-actions");
    const nextTd = projectTd?.nextElementSibling;
    const summaryParent = document.querySelector(".tw-summary-only");
    const cs = projectTd ? getComputedStyle(projectTd) : null;
    const projectRect = projectTd?.getBoundingClientRect();
    const nextRect = nextTd?.getBoundingClientRect();
    const actionsRect = actionsTd?.getBoundingClientRect();
    const names = [...document.querySelectorAll("td.tw-sticky-project")].map((td) =>
      (td.textContent || "").trim()
    );
    const longest = names.reduce((a, b) => (b.length > a.length ? b : a), "");
    return {
      viewport: vp,
      url: location.href,
      hasScroller: !!scroller,
      scrollerScrollWidth: scroller?.scrollWidth ?? null,
      scrollerClientWidth: scroller?.clientWidth ?? null,
      actionsW: actionsRect ? Math.round(actionsRect.width) : null,
      projectW: projectRect ? Math.round(projectRect.width) : null,
      projectScrollW: projectTd?.scrollWidth ?? null,
      projectMaxWidth: cs?.maxWidth ?? null,
      projectOverflow: cs?.overflow ?? null,
      projectWhiteSpace: cs?.whiteSpace ?? null,
      projectPosition: cs?.position ?? null,
      projectBg: cs?.backgroundColor ?? null,
      nextColLeft: nextRect ? Math.round(nextRect.left) : null,
      projectRight: projectRect ? Math.round(projectRect.right) : null,
      overlapPx:
        projectRect && nextRect ? Math.round(projectRect.right - nextRect.left) : null,
      stickySharePct:
        projectRect && actionsRect
          ? Math.round(((projectRect.width + actionsRect.width) / vp) * 100)
          : projectRect
            ? Math.round((projectRect.width / vp) * 100)
            : null,
      longestName: longest.slice(0, 80),
      longestLen: longest.length,
      nameCount: names.length,
      summaryDisplay: summaryParent ? getComputedStyle(summaryParent).display : null,
      hasProjectTd: !!projectTd,
      tableModeBtn: document.querySelector(".tw-table-mode-toggle")?.textContent?.trim() || null,
    };
  });

  writeLog({
    runId: "probe-pre-fix",
    hypothesisId: "A-E",
    location: "scripts/mobile-layout-probe.js",
    message: "Playwright mobile Project column metrics",
    data: metrics,
  });

  console.log(JSON.stringify(metrics, null, 2));
  await browser.close();

  // Exit nonzero if overlap / unbounded sticky looks bad
  const bad =
    metrics.hasProjectTd &&
    metrics.isPhone !== false &&
    ((metrics.projectW != null && metrics.projectW > 120) ||
      (metrics.stickySharePct != null && metrics.stickySharePct > 45) ||
      (metrics.projectMaxWidth === "none" && metrics.projectW > 100));
  process.exit(bad ? 2 : 0);
})().catch((err) => {
  writeLog({
    runId: "probe-error",
    location: "scripts/mobile-layout-probe.js",
    message: String(err),
    data: { stack: err.stack },
  });
  console.error(err);
  process.exit(1);
});
