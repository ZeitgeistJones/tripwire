import { readRecentPulses } from "@/lib/clawdWirePulse";

/**
 * Which coins have a fresh pulse — i.e. which ones are free to look at right
 * now because somebody already ran them. Open to everyone: it is a list of
 * cache keys and timestamps, and it is the cheapest way to point people at
 * the coins worth opening.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 12));
  const recent = await readRecentPulses(limit);
  return Response.json({ recent });
}
