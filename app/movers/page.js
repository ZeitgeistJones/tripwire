import { getDashboardData } from "@/lib/getData";
import Header from "../Header";
import MoversPanel from "../MoversPanel";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const revalidate = 0;

export default async function MoversPage() {
  const { rows: data, lastUpdated, pricesUpdatedAt, builtAt } = await getDashboardData();

  return (
    <main className="page-shell" style={{ padding: "20px 24px", fontFamily: "sans-serif", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <Header />
      <MoversPanel data={data} lastUpdated={lastUpdated} pricesUpdatedAt={pricesUpdatedAt} snapshotBuiltAt={builtAt} />
    </main>
  );
}
