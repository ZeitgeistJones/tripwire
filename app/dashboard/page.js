import { getDashboardData } from "@/lib/getData";
import { getDiscoveryData } from "@/lib/getDiscoveryData";
import DashboardTable from "../DashboardTable";
import Header from "../Header";

// Always read the shared Upstash snapshot (no ISR copy that can drift from admin).
export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const { rows: data, lastUpdated, pricesUpdatedAt, builtAt } = await getDashboardData();
  const trackedAddresses = data.map((d) => d["Address"]).filter(Boolean);
  const discoveryData = await getDiscoveryData(trackedAddresses).catch(() => []);

  return (
    <main className="page-shell" style={{ padding: "24px 32px", fontFamily: "sans-serif", maxWidth: "1480px", margin: "0 auto" }}>
      <Header />
      <DashboardTable data={data} discoveryData={discoveryData} lastUpdated={lastUpdated} pricesUpdatedAt={pricesUpdatedAt} snapshotBuiltAt={builtAt} />
    </main>
  );
}
