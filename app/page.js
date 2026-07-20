import { getDashboardData } from "@/lib/getData";
import Header from "./Header";
import MoversPanel from "./MoversPanel";

export const revalidate = 3600;

export default async function Home() {
  const { rows: data, lastUpdated } = await getDashboardData();

  return (
    <main style={{ padding: "24px 32px", fontFamily: "sans-serif", maxWidth: "1480px", margin: "0 auto" }}>
      <Header />
      <MoversPanel data={data} lastUpdated={lastUpdated} />
    </main>
  );
}
