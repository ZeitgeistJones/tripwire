import { getDashboardData } from "@/lib/getData";
import { getForecastState } from "@/lib/predictions";
import ForecastPanel from "../ForecastPanel";
import Header from "../Header";
import StatusBanner from "../StatusBanner";

export const revalidate = 3600;

export default async function Forecast() {
  let rows = [];
  let lastUpdated = null;
  let state = null;
  let loadError = null;

  try {
    const data = await getDashboardData();
    rows = data.rows || [];
    lastUpdated = data.lastUpdated;
    // lastUpdated is the Dune execution timestamp — it doubles as the
    // data version: portfolios only trade when it changes (72h backstop).
    state = await getForecastState(rows, lastUpdated);
  } catch (err) {
    console.error("[forecast page]", err);
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
    <main className="page-shell" style={{ padding: "20px 24px", fontFamily: "sans-serif", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <Header />
      <StatusBanner lastUpdated={lastUpdated} />
      {loadError && (
        <div style={{
          marginBottom: "12px",
          padding: "10px 14px",
          borderRadius: "8px",
          background: "var(--gate-fail-bg)",
          color: "var(--gate-fail-text)",
          fontSize: "13px",
        }}>
          Forecast load issue: {loadError}
        </div>
      )}
      <ForecastPanel state={state} />
    </main>
  );
}
