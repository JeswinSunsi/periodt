<script setup>
import { computed, nextTick, reactive, ref } from "vue";
import Icon from "../AppIcon.vue";
import { hasCheckin } from "../../lib/checkin.js";
import { moods, symptoms } from "../../lib/content.js";
import {
  isPeriodStart,
  minStartGap,
  offersPeriodStart,
  periodWindows,
  removePeriodStart,
  setPeriodStart,
  startsReplacedBy,
} from "../../lib/periodHistory.js";
import {
  useCycle,
  dateKey,
  fromKey,
  addDays,
  dayDifference,
  shortDate,
} from "../../composables/useCycle";
import { useCheckin } from "../../composables/useCheckin.js";
import { useDialog } from "../../composables/useDialog.js";

const { state, today } = useCycle();
const { logDate, initialMood, logDateLabel } = useCheckin();
const {
  modal,
  modalElement,
  trackUnsaved,
  requestClose,
  showPrompt,
  openDialog,
  notify,
} = useDialog();
// Symptoms chosen during setup come first.
const orderedSymptoms = [...symptoms].sort(
  (a, b) =>
    state.profile.usualSymptoms.includes(b) -
    state.profile.usualSymptoms.includes(a),
);
const checkinPeriod = computed(() =>
  periodWindows(state, dateKey(today))
    .filter((period) => !period.sample && period.start <= logDate.value)
    .at(-1),
);
const existing = state.logs[logDate.value];
const draft = reactive({
  mood: existing?.mood || "",
  flow: existing?.flow || "None",
  flowRecorded:
    existing?.flowRecorded === true ||
    !!(existing?.flow && existing.flow !== "None"),
  symptoms: [...(existing?.symptoms || [])],
  notes: existing?.notes || "",
  periodStart: isPeriodStart(state, logDate.value),
  periodEnd: checkinPeriod.value?.end === logDate.value,
});
const draftSnapshot = JSON.stringify(draft);
if (initialMood.value) draft.mood = initialMood.value;
trackUnsaved(() => JSON.stringify(draft) !== draftSnapshot);

const logStep = ref(0);
const logSteps = computed(() =>
  logDate.value > dateKey(today)
    ? [{ id: "note", title: "Plan a little note." }]
    : [
        { id: "mood", title: "How are you feeling?" },
        { id: "flow", title: "How’s your flow?" },
        { id: "symptoms", title: "What are you noticing?" },
        { id: "note", title: "Anything on your mind?" },
      ],
);
const currentLogStep = computed(() => logSteps.value[logStep.value]);
const isLastLogStep = computed(
  () => logStep.value === logSteps.value.length - 1,
);
async function changeLogStep(direction) {
  logStep.value = Math.max(
    0,
    Math.min(logSteps.value.length - 1, logStep.value + direction),
  );
  await nextTick();
  modalElement.value?.scrollTo({ top: 0 });
  modalElement.value
    ?.querySelector("#modal-title")
    ?.focus({ preventScroll: true });
}
function submitLogStep() {
  if (isLastLogStep.value) saveLog();
  else changeLogStep(1);
}
const canSaveLog = computed(
  () =>
    hasCheckin(state.logs[logDate.value]) ||
    isPeriodStart(state, logDate.value) ||
    !!(
      draft.mood ||
      draft.flowRecorded ||
      draft.flow !== "None" ||
      draft.symptoms.length ||
      draft.notes.trim() ||
      draft.periodStart ||
      draft.periodEnd
    ),
);
const showPeriodStart = computed(() =>
  offersPeriodStart(state, logDate.value, dateKey(today)),
);
const showPeriodEnd = computed(() => {
  const period = checkinPeriod.value;
  return (
    logDate.value <= dateKey(today) &&
    !isPeriodStart(state, logDate.value) &&
    !!period &&
    dayDifference(fromKey(logDate.value), fromKey(period.start)) >= 3 &&
    (!period.end || period.end >= logDate.value)
  );
});
// An open period offers an end, not a new start. A start entered at
// onboarding or in settings has no check-in behind it, so once its usual
// length has passed a later check-in may also mark the real start.
const offerPeriodStart = computed(() => {
  if (!showPeriodStart.value) return false;
  if (!showPeriodEnd.value) return true;
  const period = checkinPeriod.value;
  return (
    !state.logs[period.start]?.periodStart &&
    dayDifference(fromKey(logDate.value), fromKey(period.start)) >=
      period.expectedLength
  );
});
function togglePeriodEnd(event) {
  draft.periodEnd = event.target.checked;
  if (draft.periodEnd) {
    draft.periodStart = false;
    draft.flow = "None";
    draft.flowRecorded = true;
  } else if (draft.flow === "None") {
    // Undo the end rather than leaving an explicit None that would end it again.
    draft.flowRecorded = false;
  }
}
// A new start can be marked even while the previous period has no recorded end.
function togglePeriodStart(event) {
  const markStart = () => {
    draft.periodStart = true;
    draft.periodEnd = false;
  };
  if (!event.target.checked) {
    draft.periodStart = false;
    return;
  }
  // Starts closer than the minimum gap are replaced, so confirm first.
  const replaced = startsReplacedBy(state, logDate.value);
  if (!replaced.length) return markStart();
  event.target.checked = false;
  const dates = replaced.map((start) => shortDate(fromKey(start)));
  const gaps = replaced.map((start) => {
    const days = Math.abs(
      dayDifference(fromKey(logDate.value), fromKey(start)),
    );
    return `${shortDate(fromKey(start))} is ${days} ${days === 1 ? "day" : "days"} ${start < logDate.value ? "before" : "after"} this date`;
  });
  showPrompt("replace-start", markStart, {
    title: `Replace your ${dates.join(" and ")} period start?`,
    body: `${gaps.join(", and ")}. Periods can’t start less than ${minStartGap} days apart, so saving this as a start moves your period start from ${dates.join(" and ")} to ${shortDate(fromKey(logDate.value))}. Any check-ins on ${dates.join(" and ")} stay saved.`,
    cancel: "Don’t mark as start",
    confirm: "Replace start",
  });
}
function selectFlow(flow) {
  draft.flow = flow;
  draft.flowRecorded = true;
  draft.periodEnd =
    flow === "None" && showPeriodEnd.value && !draft.periodStart;
}
function toggleSymptom(symptom) {
  const index = draft.symptoms.indexOf(symptom);
  index < 0 ? draft.symptoms.push(symptom) : draft.symptoms.splice(index, 1);
}
function saveLog() {
  if (!canSaveLog.value) return;
  if (draft.periodStart && logDate.value <= dateKey(today))
    setPeriodStart(state, logDate.value);
  else if (!draft.periodStart && isPeriodStart(state, logDate.value))
    removePeriodStart(state, logDate.value, dateKey(addDays(today, -11)));
  state.logs[logDate.value] = { ...draft, symptoms: [...draft.symptoms] };
  modal.value = "";
  notify(
    logDate.value > dateKey(today)
      ? "Your planned note is saved."
      : "Your check-in is saved. ♡",
  );
}
function deleteLog() {
  if (isPeriodStart(state, logDate.value))
    removePeriodStart(state, logDate.value, dateKey(addDays(today, -11)));
  delete state.logs[logDate.value];
  modal.value = "";
  notify("Check-in deleted.");
}
</script>

<template>
  <form class="checkin-flow" @submit.prevent="submitLogStep">
    <div class="checkin-progress-header">
      <span class="eyebrow">A MOMENT FOR YOU</span>
      <span class="checkin-step-count"
        >Step {{ logStep + 1 }} of {{ logSteps.length }}</span
      >
    </div>
    <div
      class="checkin-progress"
      role="progressbar"
      aria-label="Check-in progress"
      :aria-valuenow="logStep + 1"
      :aria-valuemin="0"
      :aria-valuemax="logSteps.length"
      :aria-valuetext="`Step ${logStep + 1} of ${logSteps.length}`"
    >
      <span
        v-for="(step, index) in logSteps"
        :key="step.id"
        :class="{ filled: index <= logStep }"
      ></span>
    </div>
    <h2 id="modal-title" tabindex="-1">
      {{ currentLogStep.title }}
    </h2>
    <p class="checkin-date">{{ logDateLabel }}</p>
    <div class="checkin-step-body">
      <p class="checkin-reassurance">
        {{
          logDate > dateKey(today)
            ? "A little space for a future thought."
            : isLastLogStep
              ? canSaveLog
                ? "Last step. Add a note, or simply save."
                : "Last step. A few words are enough."
              : currentLogStep.id === "symptoms"
                ? "Choose any that fit, or continue without selecting."
                : "Choose what fits, or continue without selecting."
        }}
      </p>
      <fieldset v-if="currentLogStep.id === 'mood'">
        <legend>My mood</legend>
        <div class="choice-row">
          <button
            v-for="mood in moods"
            :key="mood.name"
            type="button"
            class="choice"
            :class="{ chosen: draft.mood === mood.name }"
            :aria-pressed="draft.mood === mood.name"
            @click="draft.mood = draft.mood === mood.name ? '' : mood.name"
          >
            {{ mood.name }}
          </button>
        </div>
      </fieldset>
      <template v-else-if="currentLogStep.id === 'flow'">
        <label v-if="offerPeriodStart" class="period-start-option"
          ><input
            type="checkbox"
            :checked="draft.periodStart"
            @change="togglePeriodStart"
          /><span
            >My period started this day<small
              >Sets this date as the start of a cycle.</small
            ></span
          ></label
        >
        <fieldset>
          <legend>Period flow</legend>
          <div class="choice-row">
            <button
              v-for="flow in ['None', 'Spotting', 'Light', 'Medium', 'Heavy']"
              :key="flow"
              type="button"
              class="choice"
              :class="{
                chosen: draft.flowRecorded && draft.flow === flow,
              }"
              :aria-pressed="draft.flowRecorded && draft.flow === flow"
              @click="selectFlow(flow)"
            >
              {{ flow }}
            </button>
          </div>
        </fieldset>
        <label v-if="showPeriodEnd" class="period-end-option">
          <span class="period-end-control">
            <input
              type="checkbox"
              :checked="draft.periodEnd"
              @change="togglePeriodEnd"
            />
            <Icon name="Check" :size="12" aria-hidden="true" />
          </span>
          <span>My period has ended</span>
        </label>
        <p
          v-if="
            draft.flowRecorded &&
            draft.flow === 'None' &&
            !draft.periodEnd &&
            logDate <= dateKey(today)
          "
          class="form-hint"
          role="status"
        >
          {{
            draft.periodStart
              ? "This date is still marked as a period start. Uncheck it above to remove that start."
              : "Saving None records no bleeding on this date and stops any remaining expected days for this period."
          }}
        </p>
        <p class="form-hint checkin-settings-hint">
          <button
            type="button"
            @click="requestClose(() => openDialog('settings'))"
          >
            Edit period dates in cycle settings
          </button>
        </p>
      </template>
      <template v-else-if="currentLogStep.id === 'symptoms'">
        <fieldset>
          <legend>What I’m noticing</legend>
          <div class="choice-row">
            <button
              v-for="symptom in orderedSymptoms"
              :key="symptom"
              type="button"
              class="choice"
              :class="{ chosen: draft.symptoms.includes(symptom) }"
              :aria-pressed="draft.symptoms.includes(symptom)"
              @click="toggleSymptom(symptom)"
            >
              {{ symptom }}
            </button>
          </div>
        </fieldset>
      </template>
      <template v-else>
        <label class="field-label" for="journal-note"
          >A little note
          <span>{{
            logDate > dateKey(today)
              ? "(just for you)"
              : "(optional, just for you)"
          }}</span></label
        >
        <textarea
          id="journal-note"
          v-model="draft.notes"
          rows="4"
          placeholder="What’s on your mind?"
          maxlength="3000"
        ></textarea>
      </template>
      <p v-if="isLastLogStep && !canSaveLog" class="form-hint">
        {{
          logDate > dateKey(today)
            ? "Add a note to save your plan."
            : "Add a note, or go back and choose something to save."
        }}
      </p>
    </div>
    <div class="checkin-step-actions">
      <button
        v-if="logStep > 0"
        type="button"
        class="button button-outline"
        @click="changeLogStep(-1)"
      >
        <Icon name="ArrowLeft" :size="17" /> Back
      </button>
      <button
        type="submit"
        class="button button-dark checkin-next"
        :disabled="isLastLogStep && !canSaveLog"
      >
        <Icon v-if="isLastLogStep" name="Check" :size="17" />
        {{
          !isLastLogStep
            ? "Continue"
            : logDate > dateKey(today)
              ? "Save planned note"
              : "Save my check-in"
        }}
        <Icon v-if="!isLastLogStep" name="ArrowRight" :size="17" />
      </button>
    </div>
    <div class="dialog-actions">
      <button type="button" class="small-text-button" @click="requestClose()">
        Cancel
      </button>
      <button
        v-if="state.logs[logDate]"
        type="button"
        class="small-text-button danger-action"
        @click="showPrompt('delete', deleteLog)"
      >
        Delete check-in
      </button>
    </div>
  </form>
</template>
