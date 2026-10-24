<script setup>
import { computed } from "vue";
import Icon from "../components/AppIcon.vue";
import { hasCheckin } from "../lib/checkin.js";
import { phaseCopy } from "../lib/content.js";
import { useCycle, dateKey } from "../composables/useCycle";
import { useCheckin } from "../composables/useCheckin.js";
import { useDialog } from "../composables/useDialog.js";

const { state, today } = useCycle();
const { openLog } = useCheckin();
const { openDialog } = useDialog();
const completedEntries = computed(() =>
  Object.entries(state.logs)
    .filter(([date, log]) => hasCheckin(log) && date <= dateKey(today))
    .sort(([a], [b]) => b.localeCompare(a)),
);
const mostLogged = computed(() => {
  const counts = {};
  completedEntries.value.forEach(([, log]) =>
    log.symptoms.forEach((s) => {
      counts[s] = (counts[s] || 0) + 1;
    }),
  );
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
});
</script>

<template>
  <div class="insight-grid">
    <div class="card stat-card">
      <Icon name="CalendarDays" /><span>Your cycle length</span
      ><strong>{{ state.profile.cycleLength }} <small>days</small></strong>
      <p>
        {{
          state.profile.demo
            ? "Sample setting — edit in Cycle settings"
            : "Based on your cycle setting"
        }}
      </p>
    </div>
    <div class="card stat-card">
      <Icon name="Droplet" /><span>Your period length</span
      ><strong>{{ state.profile.periodLength }} <small>days</small></strong>
      <p>
        {{
          state.profile.demo
            ? "Sample setting — edit in Cycle settings"
            : "Based on your period setting"
        }}
      </p>
    </div>
    <div class="card stat-card">
      <Icon name="BookOpen" /><span>Little moments logged</span
      ><strong
        >{{ completedEntries.length }}
        <small>{{
          completedEntries.length === 1 ? "day" : "days"
        }}</small></strong
      >
      <p>Every check-in is a little insight.</p>
    </div>
  </div>
  <div class="card insights-detail">
    <h2>Meet your cycle’s seasons</h2>
    <p>Four ways to understand your cycle. Every body has its own timing.</p>
    <div class="phase-grid">
      <template v-for="(item, name) in phaseCopy" :key="name"
        ><button
          v-if="name !== 'Unconfirmed'"
          class="phase-item"
          @click="openDialog('phases')"
        >
          <Icon :name="item.icon" :size="25" />
          <h3>{{ name }}</h3>
          <p>{{ item.title }}</p>
        </button></template
      >
    </div>
    <div class="insights-note">
      Your phases and fertile window are estimates, not confirmed ovulation.
      Predictions shouldn’t be used as contraception.
    </div>
  </div>
  <div class="card insights-detail">
    <h2>The patterns you’re noticing</h2>
    <div v-if="mostLogged.length" class="symptom-bars">
      <div v-for="[name, count] in mostLogged" :key="name" class="symptom-row">
        <span>{{ name }}</span>
        <div>
          <i
            :style="{
              width: `${(count / completedEntries.length) * 100}%`,
            }"
          ></i>
        </div>
        <strong>{{ count }} {{ count === 1 ? "day" : "days" }}</strong>
      </div>
    </div>
    <p v-else>
      Log symptoms during your daily check-in. Over time, your most frequent
      symptoms will appear here.
    </p>
    <button class="button button-dark mt-5" @click="openLog()">
      Log my day<Icon name="Plus" :size="17" />
    </button>
  </div>
</template>
