import test from "node:test";
import assert from "node:assert/strict";
import {
  periodWindows,
  periodDayType,
  isPeriodStart,
} from "../src/lib/periodHistory.js";

function state() {
  return {
    profile: { lastPeriod: "2026-10-01", periodLength: 5, demo: false },
    periodHistory: [{ start: "2026-09-01", length: 5 }],
    logs: {},
  };
}

test("only recorded starts and flow mark bleeding, never assumed period days", () => {
  const data = state();
  data.logs["2026-10-02"] = { flow: "Light" };
  assert.equal(periodDayType(data, "2026-10-01", "2026-10-02"), "period");
  assert.equal(periodDayType(data, "2026-10-02", "2026-10-02"), "period");
  assert.equal(periodDayType(data, "2026-10-03", "2026-10-02"), "");
  assert.equal(periodDayType(data, "2026-10-03", "2026-10-05"), "");
  assert.equal(periodDayType(data, "2026-09-02", "2026-10-05"), "");
});

test("explicit None ends one period early without changing the usual duration", () => {
  const data = state();
  data.logs["2026-10-03"] = { flow: "None", flowRecorded: true };
  const periods = periodWindows(data, "2026-10-03");
  assert.equal(periods[1].length, 2);
  assert.equal(periods[1].end, "2026-10-03");
  assert.equal(periods[0].length, 5);
  assert.equal(data.profile.periodLength, 5);
  for (const day of ["03", "04", "05"])
    assert.equal(periodDayType(data, `2026-10-${day}`, "2026-10-03"), "");
  assert.equal(isPeriodStart(data, "2026-10-01"), true);
  assert.equal(
    periodWindows(JSON.parse(JSON.stringify(data)), "2026-10-03")[1].length,
    2,
  );
});

test("legacy default None, mood-only entries, and future notes do not end a period", () => {
  const data = state();
  data.logs["2026-10-02"] = { flow: "None", mood: "Good" };
  data.logs["2026-10-03"] = { flow: "None", flowRecorded: false };
  data.logs["2026-10-04"] = { flow: "None", flowRecorded: true };
  assert.equal(periodWindows(data, "2026-10-03")[1].length, 5);
});

test("editing or deleting an end updates recorded flow without assuming other bleeding", () => {
  const data = state();
  data.logs["2026-10-03"] = { flow: "None", flowRecorded: true };
  assert.equal(periodDayType(data, "2026-10-04", "2026-10-03"), "");
  data.logs["2026-10-03"].flow = "Light";
  assert.equal(periodDayType(data, "2026-10-03", "2026-10-03"), "period");
  assert.equal(periodDayType(data, "2026-10-04", "2026-10-03"), "");
  delete data.logs["2026-10-03"];
  assert.equal(periodWindows(data, "2026-10-03")[1].length, 5);
});

test("historical ends remain attached to the historical period", () => {
  const data = state();
  data.logs["2026-09-03"] = { flow: "None", flowRecorded: true };
  data.logs["2026-09-30"] = { flow: "None", flowRecorded: true };
  const periods = periodWindows(data, "2026-10-04");
  assert.equal(periods[0].length, 2);
  assert.equal(periods[1].length, 5);
});

test("start dates take precedence over a contradictory None value", () => {
  const data = state();
  data.logs["2026-10-01"] = {
    flow: "None",
    flowRecorded: true,
    periodStart: true,
  };
  assert.equal(periodDayType(data, "2026-10-01", "2026-10-03"), "period");
  assert.equal(periodWindows(data, "2026-10-03")[1].length, 5);
});

test("a later recorded flow remains visible after an early end", () => {
  const data = state();
  data.logs["2026-10-03"] = { flow: "None", flowRecorded: true };
  data.logs["2026-10-04"] = { flow: "Spotting", flowRecorded: true };
  assert.equal(periodDayType(data, "2026-10-04", "2026-10-04"), "period");
});

test("sample cycles never mark bleeding and period-end arithmetic crosses months", () => {
  const data = state();
  data.profile.demo = true;
  assert.equal(periodDayType(data, "2026-10-01", "2026-10-03"), "");
  data.profile = { lastPeriod: "2024-02-28", periodLength: 5, demo: false };
  data.periodHistory = [];
  data.logs["2024-03-01"] = { flow: "None", flowRecorded: true };
  assert.equal(periodWindows(data, "2024-03-01")[0].length, 2);
});

test("an explicit period-end checkbox also records an end after the estimated window", () => {
  const data = state();
  data.logs["2026-10-07"] = {
    periodEnd: true,
    flow: "None",
    flowRecorded: true,
  };
  const period = periodWindows(data, "2026-10-07")[1];
  assert.equal(period.end, "2026-10-07");
  assert.equal(period.length, 5);
  assert.equal(data.profile.periodLength, 5);
  data.logs["2026-10-07"].periodEnd = false;
  data.logs["2026-10-07"].flowRecorded = false;
  assert.equal(periodWindows(data, "2026-10-07")[1].end, undefined);
});
