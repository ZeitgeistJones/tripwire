import { kv } from "@vercel/kv";
import { getDashboardData, getScoresLastUpdated } from "@/lib/getData";
import { analysisFingerprint, buildAnalysisPrompt } from "@/lib/clawdAnalysisPrompt";

const ANALYSIS_KEY = "tripwire:clawd:analysis";
const LOCK_KEY = "tripwire:clawd:analysis:lock";

/** Hard floor between Gemini calls — protects free/paid quota. */
const MIN_INTERVAL_MS = 12 * 60 * 60 * 1000; // 12 hours
const HISTORY_QUERY_ID = "7767406";
const DEFAULT_MODEL = "gemini-2.5-flash";

export async function GET() {
  try {
    const analysis = (await kv.get(ANALYSIS_KEY)) || null;
    return Response.json({ analysis });
  } catch (err) {
    console.error("[clawd-analysis GET]", String(err));
    return Response.json({ analysis: null }, { status: 200 });
  }
}

export async function POST(request) {
  const secret = request.headers.get("x-admin-secret");
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return Response.json({ error: "GEMINI_API_KEY not configured" }, { status: 503 });
  }

  let force = false;
  try {
    const body = await request.json().catch(() => ({}));
    force = Boolean(body?.force);
  } catch {
    force = false;
  }

  try {
    const existing = (await kv.get(ANALYSIS_KEY)) || null;
    const { rows } = await getDashboardData();
    const clawdRow =
      rows.find((r) => (r.Project || "").toUpperCase() === "CLAWD") ||
      rows.find((r) => (r.Address || "").toLowerCase() === "0x9f86db9fc6f7c9408e8fda3ff8ce4e78ac7a6b07");
    if (!clawdRow) {
      return Response.json({ error: "CLAWD row not found" }, { status: 404 });
    }

    const scoresLastUpdated = await getScoresLastUpdated();
    const fingerprint = analysisFingerprint(clawdRow, scoresLastUpdated);

    // Serve cache when data unchanged — never burns Gemini quota.
    if (existing?.text && existing.dataFingerprint === fingerprint && !force) {
      return Response.json({
        analysis: existing,
        cached: true,
        reason: "fingerprint_unchanged",
      });
    }

    const now = Date.now();
    const lastAt = existing?.generatedAt ? Date.parse(existing.generatedAt) : 0;
    if (lastAt && now - lastAt < MIN_INTERVAL_MS && !force) {
      return Response.json(
        {
          error: "cooldown",
          retryAfterHours: Math.ceil((MIN_INTERVAL_MS - (now - lastAt)) / 3600000),
          analysis: existing,
        },
        { status: 429 }
      );
    }
    // Even with force, enforce a short floor (15m) against double-clicks.
    if (force && lastAt && now - lastAt < 15 * 60 * 1000) {
      return Response.json(
        { error: "force_cooldown", retryAfterMinutes: 15, analysis: existing },
        { status: 429 }
      );
    }

    // Distributed lock so concurrent admin clicks don't double-call Gemini.
    const lock = await kv.set(LOCK_KEY, String(now), { nx: true, ex: 120 });
    if (lock === null || lock === false) {
      return Response.json(
        { error: "generation_in_progress", analysis: existing },
        { status: 429 }
      );
    }

    try {
      const history = await fetchBehavioralHistory();
      const prompt = buildAnalysisPrompt(clawdRow, history);
      const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
      const text = await callGemini(prompt, model);

      const analysis = {
        text,
        generatedAt: new Date().toISOString(),
        model,
        dataFingerprint: fingerprint,
        scoresLastUpdated: scoresLastUpdated || null,
        source: "gemini",
      };
      await kv.set(ANALYSIS_KEY, analysis);
      return Response.json({ analysis, cached: false });
    } finally {
      try { await kv.del(LOCK_KEY); } catch {}
    }
  } catch (err) {
    console.error("[clawd-analysis POST]", String(err));
    return Response.json({ error: String(err?.message || err) }, { status: 500 });
  }
}

async function fetchBehavioralHistory() {
  try {
    const duneRes = await fetch(
      `https://api.dune.com/api/v1/query/${HISTORY_QUERY_ID}/results`,
      {
        headers: { "X-Dune-API-Key": process.env.DUNE_API_KEY },
        next: { revalidate: 3600 },
      }
    );
    if (!duneRes.ok) return [];
    const json = await duneRes.json();
    return json.result?.rows || [];
  } catch {
    return [];
  }
}

async function callGemini(prompt, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": process.env.GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 900,
      },
    }),
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = json?.error?.message || `Gemini HTTP ${res.status}`;
    throw new Error(msg);
  }

  const text = json?.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .filter(Boolean)
    .join("\n")
    .trim();

  if (!text) throw new Error("Gemini returned empty text");
  return text.slice(0, 12000);
}
