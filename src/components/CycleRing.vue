<script setup>
import { computed } from "vue";
import { phaseSegments } from "../lib/cyclePhases";
import Icon from "./AppIcon.vue";
const props = defineProps({
  day: Number,
  cycleLength: Number,
  periodLength: Number,
  phase: String,
  detailed: Boolean,
  label: { type: String, default: "DAY" },
});
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
  <div class="living-ring" :class="{ 'living-ring-detailed': detailed }" :data-phase="phase">
    <svg class="living-ring-svg" viewBox="0 0 240 240" aria-hidden="true">
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
          :stroke-width="detailed && phase === p.name ? 17 : 13"
          stroke-linecap="round"
          :stroke-dasharray="`${Math.max(0, (p.days / cycleLength) * circumference - 9)} ${circumference}`"
          :stroke-dashoffset="
            (-(p.start - 1) / cycleLength) * circumference - 4.5
          "
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
          fill="#fcfcf3"
          stroke="var(--ring-accent, #526a40)"
          stroke-width="3"
        />
        <circle cx="120" cy="26" r="3" fill="var(--ring-accent, #526a40)" />
      </g>
    </svg>
    <div class="living-ring-center">
      <Icon v-if="detailed" :name="phaseIcons[phase]" :size="23" />
      <span>{{ label }}</span>
      <Transition name="day-number" mode="out-in"
        ><strong :key="day">{{ day }}</strong></Transition
      >
      <span class="living-ring-phase">{{
        phase === "Unconfirmed" ? "Phase unconfirmed" : phase + " phase"
      }}</span>
      <span v-if="!detailed" class="living-ring-spark">✧</span>
    </div>
  </div>
</template>
<style scoped>
.living-ring {
  width: 100%;
  position: relative;
  color: var(--ring-accent, #64794e);
  transition: color .6s;
}
.living-ring[data-phase="Ovulation"] { --ring-accent: #a6577d; }
.living-ring[data-phase="Ovulation"] .living-ring-center > span:first-of-type,
.living-ring[data-phase="Ovulation"] .living-ring-center strong,
.living-ring[data-phase="Ovulation"] .living-ring-spark { color: var(--ring-accent); }
.living-ring-marker circle { transition: fill .6s, stroke .6s; }
.living-ring-center strong,.living-ring-center>span { transition: color .6s; }
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
  pointer-events: none;
}
.living-ring-center > span:first-of-type {
  font-size: 8px;
  letter-spacing: 1.8px;
  color: #7c8a67;
}
.living-ring-center strong {
  font:
    500 clamp(40px, 4.4vw, 62px)/1.15 "Lora",
    serif;
  color: #4f633e;
  letter-spacing: -2px;
}
.living-ring-phase {
  font-size: 9px;
  margin-top: 4px;
}
.living-ring-spark {
  font-size: 19px;
  margin-top: 6px;
  color: #88966f;
}
.living-ring-marker {
  transform-origin: 120px 120px;
  transition: transform 0.75s cubic-bezier(0.22, 1, 0.36, 1);
}
.living-ring-arc {
  transition:
    stroke-width 0.45s,
    opacity 0.45s,
    stroke-dasharray 0.6s;
}
.ring-arcs {
  animation: ring-arrive 1s ease-out both;
}
.living-ring-detailed .living-ring-center > svg {
  margin-bottom: 12px;
}
.living-ring-detailed .living-ring-center strong {
  font-size: 68px;
}
.living-ring-detailed .living-ring-phase {
  font-size: 12px;
}
.living-ring-detailed .living-ring-center > span:first-of-type {
  font-size: 9px;
}
.day-number-enter-active,
.day-number-leave-active {
  transition:
    opacity 0.13s,
    translate 0.13s;
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
  .day-number-enter-active,
  .day-number-leave-active {
    transition: none;
  }
}
</style>
