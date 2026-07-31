import { getDashboardData } from "@/lib/getData";
import { getForecastState } from "@/lib/predictions";
import ForecastPanel from "../../ForecastPanel";
import AdminUnlockShell from "../AdminUnlockShell";

export const metadata = {
  title: "Forecast · Admin · Tripwire",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminForecastPage() {
  let rows = [];
  let lastUpdated = null;
  let state = null;
  let loadError = null;

  try {
    const data = await getDashboardData();
    rows = data.rows || [];
    lastUpdated = data.lastUpdated;
    state = await getForecastState(rows, lastUpdated);
  } catch (err) {
    console.error("[admin forecast page]", err);
    loadError = String(err?.message || err);
    try {
      state = await getForecastState(rows, lastUpdated);
    } catch {
      state = {
        leaderboard: [],
        history: [],
        kvOk: false,
        kvError: loadError,
        holdingsCount: 10,
        startingValue: 100,
        feePct: 1,
        minVol30d: 25000,
        backstopHours: 72,
        strategies: [],
      };
    }
  }

  return (
    <main
      className="page-shell"
      style={{
        padding: "20px 24px",
        fontFamily: "sans-serif",
        width: "100%",
        maxWidth: "1080px",
        margin: "0 auto",
        boxSizing: "border-box",
        minHeight: "100vh",
      }}
    >
      <AdminUnlockShell title="Forecast · admin">
        {loadError && (
          <div
            style={{
              marginBottom: "12px",
              padding: "10px 14px",
              borderRadius: "8px",
              background: "var(--gate-fail-bg)",
              color: "var(--gate-fail-text)",
              fontSize: "13px",
            }}
          >
            Forecast load issue: {loadError}
          </div>
        )}
        <ForecastPanel state={state} variant="admin" />
      </AdminUnlockShell>
    </main>
  );
}
