import { reactive, ref } from "vue";
import { useCycle, dateKey } from "./useCycle.js";
import {
  applyOnboarding,
  markedRhythm,
  onboardingErrors,
  onboardingSteps,
} from "../lib/onboarding.js";

// True while the handoff animation plays between setup and the app.
export const appOpening = ref(false);

export function useOnboarding() {
  const { state, today } = useCycle();
  const step = ref(0);
  const draft = reactive({
    periods: [],
    cycleLength: state.profile.cycleLength,
    periodLength: state.profile.periodLength,
    regularity: state.profile.regularity,
    usualSymptoms: [...state.profile.usualSymptoms],
  });
  const errors = ref({});
  // The marked periods the rhythm step was last prefilled from, so going back
  // without changing them keeps any lengths the user adjusted.
  let prefilledFrom = "";

  function next() {
    const validation = onboardingErrors(draft, dateKey(today));
    errors.value =
      step.value === 1
        ? validation.periods
          ? { periods: validation.periods }
          : {}
        : step.value === 2
          ? Object.fromEntries(
              Object.entries(validation).filter(([key]) => key !== "periods"),
            )
          : {};
    if (Object.keys(errors.value).length) return false;
    if (step.value === 1) prefillRhythm();
    step.value = Math.min(step.value + 1, onboardingSteps.length - 1);
    return true;
  }

  function prefillRhythm() {
    const marked = JSON.stringify(draft.periods);
    if (marked === prefilledFrom) return;
    prefilledFrom = marked;
    const rhythm = markedRhythm(draft.periods);
    if (rhythm.cycleLength !== null) draft.cycleLength = rhythm.cycleLength;
    if (rhythm.periodLength !== null) draft.periodLength = rhythm.periodLength;
  }

  function backTo(value) {
    step.value = value;
    errors.value = {};
  }

  function finish() {
    errors.value = applyOnboarding(state, draft, dateKey(today));
    if (errors.value.periods) step.value = 1;
    else if (Object.keys(errors.value).length) step.value = 2;
    return Object.keys(errors.value).length === 0;
  }

  return {
    step,
    draft,
    errors,
    next,
    backTo,
    finish,
  };
}
