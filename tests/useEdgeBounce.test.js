import test from "node:test";
import assert from "node:assert/strict";
import { flingOvershoot, rubberBand } from "../src/composables/useEdgeBounce.js";

test("the rubber band resists more the further it is pulled", () => {
  assert.equal(rubberBand(0, 300), 0);
  const near = rubberBand(30, 300);
  const far = rubberBand(300, 300);
  assert.ok(near > 0 && near < 30);
  assert.ok(far < 300 * 0.55);
  assert.ok(far - rubberBand(270, 300) < near);
  assert.ok(rubberBand(1e6, 300) < 300);
  assert.equal(rubberBand(-60, 300), -rubberBand(60, 300));
});

test("a fling overshoots with its speed, up to a limit", () => {
  assert.equal(flingOvershoot(0.5), 11);
  assert.equal(flingOvershoot(-0.5), -11);
  assert.equal(flingOvershoot(10), 36);
});
