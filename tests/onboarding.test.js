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
} from "../src/lib/onboarding.js";
import { estimateCaveats } from "../src/lib/cyclePhases.js";

const today = "2026-10-22";
const answers = { lastPeriod: "2026-10-11", cycleLength: 30, periodLength: 4 };
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

test("setup requires a real date and rejects future or impossible dates", () => {
  for (const lastPeriod of [
    "",
    "2026-10-23",
    "2026-02-29",
    "2026-02-31",
    "bad",
  ])
    assert.ok(onboardingErrors({ ...answers, lastPeriod }, today).lastPeriod);
  assert.deepEqual(
    onboardingErrors({ ...answers, lastPeriod: today }, today),
    {},
  );
  assert.deepEqual(
    onboardingErrors({ ...answers, lastPeriod: "2024-02-29" }, today),
    {},
  );
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
    ...answers,
    regularity: "",
    usualSymptoms: [],
    demo: false,
  });
  assert.equal(state.onboarding.status, "completed");
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

test("an empty date cannot complete setup or change the profile", () => {
  const state = sample();
  const before = structuredClone(state);
  assert.ok(
    applyOnboarding(state, { ...answers, lastPeriod: "" }, today).lastPeriod,
  );
  assert.deepEqual(state, before);
});

test("setup preserves an existing personal start in history when it changes", () => {
  const state = sample();
  Object.assign(state.profile, { lastPeriod: "2026-09-11", demo: false });
  applyOnboarding(state, answers, today);
  assert.equal(state.profile.lastPeriod, "2026-10-11");
  assert.deepEqual(state.periodHistory, [{ start: "2026-09-11", length: 5 }]);
});

test("setup treats a start within the shortest cycle as a correction, not a second period", () => {
  const state = sample();
  Object.assign(state.profile, { lastPeriod: "2026-10-04", demo: false });
  state.periodHistory.push({ start: "2026-09-02", length: 5 });
  state.logs["2026-10-04"] = { periodStart: true, mood: "Good" };
  applyOnboarding(state, answers, today);
  assert.equal(state.profile.lastPeriod, "2026-10-11");
  assert.deepEqual(state.periodHistory, [{ start: "2026-09-02", length: 5 }]);
  assert.deepEqual(state.logs["2026-10-04"], {
    periodStart: false,
    mood: "Good",
  });
});

test("setup clears a sample-cycle check-in start that conflicts with the entered date", () => {
  const state = sample();
  state.logs["2026-10-04"] = { periodStart: true };
  applyOnboarding(state, answers, today);
  assert.equal(state.profile.lastPeriod, "2026-10-11");
  assert.equal(state.logs["2026-10-04"].periodStart, false);
  assert.deepEqual(state.periodHistory, []);
});

const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, value),
};
const { useCycle, dateKey } = await import("../src/composables/useCycle.js");
const { useOnboarding } = await import("../src/composables/useOnboarding.js");

test("back navigation keeps drafts isolated until review is confirmed, then persists completion", async () => {
  const { state, today: currentDay } = useCycle();
  const before = JSON.parse(JSON.stringify(state.profile));
  const setup = useOnboarding();
  setup.next();
  setup.draft.lastPeriod = dateKey(currentDay);
  setup.next();
  setup.draft.cycleLength = 31;
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
  assert.ok(setup.errors.value.lastPeriod);
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
