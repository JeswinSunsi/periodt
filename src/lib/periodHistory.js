export function isPeriodStart(state, date) {
  return (
    !!state.logs[date]?.periodStart ||
    (!state.profile.demo && state.profile.lastPeriod === date) ||
    state.periodHistory.some((period) => period.start === date)
  );
}

const dayNumber = (date) => Date.parse(`${date}T00:00:00Z`) / 86400000;

// Keep the usual duration as a prediction; explicit no-flow check-ins can
// shorten individual periods without changing that setting or other cycles.
export function periodWindows(state, today) {
  const starts = new Map(
    state.periodHistory.map((p) => [p.start, { ...p, sample: false }]),
  );
  for (const [date, log] of Object.entries(state.logs)) {
    if (log.periodStart && !starts.has(date))
      starts.set(date, {
        start: date,
        length: state.profile.periodLength,
        sample: false,
      });
  }
  if (!state.profile.demo || !starts.has(state.profile.lastPeriod))
    starts.set(state.profile.lastPeriod, {
      start: state.profile.lastPeriod,
      length: state.profile.periodLength,
      sample: !!state.profile.demo,
    });
  const periods = [...starts.values()].sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  const noFlowDates = Object.entries(state.logs)
    .filter(
      ([date, log]) =>
        date <= today &&
        (log.periodEnd === true ||
          (log.flowRecorded === true && log.flow === "None")) &&
        !isPeriodStart(state, date),
    )
    .map(([date]) => date)
    .sort();
  return periods.map((period, index) => {
    const end = period.sample
      ? undefined
      : noFlowDates.find(
          (date) =>
            date > period.start &&
            (state.logs[date].periodEnd === true ||
              dayNumber(date) - dayNumber(period.start) < period.length) &&
            (!periods[index + 1] || date < periods[index + 1].start),
        );
    return {
      ...period,
      expectedLength: period.length,
      length: end
        ? Math.min(period.length, dayNumber(end) - dayNumber(period.start))
        : period.length,
      end,
    };
  });
}

export function periodDayType(
  state,
  date,
  today,
  windows = periodWindows(state, today),
) {
  const log = state.logs[date];
  if (date <= today) {
    if (isPeriodStart(state, date) || (log?.flow && log.flow !== "None"))
      return "period";
    if (log?.flowRecorded && log.flow === "None") return "";
  }
  return windows.some((period) => {
    const elapsed = dayNumber(date) - dayNumber(period.start);
    return elapsed >= 0 && elapsed < period.length;
  })
    ? "expected-period"
    : "";
}

export function removePeriodStart(state, date, sampleDate) {
  if (state.logs[date]) state.logs[date].periodStart = false;
  state.periodHistory = state.periodHistory.filter(
    (period) => period.start !== date,
  );
  if (state.profile.lastPeriod !== date || state.profile.demo) return;

  const starts = [
    ...state.periodHistory.map((period) => period.start),
    ...Object.entries(state.logs)
      .filter(([key, log]) => key !== date && log.periodStart)
      .map(([key]) => key),
  ].sort();
  state.profile.lastPeriod = starts.at(-1) || sampleDate;
  state.profile.demo = starts.length === 0;
}
