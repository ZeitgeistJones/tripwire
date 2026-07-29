import { getDashboardData } from "@/lib/getData";
import AdminPanel from "./AdminPanel";

export const metadata = {
  title: "Admin · Tripwire",
  robots: { index: false, follow: false },
};

export const revalidate = 3600;

export default async function AdminPage() {
  const { rows, lastUpdated } = await getDashboardData().catch(() => ({ rows: [], lastUpdated: null }));

  return (
    <main
      className="page-shell"
      style={{
        padding: "20px 24px",
        fontFamily: "sans-serif",
        width: "100%",
        maxWidth: "880px",
        margin: "0 auto",
        boxSizing: "border-box",
        minHeight: "100vh",
      }}
    >
      <AdminPanel rows={rows} scoresLastUpdated={lastUpdated} />
    </main>
  );
}
