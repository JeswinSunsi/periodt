// An empty saved object is not a check-in. Legacy "None" defaults only count
// when no bleeding was explicitly recorded.
export function hasCheckin(log) {
  return !!(
    log &&
    (log.mood?.trim() ||
      log.flowRecorded ||
      (log.flow && log.flow !== "None") ||
      log.symptoms?.length ||
      log.pain ||
      log.notes?.trim() ||
      log.periodStart ||
      log.periodEnd)
  );
}
