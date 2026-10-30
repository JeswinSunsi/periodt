import { hasCheckin } from "./checkin.js";
import { moods, regularityOptions } from "./content.js";
import {
  dateRangeLabel,
  forecastTiming,
  recentCycleCount,
  regularityLabel,
  typical,
} from "./insights.js";

const dayNumber = (key) => Date.parse(`${key}T00:00:00Z`) / 86400000;
const keyAt = (number) =>
  new Date(number * 86400000).toISOString().slice(0, 10);
const bleeding = (log) => !!log?.flow && log.flow !== "None";

// Cycles drawn day by day: enough to show a pattern, few enough to read.
export const gridCycleCount = 6;
// Cycle days drawn in each grid row; longer cycles are cut off there.
export const gridDayCount = 40;
// Cycles listed in the history table, newest first.
export const historyCount = 12;
export const flowLevels = ["Spotting", "Light", "Medium", "Heavy"];

function cycleFlags(cycle) {
  if (cycle.gap) return ["A start may be missing"];
  const flags = [];
  if (cycle.length !== null && cycle.length < typical.cycleMin)
    flags.push("Shorter than typical");
  if (cycle.length !== null && cycle.length > typical.cycleMax)
    flags.push("Longer than typical");
  if (cycle.periodLength !== null && cycle.periodLength > typical.periodMax)
    flags.push("Long period");
  return flags;
}

// How the recorded numbers sit against FIGO's typical ranges. A check with no
// data yet keeps its place so the page reads the same for everyone.
function rangeChecks(cycles, stats) {
  const periods = cycles
    .map((c) => c.periodLength)
    .filter((length) => length !== null)
    .slice(-recentCycleCount);
  const cycle = stats.cycleCount
    ? {
        min: stats.shortest,
        max: stats.longest,
        average: stats.averageCycle,
        within:
          stats.shortest >= typical.cycleMin &&
          stats.longest <= typical.cycleMax,
      }
    : null;
  const period = periods.length
    ? {
        min: Math.min(...periods),
        max: Math.max(...periods),
        average: stats.averagePeriod,
        within: Math.max(...periods) <= typical.periodMax,
      }
    : null;
  const variation =
    stats.variation !== null
      ? {
          min: 0,
          max: stats.variation,
          average: null,
          within: stats.variation <= typical.variationMax,
        }
      : null;
  return [
    {
      id: "cycle",
      label: "Cycle length",
      typicalLabel: `${typical.cycleMin}–${typical.cycleMax} days`,
      typicalMin: typical.cycleMin,
      typicalMax: typical.cycleMax,
      scaleMin: Math.min(14, cycle?.min ?? 14),
      scaleMax: Math.max(50, cycle?.max ?? 50),
      empty: "Appears after your first full cycle",
      value: cycle,
    },
    {
      id: "period",
      label: "Period length",
      typicalLabel: `Up to ${typical.periodMax} days`,
      typicalMin: 1,
      typicalMax: typical.periodMax,
      scaleMin: 0,
      scaleMax: Math.max(12, period?.max ?? 12),
      empty: "Appears once a period end is logged",
      value: period,
    },
    {
      id: "variation",
      label: "Difference between cycles",
      typicalLabel: `Up to 7–${typical.variationMax} days`,
      typicalMin: 0,
      typicalMax: typical.variationMax,
      scaleMin: 0,
      scaleMax: Math.max(20, variation?.max ?? 20),
      empty: "Appears after two full cycles",
      value: variation,
    },
  ];
}

// The recent cycles day by day, for the bleeding and symptom grids.
function cycleRows(state, cycles) {
  return cycles.slice(-gridCycleCount).map((cycle) => {
    const length = cycle.length ?? cycle.day;
    const period = cycle.periodLength ?? cycle.expectedPeriodLength;
    const start = dayNumber(cycle.start);
    return {
      start: cycle.start,
      length,
      ongoing: cycle.length === null,
      gap: cycle.gap,
      days: Array.from({ length }, (_, i) => {
        const log = state.logs[keyAt(start + i)];
        return {
          flow: bleeding(log) ? log.flow : null,
          period: i < period,
          symptoms: log?.symptoms ?? [],
          logged: hasCheckin(log),
        };
      }),
    };
  });
}

// Each symptom's share of the drawn cycles on every cycle day, so clusters
// (cramps on days 1–2, headaches before a period) show at a glance.
function symptomRows(rows) {
  const found = {};
  rows.forEach((row, index) => {
    row.days.forEach((day, offset) => {
      for (const name of day.symptoms) {
        const entry = (found[name] ||= {
          name,
          days: 0,
          cycles: new Set(),
          byDay: Array(gridDayCount).fill(0),
        });
        entry.days++;
        entry.cycles.add(index);
        if (offset < gridDayCount) entry.byDay[offset]++;
      }
    });
  });
  return Object.values(found)
    .map((entry) => ({
      ...entry,
      cycles: entry.cycles.size,
      of: rows.length,
      byDay: entry.byDay.map((count) => count / rows.length),
    }))
    .sort((a, b) => b.days - a.days || a.name.localeCompare(b.name));
}

// Everything the appointment PDF shows, from recorded data only. Journal
// notes stay out: the summary says so, and it should stay true.
export function appointmentReport({
  state,
  cycles,
  stats,
  range,
  notes,
  forecast,
  today,
}) {
  const from = cycles[0].start;
  const current = cycles.at(-1);
  const logged = Object.entries(state.logs).filter(
    ([date, log]) => date >= from && date <= today && hasCheckin(log),
  );
  const moodCounts = moods.map(({ name }) => ({
    name,
    count: logged.filter(([, log]) => log.mood === name).length,
  }));
  const rows = cycleRows(state, cycles);
  const dip = forecast.find((item) => item.kind === "mood");
  return {
    today,
    from,
    checkins: logged.length,
    periodsRecorded: cycles.length,
    current: { start: current.start, day: current.day },
    range,
    stats,
    regularity: regularityLabel(stats.variation),
    checks: rangeChecks(cycles, stats),
    notes,
    history: cycles
      .toReversed()
      .slice(0, historyCount)
      .map((cycle) => ({
        start: cycle.start,
        length: cycle.length,
        day: cycle.day,
        periodLength: cycle.periodLength,
        expectedPeriodLength: cycle.expectedPeriodLength,
        gap: cycle.gap,
        flags: cycleFlags(cycle),
      })),
    gridDays: Math.min(gridDayCount, Math.max(...rows.map((r) => r.length))),
    rows,
    symptoms: symptomRows(rows),
    patterns: forecast
      .filter((item) => item.kind === "symptom")
      .map((item) => ({
        name: item.name,
        timing: forecastTiming(item),
        cycles: item.cycles,
        of: item.of,
        next: dateRangeLabel(item.start, item.end),
      })),
    moods: moodCounts,
    moodDip: dip ? { cycles: dip.cycles, of: dip.of } : null,
    setup: {
      cycleLength: state.profile.cycleLength,
      periodLength: state.profile.periodLength,
      regularity:
        regularityOptions.find((o) => o.value === state.profile.regularity)
          ?.label ?? null,
      usualSymptoms: state.profile.usualSymptoms ?? [],
    },
  };
}
