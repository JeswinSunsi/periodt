import test from "node:test";
import assert from "node:assert/strict";
import { isPeriodStart, removePeriodStart } from "../src/lib/periodHistory.js";

function recordedState() {
  return {
    profile: { lastPeriod: "2026-10-01", demo: false },
    periodHistory: [{ start: "2026-09-01", length: 5 }],
    logs: {
      "2026-10-01": { periodStart: true, mood: "Good", notes: "Keep this" },
    },
  };
}

test("period starts include dates entered through cycle settings", () => {
  const state = recordedState();
  state.logs = {};
  assert.equal(isPeriodStart(state, "2026-10-01"), true);
  assert.equal(isPeriodStart(state, "2026-09-01"), true);
  assert.equal(isPeriodStart(state, "2026-09-02"), false);
  state.profile.demo = true;
  assert.equal(isPeriodStart(state, "2026-10-01"), false);
});

test("removing a historical start leaves the current cycle and check-ins intact", () => {
  const state = recordedState();
  removePeriodStart(state, "2026-09-01", "2026-09-28");
  assert.deepEqual(state.periodHistory, []);
  assert.equal(state.profile.lastPeriod, "2026-10-01");
  assert.equal(state.logs["2026-10-01"].notes, "Keep this");
});

test("removing the latest start restores the most recent remaining recorded date", () => {
  const state = recordedState();
  state.periodHistory.push({ start: "2026-10-01", length: 5 });
  state.logs["2026-09-15"] = { periodStart: true };
  removePeriodStart(state, "2026-10-01", "2026-09-28");
  assert.equal(state.profile.lastPeriod, "2026-09-15");
  assert.equal(state.profile.demo, false);
  assert.equal(isPeriodStart(state, "2026-10-01"), false);
  assert.deepEqual(state.periodHistory, [{ start: "2026-09-01", length: 5 }]);
});

test("removing the only recorded start returns to a labeled sample cycle", () => {
  const state = recordedState();
  state.periodHistory = [];
  removePeriodStart(state, "2026-10-01", "2026-09-28");
  const reloaded = JSON.parse(JSON.stringify(state));
  assert.equal(reloaded.profile.lastPeriod, "2026-09-28");
  assert.equal(reloaded.profile.demo, true);
  assert.equal(isPeriodStart(reloaded, "2026-10-01"), false);
  assert.equal(isPeriodStart(reloaded, "2026-09-28"), false);
  assert.equal(reloaded.logs["2026-10-01"].mood, "Good");
  assert.equal(reloaded.logs["2026-10-01"].notes, "Keep this");
});

test("removing a start preserves recorded flow and all other check-in details after reload", () => {
  const state = recordedState();
  Object.assign(state.logs["2026-10-01"], {
    flow: "Spotting",
    flowRecorded: true,
    symptoms: ["Bloating"],
  });
  const original = { ...state.logs["2026-10-01"] };
  removePeriodStart(state, "2026-10-01", "2026-09-28");
  const reloaded = JSON.parse(JSON.stringify(state));
  assert.equal(isPeriodStart(reloaded, "2026-10-01"), false);
  assert.deepEqual(reloaded.logs["2026-10-01"], {
    ...original,
    periodStart: false,
  });
  assert.equal(reloaded.profile.lastPeriod, "2026-09-01");
});

test("removing a date recorded only in settings does not create or delete a check-in", () => {
  const state = recordedState();
  state.logs = {};
  removePeriodStart(state, "2026-10-01", "2026-09-28");
  assert.equal(isPeriodStart(state, "2026-10-01"), false);
  assert.deepEqual(state.logs, {});
  assert.equal(state.profile.lastPeriod, "2026-09-01");
});
