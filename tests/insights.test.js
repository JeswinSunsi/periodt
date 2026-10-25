import test from "node:test";
import assert from "node:assert/strict";
import {
  cycleHistory,
  cycleStats,
  healthNotes,
  insightsSummary,
  dateRangeLabel,
  forecastTiming,
  nextPeriodRange,
  symptomForecast,
  regularityLabel,
  settingSuggestions,
} from "../src/lib/insights.js";

const stateWith = (starts, logs = {}, profile = {}) => ({
  profile: {
    lastPeriod: starts.at(-1),
    cycleLength: 28,
    periodLength: 5,
    demo: false,
    ...profile,
  },
  periodHistory: starts.slice(0, -1).map((start) => ({ start, length: 5 })),
  logs,
});
const today = "2026-10-25";

test("cycles run between recorded starts and the latest is ongoing", () => {
  const cycles = cycleHistory(
    stateWith(["2026-08-01", "2026-08-31", "2026-09-30"]),
    today,
  );
  assert.deepEqual(
    cycles.map(({ start, length, day }) => ({ start, length, day })),
    [
      { start: "2026-08-01", length: 30, day: null },
      { start: "2026-08-31", length: 30, day: null },
      { start: "2026-09-30", length: null, day: 26 },
    ],
  );
});

test("a sample profile has no recorded cycles", () => {
  const state = stateWith(["2026-10-14"], {}, { demo: true });
  assert.deepEqual(cycleHistory(state, today), []);
});

test("period length is only measured from a logged end or longer flow", () => {
  const state = stateWith(["2026-08-01", "2026-08-31", "2026-09-30"], {
    "2026-08-05": { flow: "None", flowRecorded: true },
    "2026-08-31": { flow: "Heavy", flowRecorded: true },
    ...Object.fromEntries(
      [1, 2, 3, 4, 5, 6, 7, 8].map((d) => [
        `2026-09-0${d}`,
        { flow: "Light", flowRecorded: true },
      ]),
    ),
  });
  assert.deepEqual(
    cycleHistory(state, today).map((c) => c.periodLength),
    [4, 9, null],
  );
});

test("stats use completed cycles and skip likely missed logs", () => {
  const cycles = cycleHistory(
    stateWith([
      "2026-03-01",
      "2026-07-01",
      "2026-07-27",
      "2026-08-28",
      "2026-09-26",
    ]),
    today,
  );
  assert.equal(cycles[0].gap, true);
  const stats = cycleStats(cycles);
  assert.equal(stats.cycleCount, 3);
  assert.equal(stats.averageCycle, 29);
  assert.equal(stats.shortest, 26);
  assert.equal(stats.longest, 32);
  assert.equal(stats.variation, 6);
  assert.equal(regularityLabel(stats.variation), "Fairly regular");
  assert.equal(regularityLabel(12), "Varies more than typical");
});

test("settings are only suggested once two cycles disagree with them", () => {
  const profile = { cycleLength: 28, periodLength: 5 };
  assert.deepEqual(
    settingSuggestions(profile, {
      cycleCount: 1,
      averageCycle: 33,
      periodCount: 0,
    }),
    [],
  );
  assert.deepEqual(
    settingSuggestions(profile, {
      cycleCount: 3,
      averageCycle: 31,
      periodCount: 2,
      averagePeriod: 4,
    }).map(({ field, value }) => [field, value]),
    [
      ["cycleLength", 31],
      ["periodLength", 4],
    ],
  );
  assert.deepEqual(
    settingSuggestions(profile, {
      cycleCount: 3,
      averageCycle: 29,
      periodCount: 2,
      averagePeriod: 5,
    }),
    [],
  );
});

test("health notes flag atypical recorded cycles", () => {
  const state = stateWith(
    ["2026-05-01", "2026-05-21", "2026-07-02", "2026-08-01", "2026-09-01"],
    {
      "2026-08-15": { flow: "Spotting", flowRecorded: true },
      "2026-09-12": { flow: "Spotting", flowRecorded: true },
    },
  );
  const cycles = cycleHistory(state, today);
  const notes = healthNotes(state, cycles, cycleStats(cycles));
  assert.deepEqual(notes, [
    "One recent cycle was shorter than 24 days.",
    "One recent cycle was longer than 38 days.",
    "Your cycle length has varied by 22 days. Up to 7–9 days is typical.",
    "You logged bleeding between periods in more than one cycle.",
  ]);
});

test("spotting just before a period or continuing it is not flagged", () => {
  const state = stateWith(["2026-08-01", "2026-08-30", "2026-09-28"], {
    "2026-08-06": { flow: "Light", flowRecorded: true },
    "2026-08-07": { flow: "Spotting", flowRecorded: true },
    "2026-08-29": { flow: "Spotting", flowRecorded: true },
    "2026-09-27": { flow: "Spotting", flowRecorded: true },
  });
  const cycles = cycleHistory(state, today);
  assert.deepEqual(healthNotes(state, cycles, cycleStats(cycles)), []);
});

test("the summary lists recent cycles and notes", () => {
  const state = stateWith(["2026-08-01", "2026-08-31", "2026-09-30"]);
  const cycles = cycleHistory(state, today);
  const text = insightsSummary({
    cycles,
    stats: cycleStats(cycles),
    notes: ["Example note."],
    forecast: [
      { name: "Bloating", anchor: "next", offset: 4, run: 3, cycles: 2, of: 2 },
    ],
  });
  assert.match(text, /Last period started: Sep 30, 2026/);
  assert.match(text, /Average cycle: 30 days \(30–30, last 2 cycles\)/);
  assert.match(text, /- Aug 31, 2026: 30 days/);
  assert.match(
    text,
    /- Bloating: About 4 days before your period \(2 of 2 cycles\)/,
  );
  assert.match(text, /Worth discussing:\n- Example note\./);
});

const regular = [
  "2026-06-01",
  "2026-06-29",
  "2026-07-28",
  "2026-08-25",
  "2026-09-24",
];

test("the next period is a range from the shortest and longest cycles", () => {
  const state = stateWith(regular);
  const stats = cycleStats(cycleHistory(state, today));
  const range = nextPeriodRange(state.profile, stats, today);
  assert.deepEqual(range, {
    likely: "2026-10-22",
    earliest: "2026-10-21",
    latest: "2026-10-24",
    before: 1,
    after: 2,
    measured: true,
    lateBy: 1,
  });
});

test("before two cycles the range is a rough few days, wider if cycles vary", () => {
  const stats = cycleStats([]);
  const profile = { lastPeriod: "2026-10-10", cycleLength: 28 };
  const rough = nextPeriodRange(profile, stats, today);
  assert.equal(rough.earliest, "2026-11-04");
  assert.equal(rough.latest, "2026-11-10");
  assert.equal(rough.measured, false);
  const varies = nextPeriodRange(
    { ...profile, regularity: "irregular" },
    stats,
    today,
  );
  assert.equal(varies.earliest, "2026-11-02");
});

test("recurring symptoms are dated from the anchor they follow", () => {
  const logs = {};
  const add = (date, symptoms, mood) => (logs[date] = { symptoms, mood });
  // Cramps on days 1–2; bloating starts four days before each period.
  for (const [start, next] of [
    ["2026-07-01", "2026-07-29"],
    ["2026-07-29", "2026-08-29"],
    ["2026-08-29", "2026-09-25"],
  ]) {
    const at = (n) =>
      new Date(Date.parse(`${start}T00:00:00Z`) + n * 864e5)
        .toISOString()
        .slice(0, 10);
    const before = (n) =>
      new Date(Date.parse(`${next}T00:00:00Z`) - n * 864e5)
        .toISOString()
        .slice(0, 10);
    add(at(0), ["Cramps"], "Low");
    add(at(1), ["Cramps"], "Low");
    add(at(6), [], "Good");
    add(before(4), ["Bloating"], "Low");
    add(before(3), ["Bloating"], "Low");
  }
  add("2026-08-10", ["Headache"]);
  const state = stateWith(
    ["2026-07-01", "2026-07-29", "2026-08-29", "2026-09-25"],
    logs,
  );
  const cycles = cycleHistory(state, "2026-10-12");
  const range = nextPeriodRange(
    state.profile,
    cycleStats(cycles),
    "2026-10-12",
  );
  assert.equal(range.likely, "2026-10-23");
  const forecast = symptomForecast(state, cycles, range, "2026-10-12");
  assert.deepEqual(
    forecast.map(({ name, anchor, start, end, cycles }) => ({
      name,
      anchor,
      start,
      end,
      cycles,
    })),
    [
      {
        name: "Lower mood",
        anchor: "next",
        start: "2026-10-18",
        end: "2026-10-22",
        cycles: 3,
      },
      {
        name: "Bloating",
        anchor: "next",
        start: "2026-10-19",
        end: "2026-10-20",
        cycles: 3,
      },
      {
        name: "Cramps",
        anchor: "start",
        start: "2026-10-23",
        end: "2026-10-24",
        cycles: 3,
      },
    ],
  );
  assert.equal(forecastTiming(forecast[1]), "About 4 days before your period");
  assert.equal(forecastTiming(forecast[2]), "Days 1–2 of your cycle");
});

test("date ranges read naturally within and across months", () => {
  assert.equal(dateRangeLabel("2026-10-27", "2026-10-31"), "Oct 27–31");
  assert.equal(dateRangeLabel("2026-10-30", "2026-11-02"), "Oct 30 – Nov 2");
  assert.equal(dateRangeLabel("2026-10-30", "2026-10-30"), "Oct 30");
});
