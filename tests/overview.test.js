import test from "node:test";
import assert from "node:assert/strict";
import {
  checkinStreak,
  cycleOutlook,
  relativeDays,
} from "../src/lib/overview.js";

const profile = { lastPeriod: "2026-10-01", cycleLength: 28 };
const outlook = (today, periodLength = 5) =>
  cycleOutlook(profile, periodLength, today);

test("status describes where today sits in the cycle", () => {
  assert.equal(outlook("2026-10-02").status, "Period day 2 of about 5.");
  assert.equal(outlook("2026-10-05").status, "Period day 5, likely the last.");
  assert.equal(
    outlook("2026-10-06").status,
    "About 23 days until your next period.",
  );
  assert.equal(
    outlook("2026-10-10").status,
    "You’re in your estimated fertile window.",
  );
  assert.equal(outlook("2026-10-14").status, "Estimated ovulation day.");
  assert.equal(
    outlook("2026-10-27").status,
    "Your period may start in 2 days.",
  );
  assert.equal(outlook("2026-10-28").status, "Your period may start in 1 day.");
});

test("a late period is named without assuming a new cycle began", () => {
  assert.equal(outlook("2026-10-29").status, "Your period may start today.");
  const late = outlook("2026-11-01");
  assert.equal(late.status, "Your period is 3 days later than estimated.");
  assert.equal(late.late, true);
  assert.equal(late.phase, "Unconfirmed");
  assert.deepEqual(late.milestones, []);
  assert.equal(late.progress, 1);
});

test("milestones pair the next fertility estimate with the next period", () => {
  assert.deepEqual(outlook("2026-10-03").milestones, [
    {
      name: "Fertile window",
      date: "2026-10-09",
      endDate: "2026-10-14",
      inDays: 6,
    },
    {
      name: "Next period",
      date: "2026-10-29",
      endDate: undefined,
      inDays: 26,
    },
  ]);
  assert.deepEqual(
    outlook("2026-10-11").milestones.map((m) => [m.name, m.inDays]),
    [
      ["Ovulation", 3],
      ["Next period", 18],
    ],
  );
  assert.deepEqual(
    outlook("2026-10-20").milestones.map((m) => m.name),
    ["Next period"],
  );
});

test("milestone dates cross month and year boundaries", () => {
  const winter = cycleOutlook(
    { lastPeriod: "2026-12-20", cycleLength: 30 },
    5,
    "2026-12-30",
  );
  assert.deepEqual(
    winter.milestones.map((m) => m.date),
    ["2027-01-04", "2027-01-19"],
  );
});

test("progress places today within the cycle bar", () => {
  assert.equal(outlook("2026-10-01").progress, 0.5 / 28);
  assert.equal(outlook("2026-10-28").progress, 27.5 / 28);
});

test("relative day labels read naturally", () => {
  assert.equal(relativeDays(0), "Today");
  assert.equal(relativeDays(1), "Tomorrow");
  assert.equal(relativeDays(4), "In 4 days");
});

test("check-in streak counts consecutive saved days ending today", () => {
  const logs = {
    "2026-10-22": { mood: "Okay" },
    "2026-10-23": { symptoms: ["Cramps"] },
    "2026-10-24": { mood: "Good" },
    "2026-10-20": { mood: "Low" },
    "2026-10-21": {},
  };
  assert.equal(checkinStreak(logs, "2026-10-24"), 3);
  assert.equal(checkinStreak(logs, "2026-10-25"), 0);
  assert.equal(
    checkinStreak(
      { "2026-12-31": { mood: "Okay" }, "2027-01-01": { mood: "Good" } },
      "2027-01-01",
    ),
    2,
  );
});
