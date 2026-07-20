import { getScoresLastUpdated } from "@/lib/getData";

export const revalidate = 3600;

export async function GET() {
  const lastUpdated = await getScoresLastUpdated();
  return Response.json({ lastUpdated });
}
