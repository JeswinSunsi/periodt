<script setup>
import { computed, ref } from "vue";
import { phaseSegments } from "../lib/cyclePhases";
import Icon from "./AppIcon.vue";
const props = defineProps({
  day: Number,
  cycleLength: Number,
  periodLength: Number,
  phase: String,
  detailed: Boolean,
  interactive: Boolean,
  sweeping: Boolean,
  valueText: String,
  label: { type: String, default: "DAY" },
});
const emit = defineEmits(["select"]);
// While dragging, the marker follows the pointer directly instead of gliding.
const dragging = ref(false);
function dayFromPointer(event) {
  const rect = event.currentTarget.getBoundingClientRect();
  const dx = event.clientX - (rect.left + rect.width / 2);
  const dy = event.clientY - (rect.top + rect.height / 2);
  // Angle measured clockwise from 12 o'clock, matching the marker's rotation.
  const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
  const turn = ((angle + 360) % 360) / 360;
  return Math.min(props.cycleLength, Math.floor(turn * props.cycleLength) + 1);
}
function onPointerDown(event) {
  if (!props.interactive || event.button > 0) return;
  event.currentTarget.setPointerCapture(event.pointerId);
  dragging.value = true;
  emit("select", dayFromPointer(event));
}
function onPointerMove(event) {
  if (dragging.value) emit("select", dayFromPointer(event));
}
function onPointerUp() {
  dragging.value = false;
}
function onKeydown(event) {
  const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[
    event.key
  ];
  let next;
  if (step) next = props.day + step;
  else if (event.key === "PageUp") next = props.day + 7;
  else if (event.key === "PageDown") next = props.day - 7;
  else if (event.key === "Home") next = 1;
  else if (event.key === "End") next = props.cycleLength;
  else return;
  event.preventDefault();
  emit("select", Math.max(1, Math.min(props.cycleLength, next)));
}
const segments = computed(() =>
  phaseSegments(props.cycleLength, props.periodLength).filter((p) => p.days),
);
const circumference = 2 * Math.PI * 94;
const rotation = computed(
  () =>
    ((Math.max(0, Math.min(props.day - 1, props.cycleLength - 1)) + 0.5) /
      props.cycleLength) *
    360,
);
const phaseIcons = {
  Menstrual: "Moon",
  Follicular: "Sprout",
  Ovulation: "Sun",
  Luteal: "Leaf",
  Unconfirmed: "Heart",
};
</script>
<template>
  <div
    class="living-ring"
    :class="{
      'living-ring-detailed': detailed,
      'living-ring-interactive': interactive,
      'is-dragging': dragging,
      'is-sweeping': sweeping,
    }"
    :data-phase="phase"
    :role="interactive ? 'slider' : undefined"
    :tabindex="interactive ? 0 : undefined"
    :aria-label="interactive ? 'Explore a day in your cycle' : undefined"
    :aria-valuemin="interactive ? 1 : undefined"
    :aria-valuemax="interactive ? cycleLength : undefined"
    :aria-valuenow="interactive ? day : undefined"
    :aria-valuetext="interactive ? valueText : undefined"
    @keydown="interactive && onKeydown($event)"
  >
    <svg
      class="living-ring-svg"
      viewBox="0 0 240 240"
      aria-hidden="true"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
    >
      <circle
        cx="120"
        cy="120"
        r="76"
        fill="none"
        stroke="currentColor"
        stroke-opacity=".1"
        stroke-dasharray="1 6"
      />
      <g v-if="detailed" class="ring-day-ticks">
        <line
          v-for="d in cycleLength"
          :key="d"
          x1="120"
          y1="8"
          x2="120"
          :y2="d === 1 || d % 7 === 0 ? 15 : 12"
          :transform="`rotate(${((d - 0.5) / cycleLength) * 360} 120 120)`"
          stroke="currentColor"
          stroke-opacity=".24"
          stroke-linecap="round"
        />
      </g>
      <g class="ring-arcs" transform="rotate(-90 120 120)">
        <circle
          v-for="p in segments"
          :key="p.name"
          class="living-ring-arc"
          cx="120"
          cy="120"
          r="94"
          fill="none"
          :stroke="p.color"
          stroke-width="13"
          stroke-linecap="butt"
          :stroke-dasharray="`${(p.days / cycleLength) * circumference} ${circumference}`"
          :stroke-dashoffset="(-(p.start - 1) / cycleLength) * circumference"
          :opacity="
            !detailed || phase === p.name || phase === 'Unconfirmed' ? 1 : 0.5
          "
        />
      </g>
      <g
        v-if="phase !== 'Unconfirmed'"
        class="living-ring-marker"
        :style="{ transform: `rotate(${rotation}deg)` }"
      >
        <circle
          cx="120"
          cy="26"
          r="11"
          fill="var(--surface)"
          stroke="var(--ring-accent)"
          stroke-width="3"
        />
        <circle cx="120" cy="26" r="3" fill="var(--ring-accent)" />
      </g>
    </svg>
    <div class="living-ring-center">
      <slot>
        <Icon v-if="detailed" :name="phaseIcons[phase]" :size="23" />
        <span>{{ label }}</span>
        <!-- Out-in swaps can't keep up with per-frame changes during a sweep. -->
        <strong v-if="sweeping">{{ day }}</strong>
        <Transition v-else name="day-number" mode="out-in"
          ><strong :key="day">{{ day }}</strong></Transition
        >
      </slot>
    </div>
  </div>
</template>
<style scoped>
.living-ring {
  width: 100%;
  position: relative;
  color: var(--ring-accent);
  transition: color 0.6s;
}
.living-ring[data-phase="Ovulation"] {
  --ring-accent: var(--ring-ovulation-accent);
}
.living-ring[data-phase="Ovulation"] .living-ring-center > span:first-of-type,
.living-ring[data-phase="Ovulation"] .living-ring-center strong {
  color: var(--ring-accent);
}
.living-ring-marker circle {
  transition:
    fill 0.6s,
    stroke 0.6s;
}
.living-ring-center strong,
.living-ring-center > span {
  transition: color 0.6s;
}
.living-ring-svg {
  display: block;
  width: 100%;
  overflow: visible;
}
.living-ring-center {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  pointer-events: none;
}
.living-ring-center > span:first-of-type {
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--text-secondary);
}
.living-ring-center strong {
  font:
    500 clamp(40px, 4.4vw, 62px)/1 "Lora",
    serif;
  color: var(--accent);
  letter-spacing: -2px;
}
.living-ring-marker {
  transform-origin: 120px 120px;
  transition: transform 0.75s cubic-bezier(0.22, 1, 0.36, 1);
}
.living-ring-interactive {
  border-radius: 50%;
  outline: none;
}
.living-ring-interactive .living-ring-svg {
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.living-ring-interactive.is-dragging .living-ring-svg {
  cursor: grabbing;
}
.living-ring-interactive.is-dragging .living-ring-marker,
.living-ring.is-sweeping .living-ring-marker {
  transition: none;
}
.living-ring-interactive .living-ring-marker circle:first-child {
  transition:
    fill 0.6s,
    stroke 0.6s,
    r 0.2s;
}
.living-ring-interactive:hover .living-ring-marker circle:first-child,
.living-ring-interactive.is-dragging .living-ring-marker circle:first-child {
  r: 13px;
}
.living-ring-interactive:focus-visible .living-ring-marker circle:first-child {
  r: 13px;
  stroke-width: 4;
}
.living-ring-arc {
  transition:
    opacity 0.45s,
    stroke-dasharray 0.6s,
    stroke-dashoffset 0.6s;
}
.ring-arcs {
  animation: ring-arrive 1s ease-out both;
}
.living-ring-detailed .living-ring-center > svg {
  margin-bottom: 4px;
}
.living-ring-detailed .living-ring-center strong {
  font-size: 68px;
}
.living-ring-detailed .living-ring-center > span:first-of-type {
  font-size: 12px;
}
/* Must outrank `.living-ring-center strong`, whose 0.6s color transition
   would otherwise set the duration Vue waits on for each swap. */
.living-ring-center strong.day-number-enter-active,
.living-ring-center strong.day-number-leave-active {
  transition:
    opacity 0.12s,
    translate 0.12s;
}
.day-number-enter-from {
  opacity: 0;
  translate: 0 6px;
}
.day-number-leave-to {
  opacity: 0;
  translate: 0 -6px;
}
@keyframes ring-arrive {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@media (max-width: 680px) {
  .living-ring-center strong {
    font-size: 46px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .ring-arcs {
    animation: none;
  }
  .living-ring-marker,
  .living-ring-arc,
  .living-ring-center strong.day-number-enter-active,
  .living-ring-center strong.day-number-leave-active {
    transition: none;
  }
}
</style>
