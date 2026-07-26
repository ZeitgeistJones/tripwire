import { getDashboardData } from "@/lib/getData";
import Header from "./Header";
import MoversPanel from "./MoversPanel";

export const revalidate = 3600;

export default async function Home() {
  const { rows: data, lastUpdated } = await getDashboardData();

  return (
    <main className="page-shell" style={{ padding: "20px 24px", fontFamily: "sans-serif", width: "100%", maxWidth: "100%", boxSizing: "border-box" }}>
      <Header />
      <MoversPanel data={data} lastUpdated={lastUpdated} />
    </main>
  );
}
