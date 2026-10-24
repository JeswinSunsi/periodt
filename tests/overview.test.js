import test from "node:test";
import assert from "node:assert/strict";
import { checkinStreak, todayInCycle } from "../src/lib/overview.js";

const profile = { lastPeriod: "2026-10-01", cycleLength: 28 };
const figure = (today, periodLength = 5) => {
  const { label, value, unit, note } = todayInCycle(
    profile,
    periodLength,
    today,
  );
  return { label, value, unit, note };
};

test("during a period the figure is the period day", () => {
  assert.deepEqual(figure("2026-10-03"), {
    label: "Period day",
    value: 3,
    unit: "of 5",
    note: "Menstrual phase",
  });
});

test("otherwise the figure is today's cycle day and phase", () => {
  assert.deepEqual(figure("2026-10-06"), {
    label: "Cycle day",
    value: 6,
    unit: "of 28",
    note: "Follicular phase",
  });
  assert.equal(figure("2026-10-10").note, "Follicular phase · Fertile window");
  assert.equal(figure("2026-10-14").note, "Estimated ovulation");
  assert.equal(figure("2026-10-20").note, "Luteal phase");
  assert.equal(figure("2026-10-28").value, 28);
});

test("the last days of the cycle count down to the next period", () => {
  const at = (today) => todayInCycle(profile, 5, today);
  assert.equal(at("2026-10-24").countdown, "");
  assert.equal(at("2026-10-25").note, "Luteal phase");
  assert.equal(at("2026-10-25").countdown, "Next period in 4 days");
  assert.equal(at("2026-10-27").countdown, "Next period in 2 days");
  assert.equal(at("2026-10-28").countdown, "Next period tomorrow");
  assert.equal(at("2026-10-29").countdown, undefined);
});

test("a late period stays late without assuming a new cycle began", () => {
  assert.equal(figure("2026-10-29").note, "Period expected today");
  assert.equal(
    figure("2026-10-30").note,
    "Period 1 day late · log it when it starts",
  );
  const late = todayInCycle(profile, 5, "2026-11-01");
  assert.equal(late.phase, "Unconfirmed");
  assert.equal(late.value, 32);
  assert.equal(late.note, "Period 3 days late · log it when it starts");
  assert.equal(late.progress, 1);
});

test("progress places today within the cycle bar", () => {
  assert.equal(todayInCycle(profile, 5, "2026-10-01").progress, 0.5 / 28);
  assert.equal(todayInCycle(profile, 5, "2026-10-28").progress, 27.5 / 28);
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
