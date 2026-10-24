import { hasCheckin } from "./checkin.js";
import { cycleTiming, phaseAtDay } from "./cyclePhases.js";

const dayNumber = (key) => Date.parse(`${key}T00:00:00Z`) / 86400000;
const keyAt = (number) =>
  new Date(number * 86400000).toISOString().slice(0, 10);
const days = (count) => (count === 1 ? "day" : "days");

// Where today sits in the cycle, from calendar estimates only.
// A late period stays late; it never assumes a new cycle began.
export function todayInCycle(profile, periodLength, today) {
  const day = dayNumber(today) - dayNumber(profile.lastPeriod) + 1;
  const { cycleLength } = profile;
  const timing = cycleTiming(cycleLength);
  const phase = phaseAtDay(day, cycleLength, periodLength);
  const base = {
    phase,
    progress: Math.min(Math.max(day - 0.5, 0), cycleLength) / cycleLength,
  };

  if (day >= timing.nextPeriodDay) {
    const late = day - timing.nextPeriodDay;
    return {
      ...base,
      label: "Cycle day",
      value: day,
      unit: "",
      note: late
        ? `Period ${late} ${days(late)} late · log it when it starts`
        : "Period expected today",
    };
  }
  if (phase === "Menstrual")
    return {
      ...base,
      label: "Period day",
      value: day,
      unit: `of ${periodLength}`,
      note: "Menstrual phase",
    };
  const fertile = day >= timing.fertileStartDay && day < timing.ovulationDay;
  return {
    ...base,
    label: "Cycle day",
    value: day,
    unit: `of ${cycleLength}`,
    note:
      phase === "Ovulation"
        ? "Estimated ovulation"
        : `${phase} phase${fertile ? " · Fertile window" : ""}`,
  };
}

// Consecutive days with a check-in, counting back from today.
export function checkinStreak(logs, today) {
  let streak = 0;
  for (let n = dayNumber(today); hasCheckin(logs[keyAt(n)]); n--) streak++;
  return streak;
}
