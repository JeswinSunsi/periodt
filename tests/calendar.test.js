import test from "node:test";
import assert from "node:assert/strict";
import { monthDates } from "../src/lib/calendar.js";

const key = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

test("October 2026 places the 1st on Thursday and the 31st on Saturday", () => {
  const dates = monthDates(2026, 9);
  assert.equal(dates.length, 35);
  assert.equal(key(dates[0]), "2026-09-28");
  assert.equal(key(dates[3]), "2026-10-01");
  assert.equal(key(dates[33]), "2026-10-31");
  assert.equal(key(dates[34]), "2026-11-01");
});

test("months have complete weeks, aligned weekdays, and no skipped or repeated dates", () => {
  for (let year = 2024; year <= 2028; year++) {
    for (let month = 0; month < 12; month++) {
      const dates = monthDates(year, month);
      assert.equal(dates.length % 7, 0);
      assert.equal(dates[0].getDay(), 1);
      assert.equal(dates.at(-1).getDay(), 0);
      const inMonth = dates.filter((date) => date.getMonth() === month);
      const count = new Date(year, month + 1, 0).getDate();
      assert.deepEqual(
        inMonth.map((date) => date.getDate()),
        Array.from({ length: count }, (_, index) => index + 1),
      );
      dates.forEach((date, index) => {
        assert.equal(date.getDay(), (index + 1) % 7);
        if (index) {
          const previous = dates[index - 1];
          assert.equal(
            key(date),
            key(
              new Date(
                previous.getFullYear(),
                previous.getMonth(),
                previous.getDate() + 1,
              ),
            ),
          );
        }
      });
    }
  }
});
