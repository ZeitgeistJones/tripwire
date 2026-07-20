import { getDashboardData } from "@/lib/getData";
import { getForecastState } from "@/lib/predictions";
import ForecastPanel from "../ForecastPanel";
import Header from "../Header";
import StatusBanner from "../StatusBanner";

export const revalidate = 3600;

export default async function Forecast() {
  const { rows, lastUpdated } = await getDashboardData();
  const state = await getForecastState(rows);

  return (
    <main style={{ padding: "20px 24px", fontFamily: "sans-serif", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <Header />
      <StatusBanner lastUpdated={lastUpdated} />
      <ForecastPanel state={state} />
    </main>
  );
}
