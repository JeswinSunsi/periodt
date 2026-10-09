export function isPeriodStart(state, date) {
  return (
    !!state.logs[date]?.periodStart ||
    (!state.profile.demo && state.profile.lastPeriod === date) ||
    state.periodHistory.some((period) => period.start === date)
  );
}

export function removePeriodStart(state, date, sampleDate) {
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
