import { regularityOptions, symptoms } from "./content.js";

export const onboardingSteps = [
  "Welcome",
  "Your dates",
  "Your rhythm",
  "Your cycle",
  "Your body",
  "Your space",
];

// The progress bar shows the first four steps, then the fourth onward once it is done.
export function progressRange(step, total, pageSize = 4) {
  return step >= pageSize
    ? [pageSize - 1, total]
    : [0, Math.min(pageSize, total)];
}

// Keep legacy installs intact. Previously skipped setups now require a real
// period start; completed setup stays complete when a recorded start is deleted.
export function initialOnboardingStatus(saved) {
  if (!saved || ["pending", "skipped"].includes(saved.onboarding?.status))
    return "pending";
  return "completed";
}

export function onboardingErrors(draft, today) {
  const errors = {};
  const date = new Date(`${draft.lastPeriod}T12:00:00`);
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(draft.lastPeriod) &&
    Number.isFinite(date.getTime()) &&
    date.getFullYear() > 0 &&
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` ===
      draft.lastPeriod;

  if (!draft.lastPeriod) errors.lastPeriod = "Choose a start date.";
  else if (draft.lastPeriod && !validDate)
    errors.lastPeriod = "Enter a complete, valid date.";
  else if (draft.lastPeriod > today)
    errors.lastPeriod = "Choose today or an earlier date.";

  if (
    !Number.isInteger(draft.cycleLength) ||
    draft.cycleLength < 21 ||
    draft.cycleLength > 45
  )
    errors.cycleLength = "Enter 21–45 whole days.";
  if (
    !Number.isInteger(draft.periodLength) ||
    draft.periodLength < 2 ||
    draft.periodLength > 10
  )
    errors.periodLength = "Enter 2–10 whole days.";
  return errors;
}

export function applyOnboarding(state, draft, today) {
  const errors = onboardingErrors(draft, today);
  if (Object.keys(errors).length) return errors;

  if (
    !state.profile.demo &&
    state.profile.lastPeriod !== draft.lastPeriod &&
    !state.periodHistory.some((p) => p.start === state.profile.lastPeriod)
  )
    state.periodHistory.push({
      start: state.profile.lastPeriod,
      length: state.profile.periodLength,
    });

  Object.assign(state.profile, {
    lastPeriod: draft.lastPeriod,
    cycleLength: draft.cycleLength,
    periodLength: draft.periodLength,
    ...cycleContext(draft),
    demo: false,
  });
  state.onboarding = {
    status: "completed",
  };
  return {};
}

// The optional answers keep only known choices; anything else means "not answered".
export function cycleContext(answers) {
  const known = (options, value) =>
    options.some((option) => option.value === value) ? value : "";
  return {
    regularity: known(regularityOptions, answers.regularity),
    usualSymptoms: symptoms.filter((symptom) =>
      answers.usualSymptoms?.includes(symptom),
    ),
  };
}
