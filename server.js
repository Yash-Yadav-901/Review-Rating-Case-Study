// Tiny backend: the browser cannot call Google Play directly, so this does the fetching.
import express from "express";
import gplay from "google-play-scraper";

const app = express();
app.use(express.static("public"));

const APP_ID_OK = /^[A-Za-z0-9_.]{3,100}$/;   // basic input validation
const cache = new Map();                       // 10-minute cache, be polite to Google
const TTL = 10 * 60 * 1000;

app.get("/api/fetch", async (req, res) => {
  const appId = String(req.query.app || "com.moveinsync.ets");
  const days = Math.min(Math.max(parseInt(req.query.days) || 14, 1), 90);
  const cap = 3000;
  if (!APP_ID_OK.test(appId)) return res.status(400).json({ error: "Invalid app id" });

  const key = `${appId}:${days}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.t < TTL) return res.json(hit.data);

  try {
    const meta = await gplay.app({ appId, lang: "en", country: "in" });
    const cutoff = Date.now() - days * 864e5;
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

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Pulse running at http://localhost:${port}`));