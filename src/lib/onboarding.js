import { regularityOptions, symptoms } from "./content.js";
import { minStartGap, setPeriodStart } from "./periodHistory.js";

export const onboardingSteps = [
  "Welcome",
  "Your dates",
  "Your rhythm",
  "Your cycle",
  "Your body",
  "Your theme",
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

export const maxSetupPeriods = 6;
// Fewer than this and setup suggests marking more before moving on.
export const recommendedSetupPeriods = 3;
export const maxMarkedPeriodLength = 14;

const dayNumber = (date) => Date.parse(`${date}T00:00:00Z`) / 86400000;
const validKey = (key) => {
  const date = new Date(`${key}T12:00:00`);
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(key) &&
    Number.isFinite(date.getTime()) &&
    date.getFullYear() > 0 &&
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` ===
      key
  );
};
export const markedLength = (period) =>
  dayNumber(period.end) - dayNumber(period.start) + 1;
export const sortedPeriods = (periods) =>
  [...periods].sort((a, b) => a.start.localeCompare(b.start));

// Why one marked range can't be saved, or "" when it can. Ranges are
// inclusive, can't overlap, and starts closer than the minimum gap would be
// one period.
export function periodRangeError(period, others, today) {
  if (!validKey(period.start) || !validKey(period.end))
    return "Choose complete, valid dates.";
  if (period.end < period.start) return "The end comes before the start.";
  if (period.end > today) return "Choose today or an earlier date.";
  if (markedLength(period) > maxMarkedPeriodLength)
    return `Periods here can be up to ${maxMarkedPeriodLength} days.`;
  if (
    others.some(
      (other) => other.start <= period.end && period.start <= other.end,
    )
  )
    return "Periods can’t overlap.";
  if (
    others.some(
      (other) =>
        Math.abs(dayNumber(other.start) - dayNumber(period.start)) <
        minStartGap,
    )
  )
    return `Periods need to start at least ${minStartGap} days apart.`;
  return "";
}

export function onboardingErrors(draft, today) {
  const errors = {};
  const periods = draft.periods || [];
  if (!periods.length) errors.periods = "Mark at least one period.";
  else if (periods.length > maxSetupPeriods)
    errors.periods = `Mark up to ${maxSetupPeriods} periods.`;
  else {
    const error = periods
      .map((period) =>
        periodRangeError(
          period,
          periods.filter((other) => other !== period),
          today,
        ),
      )
      .find(Boolean);
    if (error) errors.periods = error;
  }

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

  // Oldest first, so the latest marked start ends up as profile.lastPeriod.
  // Each keeps its marked length; later check-ins can still adjust it.
  const periods = sortedPeriods(draft.periods);
  for (const period of periods) setPeriodStart(state, period.start);
  for (const period of periods) {
    const length = markedLength(period);
    const recorded = state.periodHistory.find((p) => p.start === period.start);
    if (recorded) recorded.length = length;
    else state.periodHistory.push({ start: period.start, length });
  }
  state.periodHistory.sort((a, b) => a.start.localeCompare(b.start));
  Object.assign(state.profile, {
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

// Usual lengths implied by the marked periods, kept inside the supported
// ranges; null where there is not enough to go on.
export function markedRhythm(periods) {
  const sorted = sortedPeriods(periods);
  const average = (values) =>
    values.length
      ? Math.round(
          values.reduce((sum, value) => sum + value, 0) / values.length,
        )
      : null;
  const clamp = (value, min, max) =>
    value === null ? null : Math.max(min, Math.min(max, value));
  return {
    cycleLength: clamp(
      average(
        sorted
          .slice(1)
          .map(
            (period, index) =>
              dayNumber(period.start) - dayNumber(sorted[index].start),
          ),
      ),
      21,
      45,
    ),
    periodLength: clamp(average(sorted.map(markedLength)), 2, 10),
  };
}
