import test from "node:test";
import assert from "node:assert/strict";
import { phaseSegments, phaseAtDay } from "../src/lib/cyclePhases.js";

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
