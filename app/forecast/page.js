import { getDashboardData } from "@/lib/getData";
import { getForecastState } from "@/lib/predictions";
import ForecastPanel from "../ForecastPanel";

export const revalidate = 3600;

export default async function Forecast() {
  const { rows } = await getDashboardData();
  const state = await getForecastState(rows);

  return (
    <main style={{ padding: "24px 20px", fontFamily: "sans-serif" }}>
      <ForecastPanel state={state} />
    </main>
  );
}
