<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";
import CycleRing from "../CycleRing.vue";
import { useCycle } from "../../composables/useCycle.js";

const emit = defineEmits(["reveal", "complete"]);
const { state, cycleDay, phase, currentPeriodLength } = useCycle();
const element = ref(null);
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let revealed = false;
let completed = false;

// Leaves, dots, and sparks that burst from the ring once it has bloomed.
const shapes = ["leaf", "dot", "spark"];
const colors = [
  "var(--phase-menstrual)",
  "var(--phase-follicular)",
  "var(--phase-ovulation)",
  "var(--phase-luteal)",
  "var(--accent-mid)",
];
const particles = Array.from({ length: 16 }, (_, index) => ({
  shape: shapes[index % shapes.length],
  style: {
    "--angle": `${index * 22.5 + (index % 2 ? 9 : -6)}deg`,
    "--distance": 0.78 + ((index * 7) % 5) * 0.08,
    "--spin": `${(index % 2 ? 1 : -1) * (90 + index * 15)}deg`,
    "--delay": `${(index % 4) * 45}ms`,
    color: colors[index % colors.length],
  },
}));

// Soft waves behind the ring. Each repeats every wavelength, so drifting by one
// wavelength loops seamlessly.
const waves = [
  { y: 230, amplitude: 34, wavelength: 520, color: "var(--phase-follicular)" },
  { y: 330, amplitude: 22, wavelength: 380, color: "var(--phase-menstrual)" },
  { y: 450, amplitude: 46, wavelength: 640, color: "var(--accent-mid)" },
  { y: 570, amplitude: 26, wavelength: 440, color: "var(--phase-ovulation)" },
  { y: 680, amplitude: 38, wavelength: 560, color: "var(--phase-luteal)" },
].map(({ y, amplitude, wavelength, color }, index) => {
  const start = -wavelength * 2;
  let d = `M ${start} ${y} q ${wavelength / 4} ${-amplitude} ${wavelength / 2} 0`;
  for (
    let x = start + wavelength / 2;
    x < 1440 + wavelength * 2;
    x += wavelength / 2
  )
    d += ` t ${wavelength / 2} 0`;
  return {
    d,
    style: {
      "--wave": index,
      "--wavelength": `${wavelength}px`,
      "--drift": `${7 + index * 1.3}s`,
      stroke: color,
    },
  };
});

function reveal() {
  if (revealed) return;
  revealed = true;
  emit("reveal");
}
function complete() {
  if (completed) return;
  completed = true;
  reveal();
  emit("complete");
}
function motionChanged() {
  if (motionQuery.matches) complete();
}
onMounted(() => {
  motionQuery.addEventListener("change", motionChanged);
  if (motionQuery.matches) {
    complete();
    return;
  }
  element.value?.focus({ preventScroll: true });
});
onBeforeUnmount(() => motionQuery.removeEventListener("change", motionChanged));
</script>

<template>
  <div
    ref="element"
    class="onboarding-handoff"
    role="status"
    aria-label="Opening your space"
    tabindex="-1"
    @animationend.self="complete"
    @animationcancel.self="complete"
  >
    <svg
      class="onboarding-handoff-waves"
      viewBox="0 0 1440 900"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <g v-for="(wave, index) in waves" :key="index" :style="wave.style">
        <path :d="wave.d" pathLength="1" />
      </g>
    </svg>
    <div class="onboarding-handoff-content">
      <div
        class="onboarding-handoff-ring"
        aria-hidden="true"
        @animationend.self="$event.animationName.endsWith('rise') && reveal()"
      >
        <span class="onboarding-handoff-ripple"></span>
        <span class="onboarding-handoff-ripple"></span>
        <span class="onboarding-handoff-orbit"></span>
        <span class="onboarding-handoff-disc"></span>
        <CycleRing
          :day="cycleDay"
          :cycle-length="state.profile.cycleLength"
          :period-length="currentPeriodLength"
          :phase="phase"
        >
          <span class="brand-flower onboarding-handoff-logo" aria-hidden="true"
            >✳</span
          >
          <strong class="onboarding-handoff-welcome">Welcome</strong>
        </CycleRing>
        <span
          v-for="(particle, index) in particles"
          :key="index"
          class="onboarding-handoff-particle"
          :class="`is-${particle.shape}`"
          :style="particle.style"
          >{{ particle.shape === "spark" ? "✧" : "" }}</span
        >
      </div>
    </div>
  </div>
</template>

<style>
/* About 2.9s: waves draw in and the ring blooms and bursts, the app opens
   beneath, then the waves settle as the view zooms through the ring into it.
   Reduced motion goes straight in. */
.onboarding-handoff {
  position: fixed;
  z-index: 300;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px 16px;
  overflow: hidden;
  background:
    radial-gradient(
      circle at 50% 45%,
      var(--accent-soft) 0,
      transparent min(70vw, 480px)
    ),
    var(--page-bg);
  color: var(--text-heading);
  outline: none;
  animation: onboarding-handoff 2900ms ease-in-out both;
}
.onboarding-handoff-content {
  --ring: clamp(170px, 32vh, 260px);
  position: relative;
  display: grid;
  place-items: center;
}
.onboarding-handoff-waves {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  animation: onboarding-handoff-calm 650ms 2150ms ease-in forwards;
  transform-origin: 50% 50%;
}
.onboarding-handoff-waves g {
  animation: onboarding-handoff-drift var(--drift) linear infinite;
}
.onboarding-handoff-waves path {
  fill: none;
  stroke: inherit;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-opacity: 0.55;
  stroke-dasharray: 1;
  vector-effect: non-scaling-stroke;
  animation: onboarding-handoff-draw 1500ms calc(var(--wave) * 120ms)
    cubic-bezier(0.4, 0, 0.2, 1) both;
}
.onboarding-handoff-ring {
  position: relative;
  display: grid;
  place-items: center;
  width: var(--ring);
  animation:
    onboarding-handoff-rise 700ms 150ms cubic-bezier(0.2, 0.7, 0.3, 1) both,
    onboarding-handoff-zoom 600ms 2150ms cubic-bezier(0.55, 0, 0.7, 0.2)
      forwards;
}
.onboarding-handoff-ring > .living-ring {
  position: relative;
}
/* Keeps the waves from crossing the day; it clears as the zoom begins. */
.onboarding-handoff-disc {
  position: absolute;
  inset: 8%;
  border-radius: 50%;
  background: color-mix(in srgb, var(--accent-soft) 55%, var(--page-bg));
  box-shadow: 0 0 0 10px
    color-mix(in srgb, var(--accent-soft) 55%, var(--page-bg));
  animation: onboarding-handoff-out 250ms 2150ms ease-in forwards;
}
.onboarding-handoff-orbit,
.onboarding-handoff-ripple {
  position: absolute;
  inset: -13%;
  border-radius: 50%;
  pointer-events: none;
}
.onboarding-handoff-orbit {
  border: 1px dashed var(--border-accent);
  animation:
    onboarding-handoff-fade 900ms 300ms ease-out both,
    onboarding-handoff-spin 24s linear infinite;
}
.onboarding-handoff-ripple {
  border: 2px solid var(--accent-mid);
  animation: onboarding-handoff-ripple 1300ms 1150ms ease-out both;
}
.onboarding-handoff-ripple + .onboarding-handoff-ripple {
  animation-delay: 1450ms;
}
.onboarding-handoff-particle {
  position: absolute;
  top: 50%;
  left: 50%;
  margin: -6px 0 0 -6px;
  pointer-events: none;
  animation: onboarding-handoff-burst 1200ms calc(1250ms + var(--delay))
    cubic-bezier(0.15, 0.75, 0.3, 1) both;
}
.onboarding-handoff-particle.is-leaf {
  width: 12px;
  height: 19px;
  border-radius: 0 100% 0 100%;
  background: currentColor;
}
.onboarding-handoff-particle.is-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: currentColor;
}
.onboarding-handoff-particle.is-spark {
  font:
    22px/12px Georgia,
    serif;
}
.onboarding-handoff .ring-arcs {
  animation: none;
}
.onboarding-handoff .living-ring-arc {
  animation: onboarding-handoff-fade 520ms ease-out both;
}
.onboarding-handoff .living-ring-arc:nth-child(1) {
  animation-delay: 300ms;
}
.onboarding-handoff .living-ring-arc:nth-child(2) {
  animation-delay: 450ms;
}
.onboarding-handoff .living-ring-arc:nth-child(3) {
  animation-delay: 600ms;
}
.onboarding-handoff .living-ring-arc:nth-child(4) {
  animation-delay: 750ms;
}
.onboarding-handoff .living-ring-marker {
  animation: onboarding-handoff-marker 900ms 600ms
    cubic-bezier(0.22, 1, 0.36, 1) both;
}
.onboarding-handoff .living-ring-center {
  animation:
    onboarding-handoff-rise 500ms 900ms ease-out both,
    onboarding-handoff-out 250ms 1950ms ease-in forwards;
}
.onboarding-handoff-logo {
  margin-top: 0;
  color: var(--accent);
  font-size: clamp(32px, 5.5vh, 46px);
}
.onboarding-handoff-welcome {
  font:
    500 calc(var(--ring) * 0.115) / 1 "Lora",
    serif;
  color: var(--accent);
  letter-spacing: -1px;
}
.app-shell.app-entering {
  animation: onboarding-app-arrive 480ms ease-out both;
}
@keyframes onboarding-handoff {
  0%,
  100% {
    opacity: 0;
  }
  8.5%,
  88% {
    opacity: 1;
  }
}
@keyframes onboarding-handoff-rise {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes onboarding-handoff-fade {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@keyframes onboarding-handoff-out {
  to {
    opacity: 0;
    transform: translateY(-6px);
  }
}
@keyframes onboarding-handoff-spin {
  to {
    rotate: 360deg;
  }
}
@keyframes onboarding-handoff-ripple {
  from {
    opacity: 0.7;
    transform: scale(0.82);
  }
  to {
    opacity: 0;
    transform: scale(1.5);
  }
}
@keyframes onboarding-handoff-burst {
  0% {
    opacity: 0;
    transform: rotate(var(--angle)) translateY(calc(var(--ring) * -0.42))
      scale(0.3);
  }
  15%,
  60% {
    opacity: 1;
  }
  100% {
    opacity: 0;
    transform: rotate(var(--angle))
      translateY(calc(var(--ring) * var(--distance) * -1)) rotate(var(--spin))
      scale(1);
  }
}
/* Only a start frame, so the marker sweeps to the day the ring already shows. */
@keyframes onboarding-handoff-marker {
  from {
    opacity: 0;
    transform: rotate(0deg);
  }
}
@keyframes onboarding-handoff-draw {
  from {
    stroke-dashoffset: 1;
  }
  to {
    stroke-dashoffset: 0;
  }
}
@keyframes onboarding-handoff-drift {
  to {
    transform: translateX(calc(var(--wavelength) * -1));
  }
}
/* As the view zooms into the app, the waves flatten and fade. */
@keyframes onboarding-handoff-calm {
  to {
    opacity: 0;
    transform: scaleY(0.15);
  }
}
/* The exit: the view rushes through the ring into the app. */
@keyframes onboarding-handoff-zoom {
  40% {
    opacity: 1;
  }
  to {
    opacity: 0;
    transform: scale(7);
  }
}
@keyframes onboarding-app-arrive {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .onboarding-handoff,
  .onboarding-handoff *,
  .app-shell.app-entering {
    animation: none;
  }
}
</style>
