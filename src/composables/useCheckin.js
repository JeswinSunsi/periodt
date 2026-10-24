import { computed, ref } from "vue";
import { hasCheckin } from "../lib/checkin.js";
import { isPeriodStart, periodWindows } from "../lib/periodHistory.js";
import { useCycle, dateKey, fromKey } from "./useCycle.js";
import { useDialog } from "./useDialog.js";

const { state, today } = useCycle();
const { openDialog } = useDialog();

// The date the check-in dialogs show; pages choose it, the dialogs own the editing.
const logDate = ref(dateKey(today));
const initialMood = ref("");
const todayLog = computed(() => {
  const log = state.logs[dateKey(today)];
  return hasCheckin(log) ? log : undefined;
});
const periodEndDates = computed(
  () =>
    new Set(
      periodWindows(state, dateKey(today))
        .map((period) => period.end)
        .filter(Boolean),
    ),
);
const logDateLabel = computed(() =>
  fromKey(logDate.value).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }),
);

function openLog(date = today, mood = "") {
  logDate.value = dateKey(date);
  initialMood.value = mood;
  openDialog("log");
}
function openCalendarDate(date) {
  const key = dateKey(date);
  if (hasCheckin(state.logs[key]) || isPeriodStart(state, key)) {
    logDate.value = key;
    openDialog("saved-log");
  } else openLog(date);
}

export function useCheckin() {
  return {
    logDate,
    initialMood,
    todayLog,
    periodEndDates,
    logDateLabel,
    openLog,
    openCalendarDate,
  };
}
