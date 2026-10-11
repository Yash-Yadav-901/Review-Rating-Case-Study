# HOW I GOT HERE — Method & Tools

## Objective

Work out why MoveInSync's Play Store ratings are where they are, and produce specific enough recommendations that a product or engineering team could act on them the next day.

---

## Things to Know → How I Addressed Each

**"We haven't prepared any data for you. Everything you need is publicly available."**
All data comes from the Google Play Store public listing for `com.moveinsync.ets`. No internal data, no API keys, no credentials. The scraper (`google-play-scraper` npm package) reads the same pages a browser would.

**"Use any tools you like, AI included."**
I used an AI coding assistant (Google Gemini / Antigravity) to help scaffold the project, write and iterate on code, and structure the analysis. All Play Store data and findings are real — the AI helped me build the tool, not make up the numbers.

**"How are our Play Store ratings? — this is a question we'll keep asking."**
That's why this is a dashboard, not a spreadsheet. Run `npm start`, open `http://localhost:3000`, pick a date window, click Fetch. You get live numbers every time. The `/api/fetch` endpoint also caches for 10 minutes so repeat queries are instant.

**"Reasonable assumptions, clearly stated, are fine."**
See the Assumptions section at the bottom of this file.

---

## Tools Used

| Tool | What I used it for |
|---|---|
| `google-play-scraper` (npm) | Pull reviews + app metadata from Google Play public pages |
| `express` (npm) | Backend server to proxy requests (browser can't call Play Store directly) |
| Node.js v22 | Runtime |
| Vanilla HTML / CSS / JS | Dashboard UI — no framework, no build step |
| `node:test` | Built-in test runner for 18 offline unit tests |
| Google Gemini AI (Antigravity) | Coding assistant — helped write and iterate on server, dashboard, and analysis code |

---

## Step-by-Step

### 1. Found the app

Package ID: `com.moveinsync.ets` — the primary employee-facing app on Google Play.

### 2. Built the data pipeline

`server.js` — Express server that:
- Calls `gplay.app()` for metadata (store rating, total ratings, installs, version)
- Calls `gplay.reviews()` in a paginated loop, date-filtered to the chosen window (7 / 14 / 30 / 90 days, up to 3,000 reviews)
- Caches results 10 minutes per app+window combination

### 3. Fetched real data

30-day window, `com.moveinsync.ets` → **237 reviews**.

| Metric | Value |
|---|---|
| Store rating | 4.64★ (114,871 total ratings) |
| 30-day window avg | **3.78★** |
| Low-star share (1-2★) | **30%** |
| Developer reply rate on 1-2★ | **1%** |

The 0.86-point gap between store rating and window average is the most important number. The store rating is a slow-moving average of 114,871 ratings. The window average tells you what users think *right now*.

### 4. Version analysis — found the regression

Grouped reviews by version field:

| Version | Reviews | Low-star % | Signal |
|---|---|---|---|
| v12.19.0 (latest) | 102 | **35%** | 🔴 Regression |
| v12.18.1 | 87 | 25% | 🟡 Elevated |
| v12.18.0 | 8 | 13% | 🟢 Acceptable |
| v12.17.0 | 3 | 0% | 🟢 Clean |

Each new release has a higher low-star share than the last. v12.19.0 is the primary driver of the declining window average.

### 5. Theme tagging

Regex keyword classifier across 9 themes applied to every review text. In the 71 low-star reviews:

- Crash / performance: **15%**
- Login / OTP / registration: **10%** ← OTP-view triggers seatbelt dialog (bug)
- Tracking / GPS / ETA: **10%**
- UI / redesign backlash: **8%**
- Notifications: **6%**

### 6. Read the actual reviews

The top-thumbed complaints weren't vague — they named specific bugs:
> *"whenever I update this app I am not able to open the app again. I need to uninstall and reinstall."*
> *"when you click view OTP, it pops up the seat belt [dialog]"* — actively blocking login.

These are reproducible, version-specific bugs, not general dissatisfaction.

### 7. Developer reply gap

1 out of 71 low-star reviews had a developer reply. That is **1%**. Google's own data shows responding to negative reviews drives a meaningful share of users to update their rating. This requires zero engineering — just someone reading and responding.

### 8. Built the dashboard

`public/index.html` + `public/analyze.js`:
- KPI cards, theme bars, version table, top complaints
- Local chat interface (no API key) that answers questions from the loaded data
- Export to `.md` report and `.csv`

### 9. Wrote the tests

18 unit tests in `test.mjs` for `classify()`, `starsNeeded()`, and `analyze()`. All pass offline.

---

## Assumptions

- **Date filtering** uses the `date` field from `google-play-scraper`, which is when the review was posted (not last edited).
- **Sentiment** = star rating. A review that says "great app but crashes" counts as negative if rated 1-2★.
- **Version field** is not always populated by reviewers — 27 of 237 reviews had `version: null`, grouped as `v?`.
- **Theme tagging** is regex-based. The "Other" bucket (46% of low-star) contains reviews that didn't match any keyword — worth a manual read for hidden signals.
- **3,000 review cap** per fetch to avoid rate-limiting Google's servers.
- The scraper uses Google Play's public API. It is unofficial and could break if Google changes the page structure.

---

## What I Would Do Next (Given More Time)

- Store daily snapshots to SQLite; plot window-average trend week over week
- Slack/email alert if window average drops more than 0.2 points from prior week
- Auto-flag releases where low-star share exceeds 20% after 50+ reviews
- Cluster the "Other" bucket with lightweight NLP to surface hidden themes

---

*MoveInSync PlayStore Pulse — 2026-10-11*
