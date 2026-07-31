import { getDashboardSnapshotMeta } from "@/lib/getData";

export const dynamic = "force-dynamic";

/**
 * Snapshot identity for the public UI.
 * Banner must only refresh the page when this advances — never show a clock
 * that doesn't match the table rows.
 */
export async function GET() {
  const meta = await getDashboardSnapshotMeta();
  return Response.json(meta);
}
