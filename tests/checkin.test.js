import test from "node:test";
import assert from "node:assert/strict";
import { hasCheckin } from "../src/lib/checkin.js";
import { removePeriodStart } from "../src/lib/periodHistory.js";

const emptyLog = () => ({
  mood: "",
  flow: "None",
  flowRecorded: false,
  symptoms: [],
  notes: "",
  periodStart: false,
  periodEnd: false,
});

test("empty entries and legacy unrecorded flow do not produce a check-in marker", () => {
  for (const log of [
    undefined,
    {},
    emptyLog(),
    { flow: "None" },
    { notes: "  \n" },
  ]) {
    assert.equal(hasCheckin(log), false);
  }
});

test("each recorded detail, including explicit no bleeding, keeps the check-in marker", () => {
  for (const detail of [
    { mood: "Good" },
    { flow: "Spotting" },
    { flow: "None", flowRecorded: true },
    { symptoms: ["Bloating"] },
    { notes: "A note" },
    { periodStart: true },
    { periodEnd: true },
  ]) {
    assert.equal(hasCheckin({ ...emptyLog(), ...detail }), true);
  }
});

test("removing a start-only entry clears its marker, including after reload; undo restores it", () => {
  const state = {
    profile: { lastPeriod: "2026-10-09", demo: false },
    periodHistory: [{ start: "2026-10-02", length: 5 }],
    logs: { "2026-10-02": { ...emptyLog(), periodStart: true } },
  };
  const log = state.logs["2026-10-02"];
  assert.equal(hasCheckin(log), true);
  removePeriodStart(state, "2026-10-02", "2026-09-28");
  assert.equal(hasCheckin(log), false);
  assert.equal(
    hasCheckin(JSON.parse(JSON.stringify(state)).logs["2026-10-02"]),
    false,
  );
  log.periodStart = true;
  assert.equal(hasCheckin(log), true);
});

test("removing a period start preserves the marker when other details remain", () => {
  const state = {
    profile: { lastPeriod: "2026-10-09", demo: false },
    periodHistory: [],
    logs: {
      "2026-10-02": { ...emptyLog(), periodStart: true, notes: "Keep this" },
    },
  };
  removePeriodStart(state, "2026-10-02", "2026-09-28");
  assert.equal(hasCheckin(state.logs["2026-10-02"]), true);
  assert.equal(state.logs["2026-10-02"].notes, "Keep this");
});
