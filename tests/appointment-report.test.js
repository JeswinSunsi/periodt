import test from "node:test";
import assert from "node:assert/strict";
import {
  appointmentReport,
  gridCycleCount,
} from "../src/lib/appointmentReport.js";
import {
  cycleHistory,
  cycleStats,
  healthNotes,
  nextPeriodRange,
  symptomForecast,
} from "../src/lib/insights.js";

const today = "2026-10-25";
const stateWith = (starts, logs = {}, profile = {}) => ({
  profile: {
    lastPeriod: starts.at(-1),
    cycleLength: 28,
    periodLength: 5,
    demo: false,
    regularity: "varies",
    usualSymptoms: ["Cramps"],
    ...profile,
  },
  periodHistory: starts.slice(0, -1).map((start) => ({ start, length: 5 })),
  logs,
});
const reportFor = (state) => {
  const cycles = cycleHistory(state, today);
  const stats = cycleStats(cycles);
  const range = nextPeriodRange(state.profile, stats, today);
  return appointmentReport({
    state,
    cycles,
    stats,
    range,
    notes: healthNotes(state, cycles, stats),
    forecast: symptomForecast(state, cycles, range, today),
    today,
  });
};

const starts = ["2026-07-01", "2026-07-29", "2026-08-26", "2026-09-23"];

test("the report covers the recorded span and check-ins", () => {
  const report = reportFor(
    stateWith(starts, {
      "2026-07-01": { flow: "Heavy", flowRecorded: true },
      "2026-08-10": { mood: "Good" },
      "2026-06-01": { mood: "Low" },
      "2026-08-11": { notes: "  " },
    }),
  );
  assert.equal(report.from, "2026-07-01");
  assert.equal(report.periodsRecorded, 4);
  assert.equal(report.checkins, 2);
  assert.deepEqual(report.current, { start: "2026-09-23", day: 33 });
  assert.deepEqual(report.setup, {
    cycleLength: 28,
    periodLength: 5,
    regularity: "Varies a little",
    usualSymptoms: ["Cramps"],
  });
});

test("journal notes never reach the report", () => {
  const report = reportFor(
    stateWith(starts, {
      "2026-08-10": { notes: "private words", mood: "Okay" },
    }),
  );
  assert.doesNotMatch(JSON.stringify(report), /private words/);
});

test("grid rows mark the period, flow, and check-ins by cycle day", () => {
  const report = reportFor(
    stateWith(starts, {
      "2026-09-23": { flow: "Heavy", flowRecorded: true },
      "2026-09-24": { flow: "Medium", flowRecorded: true },
      "2026-09-30": { mood: "Okay" },
    }),
  );
  const row = report.rows.at(-1);
  assert.equal(row.ongoing, true);
  assert.equal(row.length, 33);
  assert.deepEqual(
    row.days.slice(0, 7).map((d) => [d.flow, d.period, d.logged]),
    [
      ["Heavy", true, true],
      ["Medium", true, true],
      [null, true, false],
      [null, true, false],
      [null, true, false],
      [null, false, false],
      [null, false, false],
    ],
  );
  assert.equal(row.days[7].logged, true);
  assert.equal(report.gridDays, 33);
});

test("only the latest cycles are drawn day by day", () => {
  const many = Array.from({ length: 9 }, (_, i) =>
    new Date(Date.UTC(2026, 0, 1 + i * 28)).toISOString().slice(0, 10),
  );
  const report = reportFor(stateWith(many));
  assert.equal(report.rows.length, gridCycleCount);
  assert.equal(report.rows.at(-1).start, many.at(-1));
  assert.equal(report.history[0].start, many.at(-1));
});

test("symptoms show their share of cycles on each cycle day", () => {
  const report = reportFor(
    stateWith(starts, {
      "2026-07-01": { symptoms: ["Cramps"] },
      "2026-07-29": { symptoms: ["Cramps", "Headache"] },
      "2026-07-30": { symptoms: ["Cramps"] },
    }),
  );
  const [cramps, headache] = report.symptoms;
  assert.equal(cramps.name, "Cramps");
  assert.equal(cramps.days, 3);
  assert.equal(cramps.cycles, 2);
  assert.equal(cramps.of, 4);
  assert.equal(cramps.byDay[0], 0.5);
  assert.equal(cramps.byDay[1], 0.25);
  assert.equal(headache.days, 1);
});

test("range checks compare recorded numbers with typical ranges", () => {
  const report = reportFor(
    stateWith(["2026-06-01", "2026-06-21", "2026-07-31", "2026-08-28"]),
  );
  const [cycle, period, variation] = report.checks;
  assert.deepEqual(cycle.value, {
    min: 20,
    max: 40,
    average: 29,
    within: false,
  });
  assert.equal(period.value, null);
  assert.deepEqual(variation.value, {
    min: 0,
    max: 20,
    average: null,
    within: false,
  });
  assert.deepEqual(
    report.history.map((c) => c.flags),
    [[], [], ["Longer than typical"], ["Shorter than typical"]],
  );
});

test("months-long gaps are flagged as a likely missed start", () => {
  const report = reportFor(
    stateWith(["2026-03-01", "2026-07-01", "2026-07-29"]),
  );
  assert.deepEqual(report.history[2].flags, ["A start may be missing"]);
});

test("moods are counted in the order the check-in offers them", () => {
  const report = reportFor(
    stateWith(starts, {
      "2026-07-02": { mood: "Low" },
      "2026-07-03": { mood: "Glowing" },
      "2026-07-04": { mood: "Glowing" },
    }),
  );
  assert.deepEqual(
    report.moods.map((m) => [m.name, m.count]),
    [
      ["Low", 1],
      ["A little off", 0],
      ["Okay", 0],
      ["Good", 0],
      ["Glowing", 2],
    ],
  );
});
