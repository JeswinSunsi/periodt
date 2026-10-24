import { hasCheckin } from "./checkin.js";
import { cycleTiming, phaseAtDay } from "./cyclePhases.js";

const dayNumber = (key) => Date.parse(`${key}T00:00:00Z`) / 86400000;
const keyAt = (number) =>
  new Date(number * 86400000).toISOString().slice(0, 10);
const days = (count) => `${count} ${count === 1 ? "day" : "days"}`;

export const relativeDays = (count) =>
  count === 0 ? "Today" : count === 1 ? "Tomorrow" : `In ${days(count)}`;

// What today means in the cycle, plus the next dates worth planning around.
// Built from calendar estimates only; it never assumes a new period began.
export function cycleOutlook(profile, periodLength, today) {
  const start = dayNumber(profile.lastPeriod);
  const day = dayNumber(today) - start + 1;
  const { cycleLength } = profile;
  const timing = cycleTiming(cycleLength);
  const phase = phaseAtDay(day, cycleLength, periodLength);
  const toPeriod = timing.nextPeriodDay - day;

  let status;
  if (day < 1) status = "Your last period date is still ahead.";
  else if (toPeriod === 0) status = "Your period may start today.";
  else if (toPeriod < 0)
    status = `Your period is ${days(-toPeriod)} later than estimated.`;
  else if (phase === "Menstrual")
    status =
      day >= periodLength
        ? `Period day ${day}, likely the last.`
        : `Period day ${day} of about ${periodLength}.`;
  else if (phase === "Ovulation") status = "Estimated ovulation day.";
  else if (day >= timing.fertileStartDay && day < timing.ovulationDay)
    status = "You’re in your estimated fertile window.";
  else if (toPeriod <= 3)
    status = `Your period may start in ${days(toPeriod)}.`;
  else status = `About ${days(toPeriod)} until your next period.`;

  // Next period always matters; add whichever fertility estimate comes first.
  const fertility = [
    {
      name: "Fertile window",
      day: timing.fertileStartDay,
      endDay: timing.fertileEndDay,
    },
    { name: "Ovulation", day: timing.ovulationDay },
  ].find((event) => event.day > day);
  const milestones = [
    fertility,
    toPeriod > 0 && { name: "Next period", day: timing.nextPeriodDay },
  ]
    .filter(Boolean)
    .map((event) => ({
      name: event.name,
      date: keyAt(start + event.day - 1),
      endDate: event.endDay && keyAt(start + event.endDay - 1),
      inDays: event.day - day,
    }));

  return {
    day,
    phase,
    status,
    late: toPeriod < 0,
    progress: Math.min(Math.max(day - 0.5, 0), cycleLength) / cycleLength,
    milestones,
  };
}

// Consecutive days with a check-in, counting back from today.
export function checkinStreak(logs, today) {
  let streak = 0;
  for (let n = dayNumber(today); hasCheckin(logs[keyAt(n)]); n--) streak++;
  return streak;
}
