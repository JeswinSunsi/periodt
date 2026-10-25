<script setup>
import { computed } from "vue";
import Icon from "../components/AppIcon.vue";
import { hasCheckin } from "../lib/checkin.js";
import { useCycle, dateKey, fromKey } from "../composables/useCycle";
import { useCheckin } from "../composables/useCheckin.js";

const { state, today } = useCycle();
const { periodEndDates, openLog } = useCheckin();
const journalEntries = computed(() =>
  Object.entries(state.logs)
    .filter(([, log]) => hasCheckin(log))
    .sort(([a], [b]) => b.localeCompare(a)),
);
</script>

<template>
  <div v-if="!journalEntries.length" class="card empty-state">
    <span class="empty-icon"><Icon name="BookOpen" :size="35" /></span>
    <h2>Your story starts with a little check-in.</h2>
    <p>
      Keep track of your mood, symptoms, and the things on your mind.<br />This
      space is yours.
    </p>
    <button class="button button-dark" @click="openLog()">
      <Icon name="Plus" :size="17" /> Write your first entry
    </button>
  </div>
  <div v-else class="journal-list">
    <button
      v-for="[date, log] in journalEntries"
      :key="date"
      class="card journal-entry"
      @click="openLog(fromKey(date))"
    >
      <div class="journal-date">
        <strong>{{ fromKey(date).getDate() }}</strong
        ><span>{{
          fromKey(date).toLocaleDateString("en-US", {
            month: "short",
          })
        }}</span>
        <small>{{ fromKey(date).getFullYear() }}</small>
      </div>
      <div class="journal-content">
        <h3>
          {{ log.mood || "A moment for me" }}
          <span v-if="date > dateKey(today)">Planned note</span>
          <span v-if="periodEndDates.has(date)">Period ended</span>
          <span v-else-if="log.flowRecorded && log.flow === 'None'"
            >No bleeding</span
          >
          <span v-if="log.flow !== 'None'">{{ log.flow }} flow</span>
        </h3>
        <p>{{ log.notes || "A little check-in with myself." }}</p>
        <div class="flex flex-wrap gap-2">
          <span v-for="symptom in log.symptoms" :key="symptom" class="tag">{{
            symptom
          }}</span>
        </div>
      </div>
      <Icon name="ArrowUpRight" :size="18" />
    </button>
  </div>
</template>
