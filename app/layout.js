import Providers from "./providers";
import ExperimentDisclaimer from "./ExperimentDisclaimer";
import { Analytics } from "@vercel/analytics/next";

export const metadata = {
  title: "Tripwire",
  description: "On-chain intelligence for CLAWD holders on Base",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="bone" suppressHydrationWarning style={{ background: "#eef1f4" }}>
      <head>
        <script
  dangerouslySetInnerHTML={{
    __html: `(function(){try{var t=localStorage.getItem('zdash-theme');if(t==='dark')t='wire';else if(t==='light')t='paper';else if(t==='volt')t='lilac';var ok={minimal:1,wire:1,lilac:1,tide:1,ember:1,ink:1,paper:1,bone:1};if(!ok[t])t='bone';var bg={minimal:'#0c0d0f',wire:'#16181c',lilac:'#5b35c5',tide:'#0a1218',ember:'#14110f',ink:'#0b0e16',paper:'#f8f7f4',bone:'#eef1f4'};document.documentElement.setAttribute('data-theme',t);document.documentElement.style.background=bg[t]||'#eef1f4';var n=window.matchMedia('(max-width:1023px)').matches;if(n){if(localStorage.getItem('zdash-compact-mobile')!=='1')document.documentElement.classList.add('comfort-view')}else{var c=localStorage.getItem('zdash-compact');var cw=false;try{cw=new URLSearchParams(location.search).get('tab')==='ClawdWire'}catch(e2){}if(c==='0'||(c===null&&cw))document.documentElement.classList.add('comfort-view')}}catch(e){document.documentElement.setAttribute('data-theme','bone');document.documentElement.style.background='#eef1f4'}})();`,
  }}
/>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              /* Theme tokens — each look is a full identity, not a tint. */

              /* Wire (default): charcoal + CLAWD green */
              :root,
              [data-theme="wire"],
              [data-theme="dark"] {
                --bg:               #16181c;
                --bg-subtle:        #1c1f24;
                --bg-muted:         #24282f;
                --border:           #323840;
                --border-strong:    #454c56;
                --text:             #eef0f2;
                --text-muted:       #b4bac4;
                --text-faint:       #8a929e;
                --text-xfaint:      #636b78;
                --pill-bg:          #24282f;
                --pill-border:      #323840;
                --pill-text:        #d8dce2;
                --pill-label:       #8a929e;
                --pill-value:       #eef0f2;
                --clawd-row-bg:     rgba(122,184,74,0.10);
                --clawd-row-border: #7ab84a;
                --btn-active-bg:    #7ab84a;
                --btn-active-text:  #0f140c;
                --btn-inactive-bg:  #1c1f24;
                --btn-inactive-text:#b4bac4;
                --btn-inactive-border:#323840;
                --badge-neutral-bg: #24282f;
                --badge-neutral-text:#d8dce2;
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
                --chart-grid:       rgba(180,200,220,0.08);
                --chart-tick:       #8a929e;
                --card-bg:          #1c1f24;
                --card-header-bg:   #24282f;
              }

              /* Minimal: quiet graphite */
              [data-theme="minimal"] {
                --bg:               #0c0d0f;
                --bg-subtle:        #121316;
                --bg-muted:         #181a1e;
                --border:           #26282d;
                --border-strong:    #35383f;
                --text:             #e6e7e9;
                --text-muted:       #9a9ea6;
                --text-faint:       #6d717a;
                --text-xfaint:      #4a4e56;
                --pill-bg:          #181a1e;
                --pill-border:      #26282d;
                --pill-text:        #c8cbd0;
                --pill-label:       #6d717a;
                --pill-value:       #e6e7e9;
                --clawd-row-bg:     rgba(180,186,196,0.08);
                --clawd-row-border: #a8aeb8;
                --btn-active-bg:    #d0d4da;
                --btn-active-text:  #0c0d0f;
                --btn-inactive-bg:  #121316;
                --btn-inactive-text:#9a9ea6;
                --btn-inactive-border:#35383f;
                --badge-neutral-bg: #181a1e;
                --badge-neutral-text:#c8cbd0;
                --gate-ok-bg:       #14201a;
                --gate-ok-text:     #8ab89a;
                --gate-fail-bg:     #241616;
                --gate-fail-text:   #c89898;
                --read-teal-bg:     #14201c;
                --read-teal-text:   #8ab8a8;
                --read-amber-bg:    #221c12;
                --read-amber-text:  #c0a878;
                --read-coral-bg:    #241616;
                --read-coral-text:  #c89890;
                --chart-grid:       rgba(200,205,215,0.06);
                --chart-tick:       #6d717a;
                --card-bg:          #121316;
                --card-header-bg:   #181a1e;
              }

              /* Lilac: purple hero backdrop, light type, white accents */
              [data-theme="lilac"],
              [data-theme="volt"] {
                --bg:               #5b35c5;
                --bg-subtle:        #6743d0;
                --bg-muted:         #7554d8;
                --border:           #8a6ee0;
                --border-strong:    #a892ef;
                --text:             #f7f4ff;
                --text-muted:       #d9cef8;
                --text-faint:       #b5a3e8;
                --text-xfaint:      #917bcf;
                --pill-bg:          #6743d0;
                --pill-border:      #8a6ee0;
                --pill-text:        #f7f4ff;
                --pill-label:       #b5a3e8;
                --pill-value:       #ffffff;
                --clawd-row-bg:     rgba(255,255,255,0.12);
                --clawd-row-border: #ffffff;
                --btn-active-bg:    #ffffff;
                --btn-active-text:  #4a28b0;
                --btn-inactive-bg:  #5b35c5;
                --btn-inactive-text:#d9cef8;
                --btn-inactive-border:#a892ef;
                --badge-neutral-bg: #7554d8;
                --badge-neutral-text:#f7f4ff;
                --gate-ok-bg:       #2a5a48;
                --gate-ok-text:     #b8f0d4;
                --gate-fail-bg:     #6a3030;
                --gate-fail-text:   #f0c0b8;
                --read-teal-bg:     #2a5a48;
                --read-teal-text:   #b8f0d4;
                --read-amber-bg:    #6a5020;
                --read-amber-text:  #f0d890;
                --read-coral-bg:    #6a3030;
                --read-coral-text:  #f0c0b8;
                --chart-grid:       rgba(255,255,255,0.12);
                --chart-tick:       #b5a3e8;
                --card-bg:          #6743d0;
                --card-header-bg:   #7554d8;
              }

              /* Tide: deep sea + cyan */
              [data-theme="tide"] {
                --bg:               #0a1218;
                --bg-subtle:        #0f1a22;
                --bg-muted:         #152530;
                --border:           #243848;
                --border-strong:    #355568;
                --text:             #e4eef4;
                --text-muted:       #9bb0bc;
                --text-faint:       #6a8290;
                --text-xfaint:      #4a6270;
                --pill-bg:          #152530;
                --pill-border:      #243848;
                --pill-text:        #c8dde8;
                --pill-label:       #6a8290;
                --pill-value:       #e4eef4;
                --clawd-row-bg:     rgba(62,199,192,0.12);
                --clawd-row-border: #3ec7c0;
                --btn-active-bg:    #3ec7c0;
                --btn-active-text:  #041416;
                --btn-inactive-bg:  #0f1a22;
                --btn-inactive-text:#9bb0bc;
                --btn-inactive-border:#355568;
                --badge-neutral-bg: #152530;
                --badge-neutral-text:#c8dde8;
                --gate-ok-bg:       #102820;
                --gate-ok-text:     #6ed4b0;
                --gate-fail-bg:     #2a1618;
                --gate-fail-text:   #e08890;
                --read-teal-bg:     #102820;
                --read-teal-text:   #5ed4c0;
                --read-amber-bg:    #282418;
                --read-amber-text:  #d4b870;
                --read-coral-bg:    #2a1618;
                --read-coral-text:  #e09098;
                --chart-grid:       rgba(62,199,192,0.08);
                --chart-tick:       #6a8290;
                --card-bg:          #0f1a22;
                --card-header-bg:   #152530;
              }

              /* Ember: warm night + copper */
              [data-theme="ember"] {
                --bg:               #14110f;
                --bg-subtle:        #1c1815;
                --bg-muted:         #26201c;
                --border:           #3a322c;
                --border-strong:    #524840;
                --text:             #f2ebe4;
                --text-muted:       #b8a99a;
                --text-faint:       #857868;
                --text-xfaint:      #5c5248;
                --pill-bg:          #26201c;
                --pill-border:      #3a322c;
                --pill-text:        #e0d4c8;
                --pill-label:       #857868;
                --pill-value:       #f2ebe4;
                --clawd-row-bg:     rgba(224,138,74,0.12);
                --clawd-row-border: #e08a4a;
                --btn-active-bg:    #e08a4a;
                --btn-active-text:  #1a1008;
                --btn-inactive-bg:  #1c1815;
                --btn-inactive-text:#b8a99a;
                --btn-inactive-border:#524840;
                --badge-neutral-bg: #26201c;
                --badge-neutral-text:#e0d4c8;
                --gate-ok-bg:       #1a2820;
                --gate-ok-text:     #90c8a0;
                --gate-fail-bg:     #2e1814;
                --gate-fail-text:   #e09888;
                --read-teal-bg:     #182820;
                --read-teal-text:   #88c8a8;
                --read-amber-bg:    #2a2010;
                --read-amber-text:  #e0b060;
                --read-coral-bg:    #2e1814;
                --read-coral-text:  #e09888;
                --chart-grid:       rgba(224,138,74,0.08);
                --chart-tick:       #857868;
                --card-bg:          #1c1815;
                --card-header-bg:   #26201c;
              }

              /* Ink: blue-black terminal */
              [data-theme="ink"] {
                --bg:               #0b0e16;
                --bg-subtle:        #111522;
                --bg-muted:         #181e30;
                --border:           #2a3348;
                --border-strong:    #3e4a66;
                --text:             #e8ecf6;
                --text-muted:       #a4acc4;
                --text-faint:       #6e7690;
                --text-xfaint:      #4c5470;
                --pill-bg:          #181e30;
                --pill-border:      #2a3348;
                --pill-text:        #d0d6e8;
                --pill-label:       #6e7690;
                --pill-value:       #e8ecf6;
                --clawd-row-bg:     rgba(110,168,255,0.12);
                --clawd-row-border: #6ea8ff;
                --btn-active-bg:    #6ea8ff;
                --btn-active-text:  #081018;
                --btn-inactive-bg:  #111522;
                --btn-inactive-text:#a4acc4;
                --btn-inactive-border:#3e4a66;
                --badge-neutral-bg: #181e30;
                --badge-neutral-text:#d0d6e8;
                --gate-ok-bg:       #142428;
                --gate-ok-text:     #70c8b0;
                --gate-fail-bg:     #2a1620;
                --gate-fail-text:   #e090a0;
                --read-teal-bg:     #142828;
                --read-teal-text:   #70d0c0;
                --read-amber-bg:    #282418;
                --read-amber-text:  #d4b868;
                --read-coral-bg:    #2a1620;
                --read-coral-text:  #e098a8;
                --chart-grid:       rgba(110,168,255,0.08);
                --chart-tick:       #6e7690;
                --card-bg:          #111522;
                --card-header-bg:   #181e30;
              }

              /* Paper: daylight */
              [data-theme="paper"],
              [data-theme="light"] {
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
                --btn-active-bg:    #3B6D11;
                --btn-active-text:  #f4faf0;
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

              /* Bone: cool light + steel */
              [data-theme="bone"] {
                --bg:               #eef1f4;
                --bg-subtle:        #e6eaef;
                --bg-muted:         #dce2e8;
                --border:           #cdd5de;
                --border-strong:    #b0bac6;
                --text:             #1a222c;
                --text-muted:       #4a5564;
                --text-faint:       #7a8696;
                --text-xfaint:      #a0aab8;
                --pill-bg:          #e0e6ec;
                --pill-border:      #cdd5de;
                --pill-text:        #243040;
                --pill-label:       #7a8696;
                --pill-value:       #1a222c;
                --clawd-row-bg:     rgba(26,95,122,0.08);
                --clawd-row-border: #1a5f7a;
                --btn-active-bg:    #1a5f7a;
                --btn-active-text:  #f0f7fa;
                --btn-inactive-bg:  #eef1f4;
                --btn-inactive-text:#4a5564;
                --btn-inactive-border:#b0bac6;
                --badge-neutral-bg: #e0e6ec;
                --badge-neutral-text:#1a222c;
                --gate-ok-bg:       #d8eee6;
                --gate-ok-text:     #145240;
                --gate-fail-bg:     #f5e4e2;
                --gate-fail-text:   #7a2820;
                --read-teal-bg:     #d4efe8;
                --read-teal-text:   #0a5048;
                --read-amber-bg:    #f5ecd8;
                --read-amber-text:  #6a4810;
                --read-coral-bg:    #f5e4e2;
                --read-coral-text:  #7a3028;
                --chart-grid:       rgba(20,40,60,0.08);
                --chart-tick:       #7a8696;
                --card-bg:          #e6eaef;
                --card-header-bg:   #e0e6ec;
              }


              *, *::before, *::after { box-sizing: border-box; }

              /* Figures line up in a column and stop twitching as digits change
                 width. Applied to tables and explicitly-marked numerics only —
                 prose keeps proportional figures, which read better in a
                 sentence. This is the cheapest thing on the site that makes it
                 look like one product. */
              table td, table th,
              .tw-num, .tw-hscroll table {
                font-variant-numeric: tabular-nums;
                font-feature-settings: "tnum" 1;
              }

              html { background: #eef1f4; }
              html[data-theme="minimal"] { background: #0c0d0f; }
              html[data-theme="wire"], html[data-theme="dark"] { background: #16181c; }
              html[data-theme="lilac"], html[data-theme="volt"] { background: #5b35c5; }
              html[data-theme="tide"] { background: #0a1218; }
              html[data-theme="ember"] { background: #14110f; }
              html[data-theme="ink"] { background: #0b0e16; }
              html[data-theme="paper"], html[data-theme="light"] { background: #f8f7f4; }
              html[data-theme="bone"] { background: #eef1f4; }

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