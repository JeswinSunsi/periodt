import test from "node:test";
import assert from "node:assert/strict";
import {
  phaseSegments,
  phaseAtDay,
  cycleTiming,
  calendarEstimateAtDay,
} from "../src/lib/cyclePhases.js";

test("a 28-day cycle has one predicted start, ovulation on day 14, and a six-day fertile window", () => {
  assert.deepEqual(cycleTiming(28), {
    nextPeriodDay: 29,
    ovulationDay: 14,
    fertileStartDay: 9,
    fertileEndDay: 14,
  });
  assert.equal(calendarEstimateAtDay(8, 28), "");
  for (let day = 9; day <= 13; day++)
    assert.equal(calendarEstimateAtDay(day, 28), "fertile");
  assert.equal(calendarEstimateAtDay(14, 28), "ovulation");
  assert.equal(calendarEstimateAtDay(15, 28), "");
  assert.equal(calendarEstimateAtDay(28, 28), "");
  assert.equal(calendarEstimateAtDay(29, 28), "predicted");
  assert.equal(calendarEstimateAtDay(30, 28), "");
});

test("calendar and phase estimates agree for every supported cycle length", () => {
  for (let length = 21; length <= 45; length++) {
    const timing = cycleTiming(length);
    assert.equal(timing.fertileEndDay - timing.fertileStartDay + 1, 6);
    assert.equal(phaseAtDay(timing.ovulationDay, length, 5), "Ovulation");
    const days = Array.from({ length: length + 10 }, (_, i) => i + 1);
    assert.deepEqual(
      days.filter((day) => calendarEstimateAtDay(day, length) === "predicted"),
      [length + 1],
    );
    assert.equal(
      days.filter((day) => calendarEstimateAtDay(day, length) === "fertile")
        .length,
      5,
    );
  }
});

test("visual segments cover each cycle day exactly once across supported settings", () => {
  for (let length = 21; length <= 45; length++) {
    for (let period = 2; period <= 10; period++) {
      const covered = phaseSegments(length, period)
        .filter((p) => p.days)
        .flatMap((p) => Array.from({ length: p.days }, (_, i) => p.start + i));
      assert.deepEqual(
        covered,
        Array.from({ length }, (_, i) => i + 1),
      );
      assert.equal(phaseAtDay(0, length, period), "Unconfirmed");
      assert.equal(phaseAtDay(length + 1, length, period), "Unconfirmed");
    }
  }
});

test("personalized phase boundaries stay consistent with the ring and day explorer", () => {
  assert.deepEqual(
    phaseSegments(32, 6).map((p) => [p.name, p.start, p.end]),
    [
      ["Menstrual", 1, 6],
      ["Follicular", 7, 17],
      ["Ovulation", 18, 18],
      ["Luteal", 19, 32],
    ],
  );
  assert.equal(phaseAtDay(6, 32, 6), "Menstrual");
  assert.equal(phaseAtDay(7, 32, 6), "Follicular");
  assert.equal(phaseAtDay(18, 32, 6), "Ovulation");
  assert.equal(phaseAtDay(19, 32, 6), "Luteal");
});

test("a long bleeding setting does not generate negative or overlapping visible phases", () => {
  const segments = phaseSegments(21, 10);
  assert.equal(segments.find((p) => p.name === "Follicular").days, 0);
  assert.equal(segments.find((p) => p.name === "Ovulation").days, 0);
  assert.equal(phaseAtDay(7, 21, 10), "Menstrual");
  assert.equal(phaseAtDay(11, 21, 10), "Luteal");
});
