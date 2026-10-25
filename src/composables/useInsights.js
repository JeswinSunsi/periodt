import { computed } from "vue";
import { cycleHistory, cycleStats, nextPeriodRange } from "../lib/insights.js";
import { useCycle, dateKey } from "./useCycle.js";

const { state, today } = useCycle();
const todayKey = dateKey(today);

// Recorded cycles and the predicted range, shared by every page that shows them.
const cycles = computed(() => cycleHistory(state, todayKey));
const stats = computed(() => cycleStats(cycles.value));
const range = computed(() =>
  state.profile.demo
    ? null
    : nextPeriodRange(state.profile, stats.value, todayKey),
);

export function useInsights() {
  return { todayKey, cycles, stats, range };
}
