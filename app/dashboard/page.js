import { getDashboardData } from "@/lib/getData";
import DashboardTable from "../DashboardTable";
import Header from "../Header";

// Always read the shared Upstash snapshot (no ISR copy that can drift from admin).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function Dashboard() {
  const { rows: data, lastUpdated, pricesUpdatedAt, builtAt } = await getDashboardData();

  return (
    <main className="page-shell" style={{ padding: "16px 20px 32px", fontFamily: "sans-serif", width: "100%", maxWidth: "100%", margin: 0, boxSizing: "border-box" }}>
      <Header />
      <DashboardTable data={data} lastUpdated={lastUpdated} pricesUpdatedAt={pricesUpdatedAt} snapshotBuiltAt={builtAt} />
    </main>
  );
}
