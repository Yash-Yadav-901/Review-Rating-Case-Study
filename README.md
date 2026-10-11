# MoveInSync PlayStore Pulse

> Live Google Play review analyser for **MoveInSync** (`com.moveinsync.ets`) built for the Forward Deployed Engineer case study.

---

## 🔴 Top Finding

**The store shows 4.64★ — but the last 30 days average 3.78★.**
Version v12.19.0 has a 35% low-star share, up from 13% two versions ago.
The developer reply rate on 1-2★ reviews is 1%.

Full analysis → [`RECOMMENDATION.md`](RECOMMENDATION.md)

---

## How to Run

```bash
npm install
npm start          # → http://localhost:3000
```

Open the dashboard, click **Fetch reviews**, pick a date window, and read the numbers. Download the `.md` report or `.csv` for sharing.

To run the offline tests:
```bash
npm test
```

---

## Project Structure

```
moveinsync-playstore-pulse/
├── server.js               ← Express API: /api/fetch with pagination + 10-min cache
├── public/
│   ├── index.html          ← Dashboard UI (fetch, KPIs, themes, versions, chat, download)
│   └── analyze.js          ← Pure functions: classify(), analyze(), report(), answer()
├── test.mjs                ← 18 offline unit tests (node:test)
├── samples/
│   ├── pulse_2026-10-11.md ← Report from real run (237 reviews, 30-day window)
│   └── reviews.csv         ← Raw data from real run
├── screenshots/
│   └── dashboard.png
├── RECOMMENDATION.md       ← Main report (what to read and act on)
├── HOW_I_GOT_HERE.md       ← Method, tools, process
└── package.json
```

---

## Links

- [`RECOMMENDATION.md`](RECOMMENDATION.md) — Main analysis and action plan
- [`HOW_I_GOT_HERE.md`](HOW_I_GOT_HERE.md) — Method and tools
- [`samples/pulse_2026-10-11.md`](samples/pulse_2026-10-11.md) — Report downloaded from real run
- [`samples/reviews.csv`](samples/reviews.csv) — 237 real reviews from Google Play
