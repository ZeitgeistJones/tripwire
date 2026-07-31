import { getScoresLastUpdated } from "@/lib/getData";

export const dynamic = "force-dynamic";

/** Same lastUpdated as the table — from the Upstash dashboard snapshot. */
export async function GET() {
  const lastUpdated = await getScoresLastUpdated();
  return Response.json({ lastUpdated });
}
