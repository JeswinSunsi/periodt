import { moods, painLevels } from "./content.js";
import { periodWindows } from "./periodHistory.js";

const dayNumber = (key) => Date.parse(`${key}T00:00:00Z`) / 86400000;
const keyAt = (number) =>
  new Date(number * 86400000).toISOString().slice(0, 10);
const bleeding = (log) => !!log?.flow && log.flow !== "None";
const average = (values) =>
  values.reduce((sum, value) => sum + value, 0) / values.length;
const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
};
const spread = (values) => Math.max(...values) - Math.min(...values);
const painScore = Object.fromEntries(
  painLevels.map((level, index) => [level.name, index + 1]),
);

// Averages follow recent cycles, like the last six Clue uses.
export const recentCycleCount = 6;
// Gaps this long almost always mean a start went unlogged, so they stay out
// of averages instead of skewing them.
export const missedLogGap = 90;
// FIGO 2018 typical ranges for adults not using hormonal contraception.
export const typical = {
  cycleMin: 24,
  cycleMax: 38,
  periodMax: 8,
  variationMax: 9,
};

// Days of bleeding logged back to back from a period's start, so flow logged
// past the usual length reads as a longer period rather than spotting.
function bleedingRun(state, start, from) {
  let day = from;
  while (bleeding(state.logs[keyAt(dayNumber(start) + day)])) day++;
  return day;
}

// Recorded cycles only, oldest first. A cycle runs from one recorded start to
// the next; the latest is still running. Period length is only measured from
// a logged end or flow logged past the usual length; otherwise it is just the
// usual-length setting.
export function cycleHistory(state, today) {
  const periods = periodWindows(state, today).filter(
    (period) => !period.sample && period.start <= today,
  );
  return periods.map((period, index) => {
    const next = periods[index + 1];
    const length = next
      ? dayNumber(next.start) - dayNumber(period.start)
      : null;
    return {
      start: period.start,
      next: next?.start ?? null,
      length,
      day: next ? null : dayNumber(today) - dayNumber(period.start) + 1,
      periodLength: period.end
        ? dayNumber(period.end) - dayNumber(period.start)
        : measuredRun(state, period),
      expectedPeriodLength: period.length,
      gap: length !== null && length > missedLogGap,
      pain: peakPain(state, period),
    };
  });
}

// The strongest pain logged during a period, or null when none was rated.
function peakPain(state, period) {
  const days = Math.max(
    period.end ? dayNumber(period.end) - dayNumber(period.start) : 0,
    bleedingRun(state, period.start, period.length),
  );
  let peak = null;
  for (let offset = 0; offset < days; offset++) {
    const log = state.logs[keyAt(dayNumber(period.start) + offset)];
    const score = painScore[log?.pain];
    if (score) peak = Math.max(peak ?? 0, score);
  }
  return peak;
}

export const painName = (score) => painLevels[score - 1]?.name ?? "";

function measuredRun(state, period) {
  const run = bleedingRun(state, period.start, period.length);
  return run > period.length ? run : null;
}

export function cycleStats(cycles) {
  const recent = cycles
    .filter((cycle) => cycle.length !== null && !cycle.gap)
    .slice(-recentCycleCount);
  const lengths = recent.map((cycle) => cycle.length);
  const periodLengths = cycles
    .map((cycle) => cycle.periodLength)
    .filter((length) => length !== null)
    .slice(-recentCycleCount);
  return {
    cycleCount: lengths.length,
    averageCycle: lengths.length ? Math.round(average(lengths)) : null,
    shortest: lengths.length ? Math.min(...lengths) : null,
    longest: lengths.length ? Math.max(...lengths) : null,
    variation:
      lengths.length > 1 ? Math.max(...lengths) - Math.min(...lengths) : null,
    periodCount: periodLengths.length,
    averagePeriod: periodLengths.length
      ? Math.round(average(periodLengths))
      : null,
  };
}

export function regularityLabel(variation) {
  if (variation === null) return "";
  if (variation <= 7) return "Fairly regular";
  if (variation <= typical.variationMax) return "Varies a little";
  return "Varies more than typical";
}

// Predictions use the settings; offer the recorded average once two cycles
// agree it differs, but never change the settings without asking.
export function settingSuggestions(profile, stats) {
  const suggestions = [];
  if (
    stats.cycleCount >= 2 &&
    Math.abs(stats.averageCycle - profile.cycleLength) >= 2
  )
    suggestions.push({
      field: "cycleLength",
      label: "cycle",
      current: profile.cycleLength,
      value: Math.min(45, Math.max(21, stats.averageCycle)),
      basis: stats.cycleCount,
    });
  if (
    stats.periodCount >= 2 &&
    Math.abs(stats.averagePeriod - profile.periodLength) >= 1
  )
    suggestions.push({
      field: "periodLength",
      label: "period",
      current: profile.periodLength,
      value: Math.min(10, Math.max(2, stats.averagePeriod)),
      basis: stats.periodCount,
    });
  return suggestions.filter(
    (suggestion) => suggestion.value !== suggestion.current,
  );
}

// Bleeding logged on a day no recorded period covers. Spotting in the two
// days before a start is common, so it does not count.
function spottingCycles(state, cycles) {
  const cycleStarts = new Set();
  for (const [date, log] of Object.entries(state.logs)) {
    if (!bleeding(log)) continue;
    const cycle = cycles.findLast((c) => c.start <= date);
    if (!cycle) continue;
    const day = dayNumber(date) - dayNumber(cycle.start);
    const periodEnd = bleedingRun(
      state,
      cycle.start,
      Math.max(cycle.periodLength ?? 0, cycle.expectedPeriodLength),
    );
    const beforeNext =
      cycle.next && dayNumber(cycle.next) - dayNumber(date) <= 2;
    if (day >= periodEnd && !beforeNext) cycleStarts.add(cycle.start);
  }
  return cycleStarts.size;
}

// Patterns worth mentioning to a healthcare professional, from recorded data
// only. These are prompts to notice, never a diagnosis.
export function healthNotes(state, cycles, stats) {
  const recent = cycles.slice(-recentCycleCount - 1);
  const complete = recent.filter((c) => c.length !== null && !c.gap);
  const notes = [];
  const short = complete.filter((c) => c.length < typical.cycleMin).length;
  if (short)
    notes.push(
      `${short === 1 ? "One recent cycle was" : `${short} recent cycles were`} shorter than ${typical.cycleMin} days.`,
    );
  const long = complete.filter((c) => c.length > typical.cycleMax).length;
  if (long)
    notes.push(
      `${long === 1 ? "One recent cycle was" : `${long} recent cycles were`} longer than ${typical.cycleMax} days.`,
    );
  if (stats.cycleCount >= 3 && stats.variation > typical.variationMax)
    notes.push(
      `Your cycle length has varied by ${stats.variation} days. Up to 7–9 days is typical.`,
    );
  const prolonged = recent.filter(
    (c) => c.periodLength !== null && c.periodLength > typical.periodMax,
  ).length;
  if (prolonged)
    notes.push(
      `${prolonged === 1 ? "One recent period" : `${prolonged} recent periods`} lasted longer than ${typical.periodMax} days.`,
    );
  if (spottingCycles(state, recent) >= 2)
    notes.push("You logged bleeding between periods in more than one cycle.");
  const pains = recent.map((c) => c.pain).filter((pain) => pain !== null);
  const severe = pains.slice(-3).filter((pain) => pain === 3).length;
  if (severe >= 2)
    notes.push(
      `You rated period pain severe in ${severe} of your last ${Math.min(3, pains.length)} rated periods. Pain that gets in the way of your day is worth getting checked.`,
    );
  // A steady climb across at least three rated periods.
  let climb = 1;
  while (climb < pains.length && pains.at(-climb - 1) <= pains.at(-climb))
    climb++;
  if (climb >= 3 && pains.at(-1) > pains.at(-climb))
    notes.push(
      `Your period pain has been getting stronger over your last ${climb} rated periods.`,
    );
  return notes;
}

// The next start, as a range from this person's own shortest and longest
// recent cycles around the date the app predicts. Until two cycles exist, a
// few days either side stands in, more when setup said cycles vary.
export function nextPeriodRange(profile, stats, today) {
  const likely = dayNumber(profile.lastPeriod) + profile.cycleLength;
  const measured = stats.cycleCount >= 2;
  const fallback = ["varies", "irregular"].includes(profile.regularity) ? 5 : 3;
  // No cycle repeats to the day, so keep at least a day either side.
  const before = Math.max(
    1,
    measured ? profile.cycleLength - stats.shortest : fallback,
  );
  const after = Math.max(
    1,
    measured ? stats.longest - profile.cycleLength : fallback,
  );
  return {
    likely: keyAt(likely),
    earliest: keyAt(likely - before),
    latest: keyAt(likely + after),
    before,
    after,
    measured,
    lateBy: Math.max(0, dayNumber(today) - likely - after),
  };
}

// Days before a period when premenstrual symptoms commonly show up.
export const premenstrualDays = 5;

const moodScore = Object.fromEntries(
  moods.map((mood, index) => [mood.name, index]),
);

// Recurring symptoms from completed cycles, projected onto the dates ahead.
// Each symptom is timed from whichever anchor it follows more closely: the
// start of a period (cramps on days 1–2) or the next one (bloating before it).
export function symptomForecast(state, cycles, range, today) {
  const complete = cycles
    .filter((c) => c.length !== null && !c.gap)
    .slice(-recentCycleCount);
  const onsets = {};
  for (const cycle of complete) {
    const start = dayNumber(cycle.start);
    const seen = new Set();
    for (let offset = 0; offset < cycle.length; offset++) {
      for (const symptom of state.logs[keyAt(start + offset)]?.symptoms || []) {
        if (seen.has(symptom)) continue;
        seen.add(symptom);
        let run = 1;
        while (
          offset + run < cycle.length &&
          state.logs[keyAt(start + offset + run)]?.symptoms?.includes(symptom)
        )
          run++;
        (onsets[symptom] ||= []).push({
          fromStart: offset,
          toNext: cycle.length - offset,
          run,
        });
      }
    }
  }
  const likely = dayNumber(range.likely);
  const currentStart = dayNumber(cycles.at(-1).start);
  const items = [];
  for (const [name, list] of Object.entries(onsets)) {
    // A pattern needs two cycles and at least half of the recent ones.
    if (list.length < 2 || list.length * 2 < complete.length) continue;
    const fromStart = list.map((o) => o.fromStart);
    const toNext = list.map((o) => o.toNext);
    const anchor = spread(toNext) < spread(fromStart) ? "next" : "start";
    const offset = median(anchor === "next" ? toNext : fromStart);
    // Days before the period stop at the period itself.
    const run = Math.min(
      median(list.map((o) => o.run)),
      anchor === "next" ? offset : Infinity,
    );
    let start = anchor === "next" ? likely - offset : currentStart + offset;
    // Already past in this cycle, so it next comes with the coming period.
    if (anchor === "start" && keyAt(start + run - 1) < today)
      start = likely + offset;
    items.push({
      kind: "symptom",
      name,
      anchor,
      offset,
      run,
      cycles: list.length,
      of: complete.length,
      start: keyAt(start),
      end: keyAt(start + run - 1),
    });
  }
  const dip = moodDip(state, complete);
  if (dip)
    items.push({
      kind: "mood",
      name: "Lower mood",
      anchor: "next",
      offset: premenstrualDays,
      run: premenstrualDays,
      ...dip,
      start: keyAt(likely - premenstrualDays),
      end: keyAt(likely - 1),
    });
  return items
    .filter((item) => item.end >= today)
    .sort((a, b) => a.start.localeCompare(b.start) || b.cycles - a.cycles);
}

// The comparison clinicians use for premenstrual mood changes: the five days
// before a period against days 4–12, in each cycle with moods in both.
function moodDip(state, complete) {
  const scores = (start, from, to) =>
    Array.from(
      { length: to - from },
      (_, i) => state.logs[keyAt(start + from + i)]?.mood,
    )
      .filter((mood) => mood in moodScore)
      .map((mood) => moodScore[mood]);
  let eligible = 0;
  let dips = 0;
  for (const cycle of complete) {
    const start = dayNumber(cycle.start);
    const before = scores(start, cycle.length - premenstrualDays, cycle.length);
    const baseline = scores(start, 3, 12);
    if (!before.length || !baseline.length) continue;
    eligible++;
    if (average(baseline) - average(before) >= 1) dips++;
  }
  return dips >= 2 && dips * 2 > eligible
    ? { cycles: dips, of: eligible }
    : null;
}

// "Days 1–2 of your cycle" or "About 4 days before your period".
export function forecastTiming({ anchor, offset, run }) {
  if (anchor === "next")
    return `About ${offset} ${offset === 1 ? "day" : "days"} before your period`;
  const first = offset + 1;
  const last = offset + run;
  return first === last
    ? `Day ${first} of your cycle`
    : `Days ${first}–${last} of your cycle`;
}

const formatDate = (key) =>
  new Date(`${key}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

// Plain text a person can paste into a message or read out at an appointment.
export function insightsSummary({ cycles, stats, notes, forecast }) {
  const lines = ["My cycle summary (from periodt)", ""];
  const latest = cycles.at(-1);
  if (latest) lines.push(`Last period started: ${formatDate(latest.start)}`);
  if (stats.cycleCount)
    lines.push(
      `Average cycle: ${stats.averageCycle} days (${stats.shortest}–${stats.longest}, last ${stats.cycleCount} ${stats.cycleCount === 1 ? "cycle" : "cycles"})`,
    );
  if (stats.periodCount)
    lines.push(`Average period: ${stats.averagePeriod} days`);
  const recent = cycles
    .filter((c) => c.length !== null)
    .slice(-recentCycleCount);
  if (recent.length) {
    lines.push("", "Recent cycles:");
    for (const cycle of recent.toReversed())
      lines.push(
        `- ${formatDate(cycle.start)}: ${cycle.length} days${cycle.periodLength !== null ? `, period ${cycle.periodLength} days` : ""}${cycle.pain ? `, ${painName(cycle.pain).toLowerCase()} pain` : ""}`,
      );
  }
  if (forecast.length)
    lines.push(
      "",
      "Recurring symptoms:",
      ...forecast.map(
        (item) =>
          `- ${item.name}: ${forecastTiming(item)} (${item.cycles} of ${item.of} cycles)`,
      ),
    );
  if (notes.length)
    lines.push("", "Worth discussing:", ...notes.map((n) => `- ${n}`));
  return lines.join("\n");
}

// "Oct 27–31", or "Oct 30 – Nov 2" across months.
export function dateRangeLabel(startKey, endKey) {
  const format = (key, options) =>
    new Date(`${key}T12:00:00`).toLocaleDateString("en-US", options);
  const start = format(startKey, { month: "short", day: "numeric" });
  if (startKey === endKey) return start;
  return startKey.slice(0, 7) === endKey.slice(0, 7)
    ? `${start}–${format(endKey, { day: "numeric" })}`
    : `${start} – ${format(endKey, { month: "short", day: "numeric" })}`;
}
