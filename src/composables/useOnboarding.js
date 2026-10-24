import { reactive, ref } from "vue";
import { useCycle, dateKey } from "./useCycle.js";
import { applyOnboarding, onboardingErrors } from "../lib/onboarding.js";

// True while the handoff animation plays between setup and the app.
export const appOpening = ref(false);

export function useOnboarding() {
  const { state, today } = useCycle();
  const step = ref(0);
  const draft = reactive({
    lastPeriod: "",
    cycleLength: state.profile.cycleLength,
    periodLength: state.profile.periodLength,
  });
  const errors = ref({});

  function next() {
    const validation = onboardingErrors(draft, dateKey(today));
    errors.value =
      step.value === 1
        ? validation.lastPeriod
          ? { lastPeriod: validation.lastPeriod }
          : {}
        : step.value === 2
          ? Object.fromEntries(
              Object.entries(validation).filter(
                ([key]) => key !== "lastPeriod",
              ),
            )
          : {};
    if (Object.keys(errors.value).length) return false;
    step.value = Math.min(step.value + 1, 3);
    return true;
  }

  function backTo(value) {
    step.value = value;
    errors.value = {};
  }

  function finish() {
    errors.value = applyOnboarding(state, draft, dateKey(today));
    if (errors.value.lastPeriod) step.value = 1;
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
