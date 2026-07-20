import { getDashboardData } from "@/lib/getData";
import { getDiscoveryData } from "@/lib/getDiscoveryData";
import DashboardTable from "../DashboardTable";
import Header from "../Header";

export const revalidate = 3600;

export default async function Dashboard() {
  const { rows: data, lastUpdated } = await getDashboardData();
  const trackedAddresses = data.map((d) => d["Address"]).filter(Boolean);
  const discoveryData = await getDiscoveryData(trackedAddresses).catch(() => []);

  return (
    <main style={{ padding: "40px", fontFamily: "sans-serif" }}>
      <Header />
      <DashboardTable data={data} discoveryData={discoveryData} lastUpdated={lastUpdated} />
    </main>
  );
}
