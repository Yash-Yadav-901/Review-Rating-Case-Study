// test.mjs – offline unit tests for analyze.js
// Run: node test.mjs
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { classify, analyze, starsNeeded } from "./public/analyze.js";

describe("classify()", () => {
  it("detects no-show theme", () => {
    assert.equal(classify("I was marked absent even though I was there. Salary got deducted."), "No-show / penalty");
  });
  it("detects booking / date bug", () => {
    assert.equal(classify("Booked for tomorrow but the system shows wrong date"), "Booking / date bug");
  });
  it("detects tracking / GPS / ETA", () => {
    assert.equal(classify("The GPS is completely off. ETA was wrong by 30 minutes."), "Tracking / GPS / ETA");
  });
  it("detects login / OTP theme", () => {
    assert.equal(classify("OTP never comes. Cannot sign in."), "Login / OTP / registration");
  });
  it("detects crash / performance", () => {
    assert.equal(classify("App crashes every morning. Force close on launch."), "Crash / performance");
  });
  it("detects driver / vehicle / safety", () => {
    assert.equal(classify("Driver was rude and took a detour."), "Driver / vehicle / safety");
  });
  it("falls through to Other / positive for praise", () => {
    const r = classify("Great app, very smooth experience, love it!");
    assert.equal(r, "Other / positive");
  });
  it("handles empty string", () => {
    const r = classify("");
    assert.ok(r === "Other" || r === "Other / positive");
  });
  it("handles undefined", () => {
    const r = classify(undefined);
    assert.ok(r === "Other" || r === "Other / positive");
  });
});

describe("starsNeeded()", () => {
  it("returns 0 when already at or above target", () => {
    assert.equal(starsNeeded(4.5, 100000, 4.5), 0);
    assert.equal(starsNeeded(4.6, 100000, 4.5), 0);
  });
  it("returns a positive integer when below target", () => {
    const n = starsNeeded(4.3, 100000, 4.5);
    assert.ok(n > 0, `expected > 0, got ${n}`);
    assert.ok(Number.isInteger(n));
  });
  it("requires more 5-stars to move a large base", () => {
    const small = starsNeeded(4.3, 1000, 4.5);
    const large = starsNeeded(4.3, 1000000, 4.5);
    assert.ok(large > small, `large(${large}) should > small(${small})`);
  });
});

describe("analyze()", () => {
  const fake = {
    reviews: [
      { score: 1, text: "App crashes every morning", at: new Date().toISOString(), version: "3.2.1", replied: false, thumbs: 5 },
      { score: 2, text: "GPS is completely broken", at: new Date().toISOString(), version: "3.2.1", replied: true, thumbs: 3 },
      { score: 5, text: "Great app love it", at: new Date().toISOString(), version: "3.2.0", replied: false, thumbs: 0 },
      { score: 1, text: "Marked absent salary deducted", at: new Date().toISOString(), version: "3.2.1", replied: false, thumbs: 10 },
    ],
    days: 14,
  };

  it("returns correct total", () => {
    const a = analyze(fake);
    assert.equal(a.n, 4);
  });
  it("low contains only 1-2 star reviews", () => {
    const a = analyze(fake);
    assert.equal(a.low.length, 3);
    assert.ok(a.low.every(r => r.score <= 2));
  });
  it("calculates correct avg", () => {
    const a = analyze(fake);
    const expected = (1 + 2 + 5 + 1) / 4;
    assert.ok(Math.abs(a.avg - expected) < 0.001);
  });
  it("themes array is sorted descending", () => {
    const a = analyze(fake);
    for (let i = 1; i < a.themes.length; i++)
      assert.ok(a.themes[i - 1][1] >= a.themes[i][1]);
  });
  it("top is sorted by thumbs descending", () => {
    const a = analyze(fake);
    for (let i = 1; i < a.top.length; i++)
      assert.ok(a.top[i - 1].thumbs >= a.top[i].thumbs);
  });
  it("replyRate reflects only low-star replies", () => {
    const a = analyze(fake);
    // 1 of 3 low-star reviews has replied=true
    assert.ok(Math.abs(a.replyRate - 1 / 3) < 0.001);
  });
});
