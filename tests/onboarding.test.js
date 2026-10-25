import test from "node:test";
import assert from "node:assert/strict";
import { nextTick } from "vue";
import {
  initialOnboardingStatus,
  onboardingErrors,
  applyOnboarding,
  cycleContext,
  onboardingSteps,
  progressRange,
  markedRhythm,
  periodsReplacedBy,
  periodRangeError,
} from "../src/lib/onboarding.js";
import { estimateCaveats } from "../src/lib/cyclePhases.js";
import { periodWindows } from "../src/lib/periodHistory.js";

const today = "2026-10-22";
const answers = {
  periods: [{ start: "2026-10-11", end: "2026-10-14" }],
  cycleLength: 30,
  periodLength: 4,
};
const one = (start, end = start) => ({ ...answers, periods: [{ start, end }] });
const sample = () => ({
  version: 1,
  profile: {
    lastPeriod: "2026-10-11",
    cycleLength: 28,
    periodLength: 5,
    demo: true,
  },
  logs: {},
  periodHistory: [],
  sharing: { code: "", cycle: true, mood: false, symptoms: false },
  onboarding: { status: "pending" },
});

test("legacy installs keep their data; previously skipped setup requires a real date", () => {
  assert.equal(initialOnboardingStatus(null), "pending");
  assert.equal(
    initialOnboardingStatus({ profile: { demo: true } }),
    "completed",
  );
  assert.equal(
    initialOnboardingStatus({ profile: { demo: false } }),
    "completed",
  );
  for (const status of ["pending", "completed"])
    assert.equal(initialOnboardingStatus({ onboarding: { status } }), status);
  assert.equal(
    initialOnboardingStatus({
      profile: { demo: true },
      onboarding: { status: "skipped" },
    }),
    "pending",
  );
  assert.equal(
    initialOnboardingStatus({ onboarding: { status: "bad" } }),
    "completed",
  );
  assert.equal(
    initialOnboardingStatus({
      profile: { demo: true },
      onboarding: { status: "completed" },
    }),
    "completed",
  );
});

test("setup requires a marked period and rejects future, impossible, or reversed ranges", () => {
  assert.ok(onboardingErrors({ ...answers, periods: [] }, today).periods);
  for (const start of ["", "2026-10-23", "2026-02-29", "2026-02-31", "bad"])
    assert.ok(onboardingErrors(one(start), today).periods);
  assert.ok(onboardingErrors(one("2026-10-20", "2026-10-23"), today).periods);
  assert.ok(onboardingErrors(one("2026-10-14", "2026-10-11"), today).periods);
  assert.ok(onboardingErrors(one("2026-10-01", "2026-10-15"), today).periods);
  assert.deepEqual(onboardingErrors(one(today), today), {});
  assert.deepEqual(onboardingErrors(one("2024-02-29"), today), {});
  assert.deepEqual(
    onboardingErrors(one("2026-10-01", "2026-10-14"), today),
    {},
  );
});

test("setup takes up to six non-overlapping periods, starting at least 7 days apart", () => {
  const starts = [
    "2026-04-20",
    "2026-05-18",
    "2026-06-15",
    "2026-07-13",
    "2026-08-10",
    "2026-09-07",
    "2026-10-05",
  ];
  const periods = starts.map((start) => ({ start, end: start }));
  assert.deepEqual(
    onboardingErrors({ ...answers, periods: periods.slice(1) }, today),
    {},
  );
  assert.ok(onboardingErrors({ ...answers, periods }, today).periods);
  const pair = (first, second) =>
    onboardingErrors({ ...answers, periods: [first, second] }, today).periods;
  const latest = { start: "2026-10-11", end: "2026-10-14" };
  assert.equal(
    pair({ start: "2026-10-06", end: "2026-10-08" }, latest),
    "Periods need to start at least 7 days apart.",
  );
  assert.equal(
    pair({ start: "2026-10-04", end: "2026-10-06" }, latest),
    undefined,
  );
  assert.equal(
    pair(
      { start: "2026-10-01", end: "2026-10-12" },
      { start: "2026-10-08", end: "2026-10-10" },
    ),
    "Periods can’t overlap.",
  );
});

test("marking over a period replaces any it overlaps or starts within 7 days of", () => {
  const older = { start: "2026-09-10", end: "2026-09-14" };
  const recent = { start: "2026-10-08", end: "2026-10-12" };
  const marked = [older, recent];
  const replaced = (start, end) => periodsReplacedBy({ start, end }, marked);
  assert.deepEqual(replaced("2026-10-10", "2026-10-15"), [recent]);
  assert.deepEqual(replaced("2026-10-03", "2026-10-06"), [recent]);
  assert.deepEqual(replaced("2026-10-15", "2026-10-17"), []);
  assert.deepEqual(replaced("2026-09-20", "2026-09-24"), []);
  assert.deepEqual(replaced("2026-09-12", "2026-09-20"), [older]);
  // What remains after replacing is valid to save alongside the new range.
  const next = { start: "2026-10-10", end: "2026-10-15" };
  assert.equal(periodRangeError(next, [older], today), "");
});

test("marked periods suggest usual lengths within the supported ranges", () => {
  assert.deepEqual(
    markedRhythm([
      { start: "2026-10-11", end: "2026-10-14" },
      { start: "2026-08-14", end: "2026-08-19" },
      { start: "2026-09-12", end: "2026-09-16" },
    ]),
    { cycleLength: 29, periodLength: 5 },
  );
  assert.deepEqual(markedRhythm([{ start: "2026-10-11", end: "2026-10-11" }]), {
    cycleLength: null,
    periodLength: 2,
  });
});

test("lengths use the app's supported whole-day ranges, including their boundaries", () => {
  for (const cycleLength of ["28", "", 0, 20, 46, 28.5, NaN])
    assert.ok(onboardingErrors({ ...answers, cycleLength }, today).cycleLength);
  for (const periodLength of ["5", "", 0, 1, 11, 4.5, NaN])
    assert.ok(
      onboardingErrors({ ...answers, periodLength }, today).periodLength,
    );
  for (const cycleLength of [21, 45])
    for (const periodLength of [2, 10])
      assert.deepEqual(
        onboardingErrors({ ...answers, cycleLength, periodLength }, today),
        {},
      );
});

test("invalid setup cannot partially change the saved cycle", () => {
  const state = sample();
  const before = structuredClone(state);
  assert.ok(
    applyOnboarding(state, { ...answers, cycleLength: 99 }, today).cycleLength,
  );
  assert.deepEqual(state, before);
});

test("personalizing records only the entered start, preserving check-ins, history, and sharing", () => {
  const state = sample();
  state.logs[today] = {
    mood: "Good",
    notes: "Keep this",
    symptoms: ["Cramps"],
  };
  state.periodHistory.push({ start: "2026-09-10", length: 5 });
  state.sharing.mood = true;
  const preserved = structuredClone({
    logs: state.logs,
    periodHistory: state.periodHistory,
    sharing: state.sharing,
  });
  assert.deepEqual(applyOnboarding(state, answers, today), {});
  assert.deepEqual(state.profile, {
    lastPeriod: "2026-10-11",
    cycleLength: 30,
    periodLength: 4,
    regularity: "",
    usualSymptoms: [],
    demo: false,
  });
  assert.equal(state.onboarding.status, "completed");
  preserved.periodHistory.push({ start: "2026-10-11", length: 4 });
  assert.deepEqual(
    {
      logs: state.logs,
      periodHistory: state.periodHistory,
      sharing: state.sharing,
    },
    preserved,
  );
  assert.equal(
    Object.keys(state.logs).length,
    1,
    "Setup never invents bleeding or a check-in",
  );
});

test("no marked period cannot complete setup or change the profile", () => {
  const state = sample();
  const before = structuredClone(state);
  assert.ok(applyOnboarding(state, { ...answers, periods: [] }, today).periods);
  assert.deepEqual(state, before);
});

test("setup preserves an existing personal start in history when it changes", () => {
  const state = sample();
  Object.assign(state.profile, { lastPeriod: "2026-09-11", demo: false });
  applyOnboarding(state, answers, today);
  assert.equal(state.profile.lastPeriod, "2026-10-11");
  assert.deepEqual(state.periodHistory, [
    { start: "2026-09-11", length: 5 },
    { start: "2026-10-11", length: 4 },
  ]);
});

test("setup records every marked period with its own length, latest as the current cycle", () => {
  const state = sample();
  const periods = [
    { start: "2026-10-11", end: "2026-10-13" },
    { start: "2026-08-14", end: "2026-08-19" },
    { start: "2026-09-12", end: "2026-09-16" },
  ];
  assert.deepEqual(applyOnboarding(state, { ...answers, periods }, today), {});
  assert.equal(state.profile.lastPeriod, "2026-10-11");
  assert.equal(state.profile.demo, false);
  assert.deepEqual(state.periodHistory, [
    { start: "2026-08-14", length: 6 },
    { start: "2026-09-12", length: 5 },
    { start: "2026-10-11", length: 3 },
  ]);
  assert.deepEqual(
    periodWindows(state, today).map(({ start, length }) => ({ start, length })),
    state.periodHistory,
  );
});

test("setup treats a start within 7 days as a correction, not a second period", () => {
  const state = sample();
  Object.assign(state.profile, { lastPeriod: "2026-10-08", demo: false });
  state.periodHistory.push({ start: "2026-09-02", length: 5 });
  state.logs["2026-10-08"] = { periodStart: true, mood: "Good" };
  applyOnboarding(state, answers, today);
  assert.equal(state.profile.lastPeriod, "2026-10-11");
  assert.deepEqual(state.periodHistory, [
    { start: "2026-09-02", length: 5 },
    { start: "2026-10-11", length: 4 },
  ]);
  assert.deepEqual(state.logs["2026-10-08"], {
    periodStart: false,
    mood: "Good",
  });
});

test("setup clears a sample-cycle check-in start that conflicts with the entered date", () => {
  const state = sample();
  state.logs["2026-10-08"] = { periodStart: true };
  applyOnboarding(state, answers, today);
  assert.equal(state.profile.lastPeriod, "2026-10-11");
  assert.equal(state.logs["2026-10-08"].periodStart, false);
  assert.deepEqual(state.periodHistory, [{ start: "2026-10-11", length: 4 }]);
});

const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, value),
};
const { useCycle, dateKey, addDays } =
  await import("../src/composables/useCycle.js");
const { useOnboarding } = await import("../src/composables/useOnboarding.js");

test("back navigation keeps drafts isolated until review is confirmed, then persists completion", async () => {
  const { state, today: currentDay } = useCycle();
  const before = JSON.parse(JSON.stringify(state.profile));
  const setup = useOnboarding();
  setup.next();
  setup.draft.periods = [
    {
      start: dateKey(addDays(currentDay, -30)),
      end: dateKey(addDays(currentDay, -26)),
    },
    { start: dateKey(currentDay), end: dateKey(currentDay) },
  ];
  setup.next();
  assert.equal(
    setup.draft.cycleLength,
    30,
    "Prefilled from the marked periods",
  );
  assert.equal(setup.draft.periodLength, 3);
  setup.draft.cycleLength = 31;
  setup.backTo(1);
  setup.next();
  assert.equal(setup.draft.cycleLength, 31, "Unchanged periods keep edits");
  setup.backTo(1);
  assert.equal(setup.draft.cycleLength, 31);
  assert.deepEqual(JSON.parse(JSON.stringify(state.profile)), before);
  setup.next();
  setup.next();
  assert.equal(setup.step.value, 3);
  setup.draft.regularity = "varies";
  setup.next();
  setup.draft.usualSymptoms.push("Cramps");
  setup.next();
  assert.equal(setup.step.value, onboardingSteps.length - 2);
  setup.next();
  assert.equal(setup.step.value, onboardingSteps.length - 1);
  setup.next();
  assert.equal(setup.step.value, onboardingSteps.length - 1);
  assert.equal(state.profile.demo, true);
  assert.equal(setup.finish(), true);
  await nextTick();
  const saved = JSON.parse(stored.get("periodt-v1"));
  assert.equal(saved.onboarding.status, "completed");
  assert.equal(saved.profile.cycleLength, 31);
  assert.equal(saved.profile.demo, false);
  assert.equal(saved.profile.regularity, "varies");
  assert.deepEqual(saved.profile.usualSymptoms, ["Cramps"]);
});

test("setup has no skip path and an unfinished draft cannot complete", async () => {
  const { state } = useCycle();
  const before = JSON.parse(JSON.stringify(state.profile));
  const setup = useOnboarding();
  setup.draft.cycleLength = 40;
  assert.equal(setup.skip, undefined);
  assert.equal(setup.finish(), false);
  assert.equal(setup.step.value, 1);
  assert.ok(setup.errors.value.periods);
  assert.deepEqual(JSON.parse(JSON.stringify(state.profile)), before);
});

test("optional setup answers keep only known choices, in check-in order", () => {
  assert.deepEqual(
    cycleContext({
      regularity: "irregular",
      usualSymptoms: ["Cravings", "Made up", "Cramps"],
    }),
    {
      regularity: "irregular",
      usualSymptoms: ["Cramps", "Cravings"],
    },
  );
  assert.deepEqual(cycleContext({ regularity: "weekly" }), {
    regularity: "",
    usualSymptoms: [],
  });
});

test("setup saves the optional answers with the cycle", () => {
  const state = sample();
  assert.deepEqual(
    applyOnboarding(
      state,
      {
        ...answers,
        regularity: "regular",
        usualSymptoms: ["Headache"],
      },
      today,
    ),
    {},
  );
  assert.equal(state.profile.regularity, "regular");
  assert.deepEqual(state.profile.usualSymptoms, ["Headache"]);
});

test("estimates carry a caveat only when cycles vary", () => {
  for (const regularity of ["", "regular", "unsure"])
    assert.deepEqual(estimateCaveats({ regularity }), []);
  for (const regularity of ["varies", "irregular"])
    assert.equal(estimateCaveats({ regularity }).length, 1);
});

test("the progress bar shows four steps, then the fourth onward once it is done", () => {
  const total = onboardingSteps.length;
  for (const step of [0, 1, 2, 3])
    assert.deepEqual(progressRange(step, total), [0, 4]);
  for (const step of [4, 5])
    assert.deepEqual(progressRange(step, total), [3, total]);
  assert.deepEqual(progressRange(0, 3), [0, 3]);
});
