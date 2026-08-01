import Providers from "./providers";
import ExperimentDisclaimer from "./ExperimentDisclaimer";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Tripwire",
  description: "On-chain intelligence for CLAWD holders on Base",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning style={{ background: "#1c1b22" }}>
      <head>
        <script
  dangerouslySetInnerHTML={{
    __html: `document.documentElement.setAttribute('data-theme','dark');try{var n=window.matchMedia('(max-width:1023px)').matches;if(n){if(localStorage.getItem('zdash-compact-mobile')!=='1')document.documentElement.classList.add('comfort-view')}else{var c=localStorage.getItem('zdash-compact');var cw=false;try{cw=new URLSearchParams(location.search).get('tab')==='ClawdWire'}catch(e2){}if(c==='0'||(c===null&&cw))document.documentElement.classList.add('comfort-view')}}catch(e){}`,
  }}
/>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* ── Light mode ─────────────────────────────────────────── */
              :root {
                --bg:               #f8f7f4;
                --bg-subtle:        #f2f0ec;
                --bg-muted:         #eceae4;
                --border:           #dedad2;
                --border-strong:    #c8c4ba;
                --text:             #2c2a26;
                --text-muted:       #5a5750;
                --text-faint:       #8a877f;
                --text-xfaint:      #b0ada5;

                --pill-bg:          #eceae4;
                --pill-border:      #dedad2;
                --pill-text:        #3a3830;
                --pill-label:       #8a877f;
                --pill-value:       #1e1c18;

                --clawd-row-bg:     rgba(59,109,17,0.06);
                --clawd-row-border: #3B6D11;

                --btn-active-bg:    #3d3a52;
                --btn-active-text:  #f0eeff;
                --btn-inactive-bg:  #f8f7f4;
                --btn-inactive-text:#3a3830;
                --btn-inactive-border:#c8c4ba;

                --badge-neutral-bg: #eceae4;
                --badge-neutral-text:#2c2a26;

                --gate-ok-bg:       #e6f4ee;
                --gate-ok-text:     #1a5c3a;
                --gate-fail-bg:     #faecea;
                --gate-fail-text:   #7a2118;

                --read-teal-bg:     #ddf4ec;
                --read-teal-text:   #085041;
                --read-amber-bg:    #faeeda;
                --read-amber-text:  #633806;
                --read-coral-bg:    #faecea;
                --read-coral-text:  #712B13;

                --chart-grid:       rgba(0,0,0,0.07);
                --chart-tick:       #8a877f;
                --card-bg:          #f8f7f4;
                --card-header-bg:   #eceae4;
              }

              /* ── Dark mode — warm slate with lavender accent ─────────── */
              [data-theme="dark"] {
                --bg:               #1c1b22;
                --bg-subtle:        #23222b;
                --bg-muted:         #2a2933;
                --border:           #383644;
                --border-strong:    #4a4758;
                --text:             #e8e6f0;
                --text-muted:       #a8a4bc;
                --text-faint:       #6e6a80;
                --text-xfaint:      #4e4a5e;

                --pill-bg:          #2a2933;
                --pill-border:      #38364a;
                --pill-text:        #ccc8e0;
                --pill-label:       #6e6a80;
                --pill-value:       #e8e6f0;

                --clawd-row-bg:     rgba(130,180,80,0.08);
                --clawd-row-border: #7ab84a;

                --btn-active-bg:    #7c6fcd;
                --btn-active-text:  #f0eeff;
                --btn-inactive-bg:  #23222b;
                --btn-inactive-text:#a8a4bc;
                --btn-inactive-border:#38364a;

                --badge-neutral-bg: #2a2933;
                --badge-neutral-text:#ccc8e0;

                --gate-ok-bg:       #1a2e24;
                --gate-ok-text:     #74c99a;
                --gate-fail-bg:     #2e1a1a;
                --gate-fail-text:   #e08080;

                --read-teal-bg:     #1a2e28;
                --read-teal-text:   #74c9a8;
                --read-amber-bg:    #2e2210;
                --read-amber-text:  #d4a864;
                --read-coral-bg:    #2e1a1a;
                --read-coral-text:  #e08878;

                --chart-grid:       rgba(200,190,255,0.08);
                --chart-tick:       #6e6a80;
                --card-bg:          #23222b;
                --card-header-bg:   #2a2933;
              }

              *, *::before, *::after { box-sizing: border-box; }

              html {
                background: #1c1b22;
              }

              body {
                background: var(--bg);
                color: var(--text);
                margin: 0;
                font-family: sans-serif;
              }

              /* Denser default view on desktop: scale the whole UI down
                 so more rows/columns fit without changing any component.
                 Mobile stays at 1.0 so touch targets keep their size.
                 Toggle via html.comfort-view (Compact button turns this off). */
              @media (min-width: 1024px) {
                html:not(.comfort-view) body { zoom: 0.85; }
              }

              /* ── Mobile UX (desktop-safe: only applies below 1024px) ─── */
              .tw-tip-mobile { display: none; }
              .tw-nav-mobile { display: none !important; }
              .tw-summary-only { display: none !important; }
              .tw-table-mode-toggle { display: none !important; }
              .tw-mobile-triage { display: none !important; }

              @media (max-width: 1023px) {
                body { overflow-x: clip; }

                .tw-nav-desktop { display: none !important; }
                .tw-nav-mobile {
                  display: flex !important;
                  flex-wrap: nowrap !important;
                  overflow-x: auto !important;
                  -webkit-overflow-scrolling: touch;
                  scrollbar-width: none;
                }
                .tw-nav-mobile::-webkit-scrollbar { display: none; }

                .tw-table-mode-toggle { display: inline-flex !important; }
                .tw-hybrid-summary .tw-full-table { display: none !important; }
                .tw-hybrid-summary .tw-summary-only { display: block !important; }
                .tw-hybrid-full .tw-summary-only { display: none !important; }
                .tw-hybrid-full .tw-full-table { display: block !important; }
                .tw-mobile-triage { display: block !important; }

                .page-shell {
                  padding-left: 14px !important;
                  padding-right: 14px !important;
                }
                .page-shell-disclaimer {
                  padding-left: 14px !important;
                  padding-right: 14px !important;
                }

                .tw-tab-strip {
                  flex-wrap: nowrap !important;
                  overflow-x: auto !important;
                  -webkit-overflow-scrolling: touch;
                  scrollbar-width: none;
                  gap: 6px !important;
                  margin-bottom: 10px !important;
                  padding-bottom: 2px;
                }
                .tw-tab-strip::-webkit-scrollbar { display: none; }
                .tw-tab-strip > a,
                .tw-tab-strip > button,
                .tw-tab-strip > span {
                  flex-shrink: 0;
                  min-height: 40px;
                  display: inline-flex;
                  align-items: center;
                  padding-top: 10px !important;
                  padding-bottom: 10px !important;
                }

                .tw-tip-desktop { display: none !important; }
                .tw-tip-mobile { display: block !important; }

                .tw-filter-bar button {
                  padding: 8px 12px !important;
                  font-size: 12px !important;
                  min-height: 36px;
                }
                .tw-compact-btn {
                  padding: 8px 14px !important;
                  font-size: 13px !important;
                  min-height: 40px;
                }
                .tw-segmented button {
                  min-height: 40px !important;
                  padding-top: 8px !important;
                  padding-bottom: 8px !important;
                }

                .tw-icon-btn {
                  min-width: 34px !important;
                  min-height: 40px !important;
                  padding: 8px 4px !important;
                  display: inline-flex !important;
                  align-items: center;
                  justify-content: center;
                }

                .tw-prof-key-grid {
                  grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                }

                .tw-clawd-grid-3,
                .tw-clawd-grid-2 {
                  grid-template-columns: 1fr !important;
                }
                .tw-clawd-grid-2 > * {
                  grid-column: auto !important;
                }
                .tw-compact-row {
                  flex-wrap: wrap;
                  gap: 6px 10px !important;
                }
                .tw-compact-row > span:nth-child(1) { width: auto !important; min-width: 40%; }
                .tw-compact-row > span:nth-child(2) { width: auto !important; }
                .tw-compact-row > span:nth-child(3) { width: auto !important; }

                .tw-forecast-cards {
                  grid-template-columns: 1fr !important;
                }

                .tw-holder-subtitle { display: none !important; }
                .tw-disconnect-btn {
                  padding: 10px 14px !important;
                  font-size: 13px !important;
                  min-height: 40px;
                }

                .tw-watchlist-modal {
                  left: 8px !important;
                  right: 8px !important;
                  max-height: calc(100vh - 24px);
                  overflow-y: auto;
                }

                /* Sticky Project / actions on all mobile widths */
                .tw-hscroll table th.tw-sticky-actions,
                .tw-hscroll table td.tw-sticky-actions {
                  position: sticky;
                  left: 0;
                  z-index: 3;
                  background: var(--bg);
                  box-shadow: 1px 0 0 var(--border);
                  width: 56px !important;
                  min-width: 56px !important;
                  max-width: 56px !important;
                  padding-left: 2px !important;
                  padding-right: 2px !important;
                  overflow: hidden;
                }
                .tw-hscroll table th.tw-sticky-project,
                .tw-hscroll table td.tw-sticky-project {
                  position: sticky;
                  left: 0;
                  z-index: 2;
                  background: var(--bg);
                  box-shadow: 2px 0 6px rgba(0,0,0,0.12);
                  width: 88px !important;
                  min-width: 88px !important;
                  max-width: 88px !important;
                  overflow: hidden;
                }
                .tw-hscroll.has-actions table th.tw-sticky-project,
                .tw-hscroll.has-actions table td.tw-sticky-project {
                  left: 56px;
                }
                .tw-hscroll table th.tw-sticky-project .tw-name-clip,
                .tw-hscroll table td.tw-sticky-project .tw-name-clip {
                  display: block;
                  max-width: 68px;
                  overflow: hidden;
                  text-overflow: ellipsis;
                  white-space: nowrap;
                }
                .tw-hscroll thead th {
                  position: sticky;
                  top: 0;
                  z-index: 4;
                  background: var(--bg);
                }
                .tw-hscroll thead th.tw-sticky-actions,
                .tw-hscroll thead th.tw-sticky-project {
                  z-index: 5;
                  background: var(--bg);
                }
                .tw-hscroll .tw-icon-btn {
                  min-width: 26px !important;
                  min-height: 36px !important;
                  padding: 6px 1px !important;
                }

                /* Compact densifies type; comfort keeps readable 13px */
                html.comfort-view .tw-hscroll {
                  font-size: 13px !important;
                }
                html:not(.comfort-view) .tw-hscroll {
                  font-size: 11px !important;
                }
                html.comfort-view .tw-hscroll table th,
                html.comfort-view .tw-hscroll table td {
                  padding: 8px 10px !important;
                }
              }

              @media (max-width: 767px) {
                .page-shell {
                  padding-left: 12px !important;
                  padding-right: 12px !important;
                  padding-top: 16px !important;
                }

                .tw-prof-key-grid {
                  grid-template-columns: 1fr !important;
                }
              }
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          {children}
          <div className="page-shell-disclaimer" style={{ padding: "0 24px 28px", width: "100%", boxSizing: "border-box" }}>
            <ExperimentDisclaimer style={{ marginTop: 0 }} />
          </div>
          <Analytics />
        </Providers>
      </body>
    </html>
  );
}