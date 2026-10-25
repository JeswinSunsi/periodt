import { onBeforeUnmount, watch } from "vue";

// iOS Safari already bounces scroll containers natively.
const nativeBounce =
  typeof CSS !== "undefined" && CSS.supports("-webkit-touch-callout", "none");
const springBack = "cubic-bezier(0.25, 1, 0.5, 1)";

// iOS-style rubber band: the further past the edge, the stronger the
// resistance, approaching but never reaching the container's size.
export function rubberBand(distance, dimension, constant = 0.55) {
  const sign = Math.sign(distance);
  const offset = Math.abs(distance);
  return sign * (1 - 1 / ((offset * constant) / dimension + 1)) * dimension;
}

// How far a fling carries past the edge before springing back, from the
// scroll speed at impact in px/ms.
export function flingOvershoot(velocity, max = 36) {
  return Math.sign(velocity) * Math.min(max, Math.abs(velocity) * 22);
}

// Gives a horizontal scroller the iOS edge bounce elsewhere: dragging past
// either end stretches the track with resistance, and a fling that hits an
// end overshoots slightly before settling.
export function useEdgeBounce(scroller, track) {
  let start = null;
  let stretch = 0;
  let released = false;
  let lastScroll = { left: 0, time: 0, velocity: 0 };
  const reducedMotion = () =>
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  const maxScroll = () =>
    scroller.value.scrollWidth - scroller.value.clientWidth;

  function setStretch(value, transition = "") {
    stretch = value;
    track.value.style.transition = transition;
    track.value.style.transform = value ? `translateX(${value}px)` : "";
  }

  function onTouchStart(event) {
    const touch = event.touches[0];
    start = {
      x: touch.clientX,
      y: touch.clientY,
      scroll: scroller.value.scrollLeft,
      horizontal: null,
    };
    released = false;
    setStretch(0);
  }

  function onTouchMove(event) {
    if (!start) return;
    const touch = event.touches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    // Leave vertical page scrolls alone.
    start.horizontal ??= Math.abs(dx) > Math.abs(dy);
    if (!start.horizontal) return;
    const wanted = start.scroll - dx;
    const past =
      wanted < 0 ? -wanted : wanted > maxScroll() ? maxScroll() - wanted : 0;
    setStretch(rubberBand(past, scroller.value.clientWidth));
  }

  function onTouchEnd() {
    start = null;
    released = true;
    if (stretch) setStretch(0, `transform 0.5s ${springBack}`);
  }

  function onScroll() {
    const now = performance.now();
    const left = scroller.value.scrollLeft;
    const velocity =
      now - lastScroll.time < 100
        ? (left - lastScroll.left) / (now - lastScroll.time)
        : 0;
    lastScroll = { left, time: now, velocity };
    // A momentum scroll after release that reaches an end bounces off it.
    const atEnd = left <= 0 || left >= maxScroll() - 0.5;
    if (released && atEnd && Math.abs(velocity) > 0.3 && !stretch) {
      released = false;
      track.value.animate(
        [
          { transform: "translateX(0)" },
          { transform: `translateX(${-flingOvershoot(velocity)}px)` },
          { transform: "translateX(0)" },
        ],
        { duration: 520, easing: springBack },
      );
    }
  }

  const listeners = {
    touchstart: onTouchStart,
    touchmove: onTouchMove,
    touchend: onTouchEnd,
    touchcancel: onTouchEnd,
    scroll: onScroll,
  };
  const attach = (element, method) => {
    for (const [name, handler] of Object.entries(listeners))
      element?.[method](name, handler, { passive: true });
  };
  // The strip can appear or disappear with the page's state, so follow it.
  watch(
    scroller,
    (element, previous) => {
      attach(previous, "removeEventListener");
      if (!nativeBounce && !reducedMotion())
        attach(element, "addEventListener");
    },
    { immediate: true, flush: "post" },
  );
  onBeforeUnmount(() => attach(scroller.value, "removeEventListener"));
}
