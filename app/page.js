import { getDashboardData } from "@/lib/getData";
import Header from "./Header";
import MoversPanel from "./MoversPanel";

// Always read the shared Upstash snapshot (no ISR copy that can drift from admin).
export const dynamic = "force-dynamic";

export default async function Home() {
  const { rows: data, lastUpdated, builtAt } = await getDashboardData();

  return (
    <main className="page-shell" style={{ padding: "20px 24px", fontFamily: "sans-serif", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <Header />
      <MoversPanel data={data} lastUpdated={lastUpdated} snapshotBuiltAt={builtAt} />
    </main>
  );
}
