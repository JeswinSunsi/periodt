<script setup>
import { computed } from "vue";
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
</script>

<template>
  <RouterLink
    :to="{ name: 'My cycle' }"
    class="glance-card"
    :data-phase="now.phase"
  >
    <Icon class="glance-arrow" name="ArrowUpRight" :size="18" />
    <p class="glance-figure">
      <small>{{ now.label }}</small>
      <strong>{{ now.value }}</strong>
      <span v-if="now.unit">{{ now.unit }}</span>
    </p>
    <p class="glance-detail">{{ now.note }}</p>
    <p class="glance-season">
      {{ logged || phaseStories[now.phase].season }}
    </p>
    <div class="glance-bar" aria-hidden="true">
      <span
        v-for="segment in segments"
        :key="segment.name"
        :class="{ current: segment.name === now.phase || !located }"
        :style="{ flexGrow: segment.days, background: segment.color }"
      ></span>
      <i v-if="located" :style="{ '--at': now.progress * 100 + '%' }"></i>
    </div>
  </RouterLink>
</template>

<style scoped>
.glance-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 22px 24px 26px;
  background: var(--accent-soft);
  border: 1px solid var(--border);
  border-radius: 11px;
  color: inherit;
  text-decoration: none;
}
.glance-card:hover {
  background: var(--accent-soft-hover);
}
.glance-arrow {
  position: absolute;
  top: 22px;
  right: 22px;
  color: var(--text-muted);
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
    400 clamp(56px, 6vw, 76px) / 1 "Lora",
    serif;
  letter-spacing: -2px;
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
.glance-bar span {
  flex-basis: 0;
  border-radius: 4px;
  opacity: 0.4;
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
  .glance-bar i::after {
    animation: none;
  }
}
@media (max-width: 680px) {
  .glance-card {
    padding: 18px 18px 22px;
  }
}
</style>
