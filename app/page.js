import { getDashboardData } from "@/lib/getData";
import MoversPanel from "./MoversPanel";

export const revalidate = 3600;

export default async function Home() {
  const { rows: data, lastUpdated } = await getDashboardData();

  return (
    <main style={{ padding: "24px 20px", fontFamily: "sans-serif" }}>
      <MoversPanel data={data} lastUpdated={lastUpdated} />
    </main>
  );
}
