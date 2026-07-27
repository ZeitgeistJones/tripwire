import AdminPanel from "./AdminPanel";

export const metadata = {
  title: "Admin · Tripwire",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <main
      className="page-shell"
      style={{
        padding: "20px 24px",
        fontFamily: "sans-serif",
        width: "100%",
        maxWidth: "720px",
        margin: "0 auto",
        boxSizing: "border-box",
        minHeight: "100vh",
      }}
    >
      <AdminPanel />
    </main>
  );
}
