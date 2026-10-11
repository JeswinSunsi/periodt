import { computed, reactive, watch } from "vue";
import { cycleTiming, phaseAtDay } from "../lib/cyclePhases.js";
import { periodWindows } from "../lib/periodHistory.js";
export const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const fromKey = (key) => new Date(`${key}T12:00:00`);
export const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};
export const dayDifference = (a, b) =>
  Math.round(
    (Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) -
      Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) /
      86400000,
  );
const today = new Date();
let saved = null;
try {
  saved = JSON.parse(localStorage.getItem("periodt-v1"));
} catch {
  /* Storage may be unavailable. */
}
const valid =
  saved &&
  saved.version === 1 &&
  saved.profile &&
  /^\d{4}-\d{2}-\d{2}$/.test(saved.profile.lastPeriod) &&
  Number.isFinite(fromKey(saved.profile.lastPeriod).getTime()) &&
  saved.profile.cycleLength >= 21 &&
  saved.profile.cycleLength <= 45 &&
  saved.profile.periodLength >= 2 &&
  saved.profile.periodLength <= 10;
const state = reactive(
  valid
    ? saved
    : {
        version: 1,
        profile: {
          lastPeriod: dateKey(addDays(today, -11)),
          cycleLength: 28,
          periodLength: 5,
          demo: true,
        },
        logs: {},
        periodHistory: [],
        sharing: { code: "", cycle: true, mood: false, symptoms: false },
      },
);
state.logs ||= {};
state.periodHistory ||= [];
state.sharing ||= { code: "", cycle: true, mood: false, symptoms: false };
const storageError = reactive({ value: false });
watch(
  state,
  (value) => {
    try {
      localStorage.setItem("periodt-v1", JSON.stringify(value));
      storageError.value = false;
    } catch {
      storageError.value = true;
    }
  },
  { deep: true },
);
export function useCycle() {
  const currentPeriodLength = computed(
    () =>
      periodWindows(state, dateKey(today)).find(
        (period) => period.start === state.profile.lastPeriod,
      )?.length ?? state.profile.periodLength,
  );
  const elapsed = computed(() =>
    dayDifference(today, fromKey(state.profile.lastPeriod)),
  );
  const cycleDay = computed(() => elapsed.value + 1);
  const timing = computed(() => cycleTiming(state.profile.cycleLength));
  const nextPeriod = computed(() =>
    addDays(fromKey(state.profile.lastPeriod), timing.value.nextPeriodDay - 1),
  );
  const remaining = computed(() => dayDifference(nextPeriod.value, today));
  const ovulationDate = computed(() =>
    addDays(fromKey(state.profile.lastPeriod), timing.value.ovulationDay - 1),
  );
  const fertileWindow = computed(() => ({
    start: addDays(
      fromKey(state.profile.lastPeriod),
      timing.value.fertileStartDay - 1,
    ),
    end: ovulationDate.value,
  }));
  const phase = computed(() => phaseFor(today));
  function phaseFor(date) {
    const day = dayDifference(date, fromKey(state.profile.lastPeriod)) + 1;
    return phaseAtDay(
      day,
      state.profile.cycleLength,
      currentPeriodLength.value,
    );
  }
  return {
    state,
    today,
    cycleDay,
    remaining,
    nextPeriod,
    ovulationDate,
    fertileWindow,
    phase,
    phaseFor,
    storageError,
    currentPeriodLength,
  };
}
