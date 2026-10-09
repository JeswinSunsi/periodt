// A Monday-first month, padded to complete weeks with adjacent-month dates.
export function monthDates(year, month) {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0, 12).getDate();
  return Array.from(
    { length: Math.ceil((offset + days) / 7) * 7 },
    (_, index) => new Date(year, month, index - offset + 1, 12),
  );
}
