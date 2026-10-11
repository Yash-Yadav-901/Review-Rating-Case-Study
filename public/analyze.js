// Pure functions: theme tagging, stats, report, and a data-grounded chat. Works in browser and Node.
export const THEMES = [
  ["No-show / penalty", /no[- ]?show|marked absent|salary|deduct|penalt|fine\b|charged/],
  ["Booking / date bug", /wrong date|different date|booking.*(fail|error|not (work|allow))|can.?t book|unable to book|cancel.*(fail|not)|roster|2 step|two step/],
  ["Tracking / GPS / ETA", /\bgps\b|location|track|\beta\b|arriv|pick[- ]?up time|time.*chang|not updat/],
  ["Notifications", /notification|alert|reminder|not (received|notified)/],
  ["Login / OTP / registration", /\botp\b|login|log in|sign ?in|register|registration|verify|password/],
  ["Crash / performance", /crash|hang|freez|slow|lag|stuck|not (open|load)|force close|loading|bug/],
  ["UI / redesign", /\bui\b|update|redesign|interface|confus|design|layout|new version/],
  ["Driver / vehicle / safety", /driver|rude|unsafe|safety|\bsos\b|\bac\b|vehicle|route|detour/],
  ["Support / no response", /support|customer care|helpline|no response|complain|ticket|nobody/],
];
export function classify(text) {
  const t = (text || "").toLowerCase();
  for (const [name, re] of THEMES) if (re.test(t)) return name;
  return /good|great|nice|best|easy|excellent|helpful|smooth|useful|love/.test(t) ? "Other / positive" : "Other";
}
export const starsNeeded = (avg, n, target) => avg >= target ? 0 : Math.floor(((target - avg) * n) / (5 - target)) + 1;

export function analyze(data) {
  const revs = data.reviews.map(r => ({ ...r, theme: classify(r.text) }));
  const low = revs.filter(r => r.score <= 2);
  const count = (arr, f) => arr.reduce((m, r) => (m[f(r)] = (m[f(r)] || 0) + 1, m), {});
  const themes = Object.entries(count(low, r => r.theme)).sort((a, b) => b[1] - a[1]);
  const byV = {};
  revs.forEach(r => (byV[r.version || "?"] ||= []).push(r.score));
  const versions = Object.entries(byV).map(([v, s]) => ({ v, n: s.length, lowShare: s.filter(x => x <= 2).length / s.length }))
    .sort((a, b) => b.n - a.n).slice(0, 8);
  const n = revs.length;
  return {
    revs, low, themes, versions, n,
    avg: n ? revs.reduce((s, r) => s + r.score, 0) / n : 0,
    lowShare: n ? low.length / n : 0,
    replyRate: low.length ? low.filter(r => r.replied).length / low.length : 0,
    top: [...low].sort((a, b) => b.thumbs - a.thumbs).slice(0, 5),
  };
}

const pct = x => Math.round(x * 100) + "%";
export function report(data, a, target = 4.5) {
  const L = [];
  L.push(`# Play Store Pulse: ${data.title || data.appId}`, `Generated ${data.fetchedAt.slice(0, 10)} · window: last ${data.days} days · ${a.n} reviews`, "");
  L.push("## Snapshot",
    `- Store rating: **${data.score?.toFixed(2)}** (${data.ratings?.toLocaleString()} ratings), latest version ${data.version}`,
    `- Recent average (window): ${a.avg.toFixed(2)}`, `- 1-2 star share: ${pct(a.lowShare)}`,
    `- Reply rate on 1-2 star reviews: ${pct(a.replyRate)}`,
    `- 5-star ratings needed to reach ${target}: ${starsNeeded(data.score, data.ratings, target).toLocaleString()}`, "");
  L.push("## Why people rate low (themes in 1-2 star reviews)");
  a.themes.forEach(([k, v]) => L.push(`- ${k}: ${v} (${pct(v / a.low.length)})`));
  L.push("", "## Release check (low-star share by version)");
  a.versions.forEach(x => L.push(`- v${x.v}: ${x.n} reviews, ${pct(x.lowShare)} low-star`));
  L.push("", "## Most-endorsed complaints");
  a.top.forEach(r => L.push(`- [${r.theme}] (${r.thumbs} thumbs) ${r.text.slice(0, 160).replace(/\n/g, " ")}`));
  L.push("", "_Theme tags come from keyword rules; verify a sample by hand before acting._");
  return L.join("\n");
}

// Chat answers come only from the fetched data. No API key needed.
export function answer(q, data, a) {
  const s = q.toLowerCase();
  if (!a.n) return "Fetch reviews first.";
  if (/top|main|biggest|complain|problem|issue|why/.test(s) && a.themes.length)
    return "Top complaint themes in 1-2 star reviews:\n" + a.themes.slice(0, 4).map(([k, v]) => `• ${k}: ${pct(v / a.low.length)}`).join("\n");
  if (/rating|how are|summary|status/.test(s))
    return `Store rating ${data.score?.toFixed(2)} from ${data.ratings?.toLocaleString()} ratings. In the last ${data.days} days: ${a.n} reviews, average ${a.avg.toFixed(2)}, ${pct(a.lowShare)} are 1-2 star.`;
  if (/version|release|update|regress/.test(s)) {
    const w = [...a.versions].filter(x => x.n >= 5).sort((x, y) => y.lowShare - x.lowShare)[0];
    return w ? `Highest low-star share (versions with 5+ reviews): v${w.v} at ${pct(w.lowShare)} across ${w.n} reviews.` : "Not enough reviews per version yet.";
  }
  if (/repl|respon/.test(s)) return `Developer replied to ${pct(a.replyRate)} of 1-2 star reviews in this window.`;
  if (/reach|target|need|goal/.test(s)) return `About ${starsNeeded(data.score, data.ratings, 4.5).toLocaleString()} new 5-star ratings (and no new low ones) to reach 4.5.`;
  const words = s.replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(w => w.length > 3 && !/what|show|have|about|reviews|users|people|many/.test(w));
  if (words.length) {
    const hits = a.revs.filter(r => words.some(w => r.text.toLowerCase().includes(w)));
    if (hits.length) return `${hits.length} reviews mention "${words.join(" / ")}" (${pct(hits.filter(r => r.score <= 2).length / hits.length)} are 1-2 star). Example: "${hits[0].text.slice(0, 140)}"`;
  }
  return "Try: top complaints · how are our ratings · which version is worst · reply rate · stars needed · or a keyword like \"gps\".";
}