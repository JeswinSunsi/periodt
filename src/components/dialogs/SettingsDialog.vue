<script setup>
import { reactive } from "vue";
import { useRoute, useRouter } from "vue-router";
import Icon from "../AppIcon.vue";
import { regularityOptions, symptoms } from "../../lib/content.js";
import { cycleContext } from "../../lib/onboarding.js";
import { setPeriodStart } from "../../lib/periodHistory.js";
import { useCycle, dateKey } from "../../composables/useCycle";
import { useDialog } from "../../composables/useDialog.js";

const { state, today } = useCycle();
const { modal, trackUnsaved, requestClose, notify } = useDialog();
const router = useRouter();
const route = useRoute();
const settings = reactive({
  lastPeriod: state.profile.lastPeriod,
  cycleLength: state.profile.cycleLength,
  periodLength: state.profile.periodLength,
  regularity: state.profile.regularity,
  usualSymptoms: [...state.profile.usualSymptoms],
});
const settingsSnapshot = JSON.stringify(settings);
trackUnsaved(() => JSON.stringify(settings) !== settingsSnapshot);

function saveSettings() {
  setPeriodStart(state, settings.lastPeriod);
  Object.assign(state.profile, settings, cycleContext(settings), {
    demo: false,
  });
  modal.value = "";
  notify("Your cycle details are updated.");
}
// Tapping the chosen answer again clears it; these answers are optional.
function choose(field, value) {
  settings[field] = settings[field] === value ? "" : value;
}
function toggleSymptom(symptom) {
  const index = settings.usualSymptoms.indexOf(symptom);
  index < 0
    ? settings.usualSymptoms.push(symptom)
    : settings.usualSymptoms.splice(index, 1);
}
function openGuidedSetup() {
  modal.value = "";
  state.onboarding = { status: "pending" };
  router.push({ name: "Onboarding", query: { redirect: route.fullPath } });
}
</script>

<template>
  <form @submit.prevent="saveSettings">
    <span class="eyebrow">YOUR OWN RHYTHM</span>
    <h2 id="modal-title">Make this space yours.</h2>
    <p>A few dates help us get to know your cycle.</p>
    <div v-if="state.profile.demo" class="demo-notice">
      You’re exploring a sample cycle. Add your dates to personalize your
      estimates.
      <button
        class="small-text-button"
        type="button"
        @click="requestClose(openGuidedSetup)"
      >
        Set up step by step <Icon name="ArrowRight" :size="16" />
      </button>
    </div>
    <label class="field-label" for="last-period"
      >First day of your last period</label
    ><input
      id="last-period"
      v-model="settings.lastPeriod"
      type="date"
      :max="dateKey(today)"
      required
    /><label class="field-label" for="cycle-length"
      >Usual cycle length (days)</label
    ><input
      id="cycle-length"
      v-model.number="settings.cycleLength"
      type="number"
      min="21"
      max="45"
      aria-describedby="cycle-length-help"
      required
    />
    <p id="cycle-length-help" class="form-hint">
      From the first day of one period to the first day of the next. Supported
      range: 21–45 days.
    </p>
    <label class="field-label" for="period-length"
      >Usual period length (days)</label
    ><input
      id="period-length"
      v-model.number="settings.periodLength"
      type="number"
      min="2"
      max="10"
      aria-describedby="period-length-help"
      required
    />
    <p id="period-length-help" class="form-hint">
      How many days you usually bleed. Supported range: 2–10 days.
    </p>
    <fieldset class="settings-choices">
      <legend>How regular are your cycles?</legend>
      <div class="choice-row">
        <button
          v-for="option in regularityOptions"
          :key="option.value"
          type="button"
          class="choice"
          :class="{ chosen: settings.regularity === option.value }"
          :aria-pressed="settings.regularity === option.value"
          @click="choose('regularity', option.value)"
        >
          {{ option.label }}
        </button>
      </div>
    </fieldset>
    <fieldset class="settings-choices">
      <legend>Usual symptoms</legend>
      <p class="form-hint">These come first in your daily check-in.</p>
      <div class="choice-row">
        <button
          v-for="symptom in symptoms"
          :key="symptom"
          type="button"
          class="choice"
          :class="{ chosen: settings.usualSymptoms.includes(symptom) }"
          :aria-pressed="settings.usualSymptoms.includes(symptom)"
          @click="toggleSymptom(symptom)"
        >
          {{ symptom }}
        </button>
      </div>
    </fieldset>
    <p class="form-hint">
      Cycles vary. These estimates may be less useful with irregular cycles or
      hormonal contraception. They aren’t birth control.
    </p>
    <button class="button button-dark w-full mt-5" type="submit">
      Save cycle details <Icon name="Check" :size="17" />
    </button>
    <button
      type="button"
      class="small-text-button dialog-cancel"
      @click="requestClose()"
    >
      Cancel
    </button>
  </form>
</template>
