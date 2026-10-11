import test from "node:test";
import assert from "node:assert/strict";
import { nextTick } from "vue";

const stored = new Map();
globalThis.localStorage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => stored.set(key, value),
};
const { useCycle, addDays, dateKey, fromKey, dayDifference } =
  await import("../src/composables/useCycle.js");
const {
  state,
  phaseFor,
  cycleDay,
  remaining,
  nextPeriod,
  ovulationDate,
  fertileWindow,
  today,
  storageError,
} = useCycle();

test("calendar arithmetic handles leap years and year boundaries", () => {
  assert.equal(dateKey(addDays(fromKey("2024-02-28"), 1)), "2024-02-29");
  assert.equal(dateKey(addDays(fromKey("2026-12-31"), 1)), "2027-01-01");
  assert.equal(dayDifference(fromKey("2026-03-10"), fromKey("2026-03-07")), 3);
});

test("phase estimates use cycle boundaries without silently starting another cycle", () => {
  Object.assign(state.profile, {
    lastPeriod: "2026-10-01",
    cycleLength: 28,
    periodLength: 5,
  });
  assert.equal(phaseFor(fromKey("2026-09-30")), "Unconfirmed");
  assert.equal(phaseFor(fromKey("2026-10-01")), "Menstrual");
  assert.equal(phaseFor(fromKey("2026-10-05")), "Menstrual");
  assert.equal(phaseFor(fromKey("2026-10-06")), "Follicular");
  assert.equal(phaseFor(fromKey("2026-10-14")), "Ovulation");
  assert.equal(phaseFor(fromKey("2026-10-15")), "Luteal");
  assert.equal(phaseFor(fromKey("2026-10-29")), "Unconfirmed");
});

test("cycle day and next period react to personalized dates", () => {
  Object.assign(state.profile, {
    lastPeriod: dateKey(addDays(today, -2)),
    cycleLength: 30,
  });
  assert.equal(cycleDay.value, 3);
  assert.equal(remaining.value, 28);
  assert.equal(dateKey(nextPeriod.value), dateKey(addDays(today, 28)));
});

test("cycle estimates use the recorded start and configured length across date boundaries", () => {
  for (const [start, length, next, ovulation, fertileStart] of [
    ["2026-10-01", 21, "2026-10-22", "2026-10-07", "2026-10-02"],
    ["2026-10-01", 28, "2026-10-29", "2026-10-14", "2026-10-09"],
    ["2026-10-01", 30, "2026-10-31", "2026-10-16", "2026-10-11"],
    ["2026-10-01", 45, "2026-11-15", "2026-10-31", "2026-10-26"],
    ["2024-02-28", 28, "2024-03-27", "2024-03-12", "2024-03-07"],
    ["2026-12-20", 28, "2027-01-17", "2027-01-02", "2026-12-28"],
  ]) {
    Object.assign(state.profile, { lastPeriod: start, cycleLength: length });
    for (const periodLength of [2, 5, 10]) {
      state.profile.periodLength = periodLength;
      assert.equal(dateKey(nextPeriod.value), next);
      assert.equal(dateKey(ovulationDate.value), ovulation);
      assert.equal(dateKey(fertileWindow.value.start), fertileStart);
      assert.equal(dateKey(fertileWindow.value.end), ovulation);
    }
  }
});

test("an overdue prediction stays anchored until a new start is recorded", () => {
  Object.assign(state.profile, {
    lastPeriod: dateKey(addDays(today, -40)),
    cycleLength: 28,
  });
  assert.equal(dateKey(nextPeriod.value), dateKey(addDays(today, -12)));
  assert.equal(remaining.value, -12);
  assert.equal(phaseFor(today), "Unconfirmed");
});

test("nested check-ins and sharing choices persist", async () => {
  state.logs[dateKey(today)] = {
    mood: "Good",
    flow: "Light",
    symptoms: ["Cramps"],
    notes: "Test only",
  };
  state.sharing.mood = true;
  await nextTick();
  const saved = JSON.parse(stored.get("periodt-v1"));
  assert.equal(saved.logs[dateKey(today)].mood, "Good");
  assert.deepEqual(saved.logs[dateKey(today)].symptoms, ["Cramps"]);
  assert.equal(saved.sharing.mood, true);
});

test("storage failure preserves the session and exposes a warning", async () => {
  const save = localStorage.setItem;
  localStorage.setItem = () => {
    throw new Error("Quota exceeded");
  };
  state.sharing.mood = false;
  await nextTick();
  assert.equal(storageError.value, true);
  assert.equal(state.sharing.mood, false);
  localStorage.setItem = save;
  state.sharing.mood = true;
  await nextTick();
  assert.equal(storageError.value, false);
});
