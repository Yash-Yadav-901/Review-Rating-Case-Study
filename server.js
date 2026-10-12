// Tiny backend: the browser cannot call Google Play directly, so this does the fetching.
import express from "express";
import gplay from "google-play-scraper";
import Groq from "groq-sdk";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "public");

// ── Load .env manually (no extra dependency needed if dotenv absent) ──────────
if (existsSync(".env")) {
  const env = await readFile(".env", "utf8");
  for (const line of env.split("\n")) {
    const [k, ...v] = line.trim().split("=");
    if (k && !k.startsWith("#") && v.length) {
      process.env[k.trim()] = v.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

const app = express();
app.use(express.static(publicDir));
app.use(express.static(path.resolve(process.cwd(), "public")));
app.use(express.json());

// Explicit root route for Vercel serverless deployment
app.get("/", (req, res) => {
  const file = path.join(publicDir, "index.html");
  if (existsSync(file)) return res.sendFile(file);
  res.sendFile(path.resolve(process.cwd(), "public", "index.html"));
});

const APP_ID_OK = /^[A-Za-z0-9_.]{3,100}$/;   // basic input validation
const cache    = new Map();                     // 10-minute cache, be polite to Google
const TTL      = 10 * 60 * 1000;

// ── 1. FETCH REVIEWS ─────────────────────────────────────────────────────────
app.get("/api/fetch", async (req, res) => {
  const appId = String(req.query.app || "com.moveinsync.ets");
  const days  = Math.min(Math.max(parseInt(req.query.days) || 14, 1), 90);
  const cap   = 3000;
  if (!APP_ID_OK.test(appId)) return res.status(400).json({ error: "Invalid app id" });

  const key = `${appId}:${days}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return res.json(hit.data);

  try {
    const meta    = await gplay.app({ appId, lang: "en", country: "in" });
    const cutoff  = Date.now() - days * 864e5;
    const reviews = [];
    let token, done = false;
    while (!done && reviews.length < cap) {
      const r = await gplay.reviews({
        appId, lang: "en", country: "in", sort: gplay.sort.NEWEST,
        num: 200, paginate: true, nextPaginationToken: token,
      });
      for (const x of r.data) {
        if (new Date(x.date).getTime() < cutoff) { done = true; break; }
        reviews.push({
          score: x.score, text: x.text || "", at: new Date(x.date).toISOString(),
          version: x.version || null, replied: !!x.replyText, thumbs: x.thumbsUp || 0,
        });
      }
      token = r.nextPaginationToken;
      if (!token) break;
    }
    const data = {
      appId, title: meta.title, score: meta.score, ratings: meta.ratings,
      installs: meta.installs, version: meta.version,
      fetchedAt: new Date().toISOString(), days, reviews,
    };
    cache.set(key, { t: Date.now(), data });
    res.json(data);
  } catch (e) {
    res.status(502).json({ error: "Could not fetch from Google Play: " + e.message });
  }
});

// ── 2. HYBRID LLM CLASSIFY — Tier 2 for "Other" bucket ──────────────────────
//
// Architecture:
//   Tier 1 (client-side): Fast regex rules — classify() in analyze.js
//   Tier 2 (this route): Groq LLM — only runs on reviews that landed in "Other"
//   Fallback: If LLM fails (rate limit / missing key) → return { fallback: true }
//             and the UI silently keeps the regex classification. App NEVER crashes.
//
app.post("/api/llm-classify", async (req, res) => {
  const reviews = Array.isArray(req.body.reviews) ? req.body.reviews : [];
  if (!reviews.length) return res.json({ categories: [], fallback: false });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === "your_groq_api_key_here") {
    return res.json({
      categories: [], fallback: true,
      reason: "GROQ_API_KEY not configured — regex classification active",
    });
  }

  try {
    const groq = new Groq({ apiKey });

    // Send at most 50 reviews and trim text length to keep reasoning token budget well within bounds
    const sample = reviews.slice(0, 50).map((r, i) => `${i + 1}. [${r.score}★] ${(r.text || "").slice(0, 200)}`).join("\n");

    const prompt = `You are analyzing Google Play Store reviews for MoveInSync, a B2B employee commute app.

Below are low-star (1-2★) user reviews that could NOT be classified by existing keyword rules:

${sample}

Your task:
1. Identify up to 6 distinct, specific problem categories that emerge from these reviews.
2. Each category must be a real, actionable issue (not vague like "general dissatisfaction").
3. For each category, assign the review numbers that belong to it.
4. Respond ONLY with valid JSON — no markdown, no explanation.

Format:
{
  "categories": [
    {
      "name": "Short category label (max 5 words)",
      "description": "One sentence explaining the issue",
      "reviewIndices": [1, 4, 7],
      "count": 3
    }
  ]
}`;

    const completion = await groq.chat.completions.create({
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: "You are an analytical assistant that classifies user reviews and outputs strictly valid JSON. Keep reasoning concise and output only the JSON schema requested." },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 4096,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content || "{}";
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return res.json({ categories: [], fallback: true, reason: "LLM returned invalid JSON" });
    }

    // Map review indices back to the actual review texts
    const categories = (parsed.categories || []).map(cat => ({
      name: cat.name,
      description: cat.description,
      count: cat.count ?? (cat.reviewIndices?.length || 0),
      samples: (cat.reviewIndices || []).slice(0, 2).map(i => reviews[i - 1]?.text?.slice(0, 120) || ""),
    }));

    res.json({ categories, fallback: false, model: "openai/gpt-oss-120b", reviewsAnalysed: reviews.length });

  } catch (e) {
    // Graceful fallback — LLM failed (rate limit, bad key, network error)
    const reason = e.status === 429 ? "Groq rate limit hit — regex classification active"
      : e.status === 401           ? "Invalid GROQ_API_KEY — regex classification active"
      :                              `LLM unavailable (${e.message}) — regex classification active`;

    console.warn("[llm-classify] fallback:", reason);
    res.json({ categories: [], fallback: true, reason });
  }
});

// ── 3. HEALTH CHECK ───────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    llmConfigured: !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY !== "your_groq_api_key_here"),
    model: "openai/gpt-oss-120b",
  });
});

const port = process.env.PORT || 3000;
if (!process.env.VERCEL) {
  app.listen(port, () => console.log(`Pulse running at http://localhost:${port}`));
}

export default app;