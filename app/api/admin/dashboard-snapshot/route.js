import { revalidatePath, revalidateTag } from "next/cache";
import { getDashboardDataFresh } from "@/lib/getData";

export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ error: "unauthorized" }, { status: 401 });
}

/** Fresh Dune + prices snapshot for admin copies (bypasses 1h Data Cache). */
export async function GET(req) {
  const secret = req.headers.get("x-admin-secret") || "";
  const expected = process.env.ADMIN_SECRET || "";
  if (!expected || secret !== expected) return unauthorized();

  try {
    const { rows, lastUpdated } = await getDashboardDataFresh();
    // Keep public dashboard / movers in sync with the snapshot admin just pulled.
    try {
      revalidateTag("dune-dashboard");
      revalidatePath("/");
      revalidatePath("/dashboard");
    } catch (revalErr) {
      console.warn("[admin/dashboard-snapshot] revalidate:", String(revalErr));
    }
    return Response.json({ rows, lastUpdated });
  } catch (err) {
    console.error("[admin/dashboard-snapshot]", String(err));
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}
