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
