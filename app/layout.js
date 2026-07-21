import Providers from "./providers";
import ExperimentDisclaimer from "./ExperimentDisclaimer";

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
    __html: `document.documentElement.setAttribute('data-theme', 'dark');`,
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
                 Mobile stays at 1.0 so touch targets keep their size. */
              @media (min-width: 1024px) {
                body { zoom: 0.85; }
              }
            `,
          }}
        />
      </head>
      <body>
        <Providers>
          {children}
          <div style={{ padding: "0 24px 28px", width: "100%", boxSizing: "border-box" }}>
            <ExperimentDisclaimer style={{ marginTop: 0 }} />
          </div>
        </Providers>
      </body>
    </html>
  );
}