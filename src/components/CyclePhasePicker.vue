<script setup>
import Icon from "./AppIcon.vue";

defineProps({
  segments: { type: Array, required: true },
  selectedPhase: { type: String, required: true },
  currentPhase: { type: String, required: true },
});
const emit = defineEmits(["select"]);

const rangeLabel = (phase) =>
  !phase.days
    ? "No estimate available"
    : phase.days === 1
      ? `Around day ${phase.start}`
      : `Days ${phase.start}–${phase.end}`;
</script>

<template>
  <section class="cycle-phase-picker" aria-labelledby="cycle-phases-title">
    <div class="phase-index-layout">
      <div class="phase-index-intro">
        <h2 id="cycle-phases-title">The four phases</h2>
        <p>Choose a phase to take a closer look.</p>
      </div>

      <div
        class="phase-index-list"
        role="group"
        aria-label="Explore cycle phases"
      >
        <button
          v-for="(p, index) in segments"
          :key="p.name"
          type="button"
          class="phase-index-row"
          :class="{ 'is-selected': selectedPhase === p.name }"
          :style="{ '--phase-color': p.color }"
          :data-phase="p.name"
          :aria-pressed="selectedPhase === p.name"
          :disabled="!p.days"
          @click="emit('select', p)"
        >
          <span class="phase-index-number" aria-hidden="true">
            {{ String(index + 1).padStart(2, "0") }}
          </span>
          <span class="phase-index-copy">
            <span class="phase-index-name">{{ p.name }}</span>
            <span class="phase-index-days">{{ rangeLabel(p) }}</span>
          </span>
          <span v-if="currentPhase === p.name" class="phase-index-current">
            <span><i aria-hidden="true"></i>Your phase</span>
            <small>Estimated</small>
          </span>
          <span class="phase-index-action" aria-hidden="true">
            <Icon
              :name="selectedPhase === p.name ? 'ArrowRight' : 'ChevronRight'"
              :size="16"
            />
          </span>
        </button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.cycle-phase-picker {
  container-type: inline-size;
}

.phase-index-layout {
  display: grid;
  gap: 20px;
}

.phase-index-intro h2 {
  color: var(--text-heading);
  font-size: 25px;
  line-height: 1.3;
  letter-spacing: -0.7px;
}

.phase-index-intro p {
  margin-top: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.6;
}

.phase-index-list {
  border-top: 1px solid var(--border-strong);
}

.phase-index-row {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto 28px;
  align-items: center;
  gap: 14px;
  width: 100%;
  min-height: 82px;
  padding: 14px 12px;
  border: 0;
  border-bottom: 1px solid var(--border);
  border-radius: 0;
  background: transparent;
  text-align: left;
  transition: background 0.18s;
}

.phase-index-row:hover:not(:disabled) {
  background: var(--surface-subtle);
}

.phase-index-row.is-selected {
  background: color-mix(in srgb, var(--phase-color) 12%, var(--page-bg));
}

.phase-index-row.is-selected:hover {
  background: color-mix(in srgb, var(--phase-color) 19%, var(--page-bg));
}

.phase-index-row:focus-visible {
  position: relative;
  z-index: 1;
  outline: 2px solid var(--focus-ring);
  outline-offset: -2px;
}

.phase-index-number {
  align-self: start;
  width: 22px;
  margin-top: 5px;
  padding-top: 5px;
  border-top: 2px solid var(--phase-color);
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
  font-variant-numeric: tabular-nums;
}

.phase-index-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.phase-index-name {
  color: var(--text-heading);
  font-family: "Lora", Georgia, serif;
  font-size: 20px;
  line-height: 1.35;
  letter-spacing: -0.35px;
}

.phase-index-days {
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.phase-index-current {
  color: var(--text-heading);
  font-size: 12px;
  line-height: 1.5;
}

.phase-index-current > span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.phase-index-current i {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--accent);
}

.phase-index-current small {
  display: block;
  margin-left: 11px;
  color: var(--text-secondary);
  font-size: 12px;
}

.phase-index-action {
  display: grid;
  grid-column: 4;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  color: var(--text-secondary);
  transition:
    background 0.18s,
    color 0.18s;
}

.is-selected .phase-index-action {
  background: var(--accent);
  color: var(--on-accent);
}

@container (min-width: 760px) {
  .phase-index-layout {
    grid-template-columns: minmax(180px, 0.85fr) minmax(0, 2fr);
    gap: 48px;
  }

  .phase-index-intro {
    padding-top: 15px;
  }

  .phase-index-intro p {
    max-width: 23ch;
  }

  .phase-index-copy {
    grid-template-columns: minmax(0, 1fr) 135px;
    align-items: center;
    gap: 16px;
  }

  .phase-index-row {
    min-height: 74px;
  }

  .phase-index-number {
    align-self: center;
    margin-top: 0;
  }
}

@container (max-width: 350px) {
  .phase-index-row {
    grid-template-columns: 22px minmax(0, 1fr) auto 24px;
    gap: 9px;
    padding-inline: 8px;
  }

  .phase-index-name {
    font-size: 18px;
  }

  .phase-index-action {
    width: 24px;
    height: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .phase-index-row,
  .phase-index-action {
    transition: none;
  }
}
</style>
