import { kv } from "@vercel/kv";
import { getScoresLastUpdated } from "@/lib/getData";

const KEY = "tripwire:clawd:report";

export async function GET() {
  try {
    const report = (await kv.get(KEY)) || null;
    return Response.json({ report });
  } catch (err) {
    console.error("[clawd-report GET]", String(err));
    return Response.json({ report: null }, { status: 200 });
  }
}

export async function POST(request) {
  const secret = request.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const text = (body?.text || "").trim();
  if (!text || text.length > 20000) {
    return Response.json({ error: "text required (max 20k chars)" }, { status: 400 });
  }

  let scoresLastUpdated = null;
  try {
    scoresLastUpdated = await getScoresLastUpdated();
  } catch {}

  const report = {
    text,
    postedAt: new Date().toISOString(),
    scoresLastUpdated: scoresLastUpdated || null,
  };
  try {
    await kv.set(KEY, report);
    return Response.json({ report });
  } catch (err) {
    console.error("[clawd-report POST]", String(err));
    return Response.json({ error: "storage failed" }, { status: 500 });
  }
}
