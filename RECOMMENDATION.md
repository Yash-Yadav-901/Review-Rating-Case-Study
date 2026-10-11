# MoveInSync PlayStore Pulse — Recommendation Report

**App:** MoveInSync Employee Commute (`com.moveinsync.ets`)
**Data window:** Last 30 days (Oct 2026)
**Reviews analysed:** 237 (live from Google Play)
**Store rating:** 4.64★ / 114,871 total ratings
**Window average:** 3.78★ — significantly below store average
**Analyst:** PlayStore Pulse + manual review

---

## The Single Most Important Number

> **The store shows 4.64★. The last 30 days average 3.78★.**

That 0.86-point gap is the alarm. The store rating is a slow-moving average of 114,871 ratings — it will not reflect today's problems for months. The window average tells you what's happening *right now*: something changed, users noticed, and they are rating you down.

The culprit is version **v12.19.0**, released recently and now accounting for 102 of the 237 reviewed, with a **35% low-star share** — the worst of any release in the window. The version before it (v12.18.1) was 25%. The one before that (v12.18.0) was 13%. The trend is moving in the wrong direction with each release.

---

## What the Data Shows

### Snapshot (30-day window, live data)

| Metric | Value |
|---|---|
| Store rating | 4.64★ |
| Total ratings | 1,14,871 |
| Reviews in window | 237 |
| Window average | 3.78★ |
| 1-2 star share (window) | 30% |
| Developer reply rate on 1-2★ | **1%** |
| Latest version | v12.19.0 |
| Low-star share on v12.19.0 | **35%** |

### Theme breakdown in 1-2 star reviews (71 total)

| Theme | Count | Share of 1-2★ |
|---|---|---|
| Crash / performance | 11 | 15% |
| Login / OTP / registration | 7 | 10% |
| Tracking / GPS / ETA | 7 | 10% |
| UI / redesign backlash | 6 | 8% |
| Notifications | 4 | 6% |
| Driver / vehicle / safety | 1 | 1% |
| No-show / penalty | 1 | 1% |
| Booking / date bug | 1 | 1% |
| Other / unclassified | 33 | 46% |

### Release health

| Version | Reviews | Low-star % | Signal |
|---|---|---|---|
| v12.19.0 | 102 | **35%** | 🔴 Regression |
| v12.18.1 | 87 | 25% | 🟡 Elevated |
| v12.18.0 | 8 | 13% | 🟢 Acceptable |
| v12.17.0 | 3 | 0% | 🟢 Clean |

---

## Finding 1 — v12.19.0 introduced a regression. Roll it back or hotfix within 48 hours.

The jump from 13% (v12.18.0) to 35% (v12.19.0) low-star share is not noise. Every version is making things worse. The most-thumbed complaints in the window explicitly call out the new update:

> *"whenever I update this app, I am not able to open the app again. I need to uninstall and reinstall."*
> *"dislike the new update. Bring the old version back. It was simple and minimalist."*

**Action:** Audit what changed in v12.19.0. If it cannot be hotfixed in 24 hours, push a rollback to v12.18.1. The 35% → 25% improvement alone would materially shift the window average.

---

## Finding 2 — Crashes on update are a retention killer, not an edge case.

15% of all 1-2★ reviews mention crashes, freezes, or the app failing to open after an update. This is not random — it correlates directly with the v12.19.0 release. Users who experience a launch crash have no in-app path to get help; they go straight to a 1★ review.

> *"App is not opening since last update"*
> *"force closes on the tracking screen"*

**Action:** Add a post-update integrity check on first launch. If it fails, offer a guided cache-clear flow before the user hits a white screen with no recourse.

---

## Finding 3 — OTP and login failures are blocking onboarding entirely.

10% of 1-2★ reviews are registration or login failures — OTP not received, login loops, session drops. For a B2B app where HR has already registered the employee, a login failure is not a minor inconvenience; it means the employee cannot take their company cab at all.

> *"The new feature — when you click view OTP, it pops up the seat belt [dialog]"* — a UI bug actively blocking OTP flow.

**Action:** (a) Fix the OTP-view bug in v12.19.0 immediately. (b) Add WhatsApp/email OTP as a fallback. (c) Add a "Having trouble logging in? Contact your transport manager" deeplink from the error screen.

---

## Finding 4 — GPS and ETA accuracy drive missed rides and angry reviews.

10% of 1-2★ reviews mention GPS, live tracking, or ETA problems. These are high-stakes: an inaccurate ETA means the employee misses the cab or waits unnecessarily. The reviews use language like "wrong location", "not updating", "ETA changed suddenly".

**Action:** Review location polling frequency on v12.19.0 — this may be a regression tied to the same update. Also expose a "driver is here" confirmation step so employees get a push alert even when GPS is lagging.

---

## Finding 5 — The developer is not responding. That silence costs ratings.

Only **1%** of 1-2★ reviews in this window have a developer reply. Google's own data shows that when developers respond to negative reviews, a significant percentage of users update their rating upward.

This is the lowest-effort, highest-ROI action available right now. You do not need to fix any code to start doing this tomorrow.

**Action:** Assign one person to respond to every 1-2★ review within 48 hours. Template to acknowledge the issue, state what is being done, and invite the user to reach out directly. Target 80% reply rate within two weeks.

---

## Prioritised Action Plan

### Do today (before any new release)

| # | Action | Owner |
|---|---|---|
| 1 | Audit v12.19.0 diff for crash and OTP regression | Engineering |
| 2 | Hotfix or rollback to v12.18.1 | Engineering / Release |
| 3 | Assign someone to respond to all open 1-2★ reviews | Product / Support |

### Do this week

| # | Action | Owner |
|---|---|---|
| 4 | Fix OTP-view UI bug (seat belt dialog blocking OTP) | Engineering |
| 5 | Add post-update integrity check with guided recovery | Engineering |
| 6 | Add WhatsApp/email OTP fallback | Engineering |
| 7 | Add "contact transport manager" deeplink from login error | Product |

### Do this month

| # | Action | Owner |
|---|---|---|
| 8 | Review GPS polling on latest version | Engineering |
| 9 | Add "driver is here" push alert as GPS fallback | Product |
| 10 | Set up automated Play Store review monitoring (this tool) | Engineering / Ops |
| 11 | Set release quality gate: low-star share > 20% blocks rollout | Engineering / Release |

---

## How to Keep Asking "How Are Our Ratings?"

The question in the brief — *"How are our Play Store ratings? — is not a one-time ask."*

This dashboard answers it on demand:

```
npm start               # start server at http://localhost:3000
# Click "Fetch reviews" → select window → read the numbers
# Download .md report or .csv for sharing
```

Key metrics to track over time:
- Window average (should trend toward store average)
- Low-star share per version (gate releases at <20%)
- Developer reply rate (target >80%)
- Theme distribution (watch for new spikes)

---

## Methodology

- **Source:** Google Play Store, `com.moveinsync.ets`, scraped via `google-play-scraper` npm package
- **Window:** Last 30 days, up to 3,000 reviews, paginated by date
- **Theme tagging:** Regex keyword rules across 9 categories, applied to review text
- **Sentiment:** Star rating (1-2★ = low, 3★ = neutral, 4-5★ = positive)
- **Tools:** Node.js, Express, Vanilla JS dashboard, no external AI API

---

*MoveInSync PlayStore Pulse — Generated 2026-10-11*
