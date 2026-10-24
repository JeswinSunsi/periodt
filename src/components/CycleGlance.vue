<script setup>
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import Icon from "./AppIcon.vue";
import { phaseSegments, phaseStories } from "../lib/cyclePhases.js";
import { todayInCycle } from "../lib/overview.js";
import { useCycle, dateKey } from "../composables/useCycle";

const { state, today, currentPeriodLength } = useCycle();

const now = computed(() =>
  todayInCycle(state.profile, currentPeriodLength.value, dateKey(today)),
);
// What was logged today, so the card reflects the day as it actually is.
const logged = computed(() => {
  const log = state.logs[dateKey(today)];
  if (!log) return "";
  const flow =
    log.flow && log.flow !== "None"
      ? `${log.flow} flow`
      : log.flowRecorded && "No bleeding";
  return [log.mood && `Feeling ${log.mood.toLowerCase()}`, flow]
    .filter(Boolean)
    .join(" · ");
});
const segments = computed(() =>
  phaseSegments(state.profile.cycleLength, currentPeriodLength.value).filter(
    (segment) => segment.days,
  ),
);
const located = computed(() => now.value.phase !== "Unconfirmed");

// The day counts up as the bar draws in, landing with the marker.
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const shown = ref(reduceMotion.matches ? now.value.value : 1);
let frame = 0;
function countTo(target, from = 1) {
  cancelAnimationFrame(frame);
  if (reduceMotion.matches || target <= from) {
    shown.value = target;
    return;
  }
  const start = performance.now();
  const step = (time) => {
    const t = Math.min((time - start) / 900, 1);
    shown.value = Math.round(from + (target - from) * (1 - (1 - t) ** 3));
    if (t < 1) frame = requestAnimationFrame(step);
  };
  frame = requestAnimationFrame(step);
}
watch(
  () => now.value.value,
  (target, previous) => countTo(target, previous ?? 1),
  { immediate: true },
);
onBeforeUnmount(() => cancelAnimationFrame(frame));

// Ambient snowfall on the card's open right side. Fixed pseudo-random values
// keep the scene the same on every render; negative delays start it mid-fall.
const noise = (n) => {
  const x = Math.sin(n * 91.7) * 43758.5453;
  return x - Math.floor(x);
};
const motes = Array.from({ length: 14 }, (_, i) => ({
  left: `${28 + noise(i + 1) * 70}%`,
  "--size": `${4 + noise(i + 21) * 7}px`,
  "--opacity": (0.35 + noise(i + 41) * 0.45).toFixed(2),
  "--sway": `${4 + noise(i + 61) * 9}px`,
  animationDuration: `${10 + noise(i + 81) * 10}s`,
  animationDelay: `${-noise(i + 101) * 20}s`,
}));
const sparkles = [
  { left: "60%", top: "24%", "--size": "13px", animationDelay: "0s" },
  { left: "77%", top: "58%", "--size": "17px", animationDelay: "-1.7s" },
  { left: "89%", top: "38%", "--size": "11px", animationDelay: "-3.1s" },
  { left: "70%", top: "8%", "--size": "9px", animationDelay: "-4.2s" },
];
</script>

<template>
  <RouterLink
    :to="{ name: 'My cycle' }"
    class="glance-card"
    :data-phase="now.phase"
  >
    <div class="glance-sky" aria-hidden="true">
      <span
        v-for="(mote, index) in motes"
        :key="`mote-${index}`"
        class="glance-mote"
        :style="mote"
        ><i></i
      ></span>
      <span
        v-for="(sparkle, index) in sparkles"
        :key="`sparkle-${index}`"
        class="glance-sparkle"
        :style="sparkle"
      ></span>
    </div>
    <Icon class="glance-arrow" name="ArrowUpRight" :size="18" />
    <p class="glance-figure">
      <small>{{ now.label }}</small>
      <strong>{{ shown }}</strong>
      <span v-if="now.unit">{{ now.unit }}</span>
    </p>
    <p class="glance-detail">{{ now.note }}</p>
    <p class="glance-season">
      {{ now.countdown || logged || phaseStories[now.phase].season }}
    </p>
    <div class="glance-bar" aria-hidden="true">
      <span
        v-for="(segment, index) in segments"
        :key="segment.name"
        :class="{
          current: segment.name === now.phase || !located,
          here: located && segment.name === now.phase,
        }"
        :style="{
          flexGrow: segment.days,
          background: segment.color,
          '--i': index,
        }"
      ></span>
      <i v-if="located" :style="{ '--at': now.progress * 100 + '%' }"></i>
    </div>
  </RouterLink>
</template>

<style scoped>
.glance-card {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 18px 18px 22px;
  background: var(--accent-soft);
  border: 1px solid var(--border);
  border-radius: 11px;
  color: inherit;
  text-decoration: none;
}
.glance-card:hover {
  background: var(--accent-soft-hover);
}
.glance-card > :not(.glance-sky, .glance-arrow) {
  position: relative;
}
/* Snowfall lives above the phase bar and fades out toward the text. */
.glance-sky {
  position: absolute;
  inset: 0 0 46px;
  container-type: size;
  overflow: hidden;
  color: var(--ring-accent);
  pointer-events: none;
  mask-image: linear-gradient(90deg, transparent 50%, #000 85%);
}
.glance-card[data-phase="Ovulation"] .glance-sky {
  color: var(--ring-ovulation-accent);
}
.glance-mote {
  position: absolute;
  top: 0;
  width: var(--size);
  height: var(--size);
  animation: glance-fall linear infinite;
}
.glance-mote i {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle, currentColor 30%, transparent 70%);
  opacity: var(--opacity);
  animation: glance-sway 3.4s ease-in-out infinite alternate;
  animation-delay: inherit;
}
/* A solid four-point star. */
.glance-sparkle {
  position: absolute;
  width: var(--size);
  height: var(--size);
  background: currentColor;
  clip-path: polygon(
    50% 0,
    61% 39%,
    100% 50%,
    61% 61%,
    50% 100%,
    39% 61%,
    0 50%,
    39% 39%
  );
  opacity: 0;
  animation: glance-twinkle 5s ease-in-out infinite;
}
.glance-arrow {
  position: absolute;
  top: 22px;
  right: 22px;
  color: var(--text-muted);
  transition:
    transform 220ms cubic-bezier(0.2, 0.8, 0.2, 1),
    color 220ms ease;
}
.glance-card:hover .glance-arrow,
.glance-card:focus-visible .glance-arrow {
  color: var(--accent);
  transform: translate(2px, -2px);
}
.glance-figure {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0 10px;
  animation: glance-rise 600ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.glance-figure small {
  flex-basis: 100%;
  margin-bottom: 2px;
  font-size: 14px;
  color: var(--text-secondary);
}
.glance-figure strong {
  font:
    400 56px / 1 "Lora",
    serif;
  letter-spacing: -2px;
  font-variant-numeric: tabular-nums;
  color: var(--accent);
}
.glance-figure span {
  font:
    400 22px "Lora",
    serif;
  color: var(--text-secondary);
}
.glance-detail {
  margin-top: 10px;
  font-size: 14px;
  color: var(--text-body);
  animation: glance-rise 600ms 80ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.glance-season {
  margin-top: 2px;
  font-size: 14px;
  color: var(--text-secondary);
  animation: glance-rise 600ms 160ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.glance-bar {
  position: relative;
  display: flex;
  gap: 3px;
  height: 8px;
  margin-top: auto;
  padding-top: 28px;
  box-sizing: content-box;
}
/* Segments draw in left to right while the marker glides to today. */
.glance-bar span {
  position: relative;
  overflow: hidden;
  flex-basis: 0;
  border-radius: 4px;
  opacity: 0.4;
  transform-origin: left;
  animation: glance-grow 650ms calc(var(--i) * 110ms)
    cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
/* A soft light passes over the current phase now and then. */
.glance-bar span.here::after {
  content: "";
  position: absolute;
  inset: 0;
  width: 45%;
  background: linear-gradient(
    90deg,
    transparent,
    color-mix(in srgb, var(--surface) 75%, transparent),
    transparent
  );
  transform: translateX(-100%);
  animation: glance-sheen 6s 1.4s ease-in-out infinite;
}
.glance-bar span.current {
  opacity: 1;
}
/* Today's marker glides into place, then breathes gently. */
.glance-bar i {
  position: absolute;
  bottom: 4px;
  left: var(--at);
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--surface);
  border: 3px solid var(--ring-accent);
  color: var(--ring-accent);
  transform: translate(-50%, 50%);
  box-sizing: border-box;
  animation: glance-arrive 1100ms cubic-bezier(0.2, 0.8, 0.2, 1) both;
}
.glance-bar i::after {
  content: "";
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  border: 2px solid currentColor;
  opacity: 0;
  animation: glance-pulse 2800ms 1100ms ease-out infinite;
}
.glance-card[data-phase="Ovulation"] .glance-bar i {
  border-color: var(--ring-ovulation-accent);
  color: var(--ring-ovulation-accent);
}
@keyframes glance-fall {
  0% {
    opacity: 0;
    transform: translateY(-10px);
  }
  15%,
  75% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: translateY(100cqh);
  }
}
@keyframes glance-sway {
  from {
    transform: translateX(calc(var(--sway) * -1));
  }
  to {
    transform: translateX(var(--sway));
  }
}
@keyframes glance-twinkle {
  0% {
    opacity: 0;
    transform: scale(0.5) rotate(-30deg);
  }
  50% {
    opacity: 0.75;
    transform: scale(1) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: scale(0.5) rotate(30deg);
  }
}
@keyframes glance-grow {
  from {
    transform: scaleX(0);
  }
}
@keyframes glance-sheen {
  0% {
    transform: translateX(-100%);
  }
  35%,
  100% {
    transform: translateX(260%);
  }
}
@keyframes glance-rise {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
@keyframes glance-arrive {
  from {
    left: 0;
    opacity: 0;
  }
}
@keyframes glance-pulse {
  0% {
    opacity: 0.5;
    transform: scale(1);
  }
  70%,
  100% {
    opacity: 0;
    transform: scale(2.1);
  }
}
@media (prefers-reduced-motion: reduce) {
  .glance-figure,
  .glance-detail,
  .glance-season,
  .glance-bar i,
  .glance-bar i::after,
  .glance-bar span,
  .glance-bar span.here::after,
  .glance-sparkle {
    animation: none;
  }
  .glance-mote {
    display: none;
  }
  .glance-sparkle {
    opacity: 0.5;
  }
}
</style>
