<script setup>
import { computed, nextTick, ref } from "vue";
import Icon from "../AppIcon.vue";
import { hasCheckin } from "../../lib/checkin.js";
import { isPeriodStart, removePeriodStart } from "../../lib/periodHistory.js";
import {
  useCycle,
  dateKey,
  fromKey,
  addDays,
} from "../../composables/useCycle";
import { useCheckin } from "../../composables/useCheckin.js";
import { useDialog } from "../../composables/useDialog.js";

const { state, today } = useCycle();
const { logDate, logDateLabel, periodEndDates, openLog } = useCheckin();
const { modalElement, requestClose } = useDialog();
const savedLog = computed(() => state.logs[logDate.value]);
const savedFlowLabel = computed(() => {
  const log = savedLog.value;
  if (!log?.flowRecorded && (!log?.flow || log.flow === "None"))
    return "Not recorded";
  return log.flow === "None" ? "No bleeding" : log.flow;
});
const removedPeriodStart = ref(null);
async function removeSavedPeriodStart() {
  if (!isPeriodStart(state, logDate.value)) return;
  removedPeriodStart.value = {
    lastPeriod: state.profile.lastPeriod,
    demo: state.profile.demo,
    history: state.periodHistory.map((period) => ({ ...period })),
    logStart: savedLog.value?.periodStart,
  };
  removePeriodStart(state, logDate.value, dateKey(addDays(today, -11)));
  await nextTick();
  modalElement.value?.querySelector(".undo-period-start")?.focus();
}
async function undoSavedPeriodStart() {
  const previous = removedPeriodStart.value;
  if (!previous) return;
  state.profile.lastPeriod = previous.lastPeriod;
  state.profile.demo = previous.demo;
  state.periodHistory = previous.history;
  if (savedLog.value) {
    if (previous.logStart === undefined) delete savedLog.value.periodStart;
    else savedLog.value.periodStart = previous.logStart;
  }
  removedPeriodStart.value = null;
  await nextTick();
  modalElement.value?.querySelector(".remove-period-start")?.focus();
}
</script>

<template>
  <div class="saved-checkin">
    <h2 id="modal-title">
      {{
        logDate > dateKey(today)
          ? "A little look ahead."
          : "Your day, in one place."
      }}
    </h2>
    <p class="checkin-date saved-checkin-date">
      <Icon name="CalendarDays" :size="15" />{{ logDateLabel }}
    </p>
    <dl class="saved-checkin-details">
      <template v-if="logDate <= dateKey(today)">
        <div class="saved-summary-tile saved-mood-tile">
          <dt><Icon name="Smile" :size="18" /> Mood</dt>
          <dd>{{ savedLog?.mood || "Not recorded" }}</dd>
        </div>
        <div class="saved-summary-tile saved-flow-tile">
          <dt><Icon name="Droplet" :size="18" /> Period flow</dt>
          <dd>{{ savedFlowLabel }}</dd>
        </div>
        <div
          v-if="
            isPeriodStart(state, logDate) ||
            removedPeriodStart ||
            periodEndDates.has(logDate)
          "
          class="saved-period-card"
        >
          <dt><Icon name="CalendarDays" :size="14" /> Cycle dates</dt>
          <dd v-if="isPeriodStart(state, logDate)" class="saved-period-start">
            <strong>Period started this day</strong>
            <button
              class="remove-period-start"
              aria-label="Remove period start"
              title="Remove the start date and keep your check-in"
              @click="removeSavedPeriodStart"
            >
              Remove
            </button>
          </dd>
          <dd v-else-if="removedPeriodStart" class="saved-period-feedback">
            <span role="status">{{
              hasCheckin(savedLog)
                ? "Period start removed. Your check-in is saved."
                : "Period start removed."
            }}</span>
            <button class="undo-period-start" @click="undoSavedPeriodStart">
              Undo
            </button>
          </dd>
          <dd v-if="periodEndDates.has(logDate)" class="saved-period-event">
            Period ended this day
          </dd>
        </div>
        <div>
          <dt><Icon name="Heart" :size="18" /> Symptoms</dt>
          <dd v-if="savedLog?.symptoms?.length || savedLog?.pain">
            <ul class="saved-symptoms">
              <li v-if="savedLog.pain" class="tag">{{ savedLog.pain }} pain</li>
              <li
                v-for="symptom in savedLog.symptoms"
                :key="symptom"
                class="tag"
              >
                {{ symptom }}
              </li>
            </ul>
          </dd>
          <dd v-else class="saved-empty">No symptoms recorded</dd>
        </div>
      </template>
      <div>
        <dt><Icon name="BookOpen" :size="18" /> Notes</dt>
        <dd
          class="saved-checkin-notes"
          :class="{ 'saved-empty': !savedLog?.notes }"
        >
          {{ savedLog?.notes || "No note added" }}
        </dd>
      </div>
    </dl>
    <div class="dialog-actions">
      <button class="button button-outline" @click="openLog(fromKey(logDate))">
        {{ logDate > dateKey(today) ? "Edit planned note" : "Edit check-in" }}
      </button>
      <button class="button button-dark" @click="requestClose()">Close</button>
    </div>
  </div>
</template>
