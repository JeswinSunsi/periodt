<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";
import Icon from "./AppIcon.vue";
import { phaseCopy } from "../lib/content.js";
import { estimateCaveats, phaseSegments } from "../lib/cyclePhases.js";
import { cycleOutlook, relativeDays } from "../lib/overview.js";
import { useCycle, dateKey, fromKey, shortDate } from "../composables/useCycle";
import { useCheckin } from "../composables/useCheckin.js";
import { useDialog } from "../composables/useDialog.js";

const { state, today, currentPeriodLength } = useCycle();
const { openLog } = useCheckin();
const { openDialog } = useDialog();

const outlook = computed(() =>
  cycleOutlook(state.profile, currentPeriodLength.value, dateKey(today)),
);
const icon = computed(() => phaseCopy[outlook.value.phase].icon);
const segments = computed(() =>
  phaseSegments(state.profile.cycleLength, currentPeriodLength.value).filter(
    (segment) => segment.days,
  ),
);
const located = computed(() => outlook.value.phase !== "Unconfirmed");
const barLabel = computed(() =>
  located.value
    ? `Day ${outlook.value.day} of about ${state.profile.cycleLength}, ${outlook.value.phase.toLowerCase()} phase`
    : `Past the estimated ${state.profile.cycleLength}-day cycle`,
);
const note = computed(() =>
  state.profile.demo
    ? "Sample cycle. Add your dates in Cycle settings for your own estimates."
    : estimateCaveats(state.profile)[0],
);
const dates = (milestone) =>
  milestone.endDate
    ? `${shortDate(fromKey(milestone.date))} – ${shortDate(fromKey(milestone.endDate))}`
    : shortDate(fromKey(milestone.date));
</script>

<template>
  <section
    class="glance-card"
    :data-phase="outlook.phase"
    aria-labelledby="glance-status"
  >
    <div class="glance-top">
      <span class="card-eyebrow">TODAY AT A GLANCE</span>
      <button
        class="icon-button"
        aria-label="Edit cycle details"
        @click="openDialog('settings')"
      >
        <Icon name="Ellipsis" :size="20" />
      </button>
    </div>

    <div class="glance-now">
      <p class="glance-day">
        <span v-if="located"
          ><strong>Day {{ outlook.day }}</strong> of
          {{ state.profile.cycleLength }}</span
        >
        <span class="phase-badge">
          <Icon :name="icon" :size="14" />
          {{ located ? outlook.phase + " phase" : "Phase unconfirmed" }}
        </span>
      </p>
      <h2 id="glance-status">{{ outlook.status }}</h2>
    </div>

    <div class="glance-bar" role="img" :aria-label="barLabel">
      <span
        v-for="segment in segments"
        :key="segment.name"
        class="glance-segment"
        :class="{ current: segment.name === outlook.phase || !located }"
        :style="{ flexGrow: segment.days, background: segment.color }"
      ></span>
      <i
        v-if="located"
        class="glance-marker"
        :style="{ left: outlook.progress * 100 + '%' }"
      ></i>
    </div>

    <div class="glance-footer">
      <dl v-if="outlook.milestones.length" class="glance-milestones">
        <div v-for="milestone in outlook.milestones" :key="milestone.name">
          <dt>{{ milestone.name }}</dt>
          <dd>
            <strong>{{ dates(milestone) }}</strong>
            <span>{{ relativeDays(milestone.inDays) }}</span>
          </dd>
        </div>
      </dl>
      <div v-else class="glance-late">
        <p>Cycles shift. Log it whenever it starts.</p>
        <button class="button button-outline" @click="openLog(today)">
          <Icon name="Droplet" :size="16" /> Log my period
        </button>
      </div>
      <RouterLink :to="{ name: 'My cycle' }" class="text-button glance-link">
        Explore my cycle <Icon name="ArrowUpRight" :size="16" />
      </RouterLink>
    </div>

    <p v-if="note" class="glance-note">{{ note }}</p>
  </section>
</template>

<style scoped>
.glance-card {
  display: flex;
  flex-direction: column;
  gap: 18px;
  padding: 18px 22px 20px;
  background: var(--accent-soft);
  border: 1px solid var(--border);
  border-radius: 11px;
  min-width: 0;
}
.glance-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -8px -12px -10px 0;
}
.glance-now {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.glance-day {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 10px;
  font-size: 14px;
  color: var(--text-secondary);
}
.glance-day strong {
  font:
    500 15px "DM Sans",
    sans-serif;
  color: var(--accent);
}
.glance-now h2 {
  font-size: clamp(22px, 2.1vw, 28px);
  line-height: 1.3;
  letter-spacing: -0.5px;
  text-wrap: balance;
}
.glance-bar {
  position: relative;
  display: flex;
  gap: 3px;
  height: 10px;
}
.glance-segment {
  flex-basis: 0;
  border-radius: 5px;
  opacity: 0.45;
  transition: opacity 0.45s;
}
.glance-segment.current {
  opacity: 1;
}
.glance-marker {
  position: absolute;
  top: 50%;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--surface);
  border: 3px solid var(--ring-accent);
  transform: translate(-50%, -50%);
}
.glance-card[data-phase="Ovulation"] .glance-marker {
  border-color: var(--ring-ovulation-accent);
}
.glance-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px 24px;
  padding-top: 16px;
  border-top: 1px solid var(--border-accent);
}
.glance-milestones {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 32px;
  margin: 0;
}
.glance-milestones dt {
  font-size: 12px;
  color: var(--text-muted);
}
.glance-milestones dd {
  display: flex;
  flex-direction: column;
  margin: 2px 0 0;
}
.glance-milestones strong {
  font:
    500 18px "Lora",
    serif;
  color: var(--text-heading);
}
.glance-milestones span {
  font-size: 13px;
  color: var(--text-secondary);
}
.glance-late {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 16px;
  font-size: 14px;
  color: var(--text-secondary);
}
.glance-link {
  margin-top: 0;
  text-decoration: none;
}
.glance-note {
  margin-top: -6px;
  font-size: 12px;
  color: var(--text-muted);
}
@media (max-width: 680px) {
  .glance-card {
    padding: 16px 17px 18px;
  }
  .glance-milestones {
    gap: 12px 24px;
  }
}
@media (prefers-reduced-motion: reduce) {
  .glance-segment {
    transition: none;
  }
}
</style>
