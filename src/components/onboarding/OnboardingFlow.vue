<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import Icon from "../AppIcon.vue";
import BotanicalArt from "../BotanicalArt.vue";
import ThemeSwitcher from "../ThemeSwitcher.vue";
import OnboardingProgress from "./OnboardingProgress.vue";
import DayCountField from "./DayCountField.vue";
import { useOnboarding } from "../../composables/useOnboarding.js";
import { useCycle, dateKey, fromKey } from "../../composables/useCycle.js";

const emit = defineEmits(["complete"]);
const { today } = useCycle();
const { step, draft, errors, next, backTo, finish } = useOnboarding();
const heading = ref(null);
const form = ref(null);
const privacyDialog = ref(null);
const originalTitle = document.title;
const steps = ["Welcome", "Your dates", "Your rhythm", "Your space"];
const titles = [
  "A little more in tune.",
  "Your last period.",
  "Your usual rhythm.",
  "Your space is ready.",
];
const descriptions = [
  "Get to know your cycle, one day at a time.",
  "",
  "Your usual lengths, in days.",
  "",
];
const dateLabel = computed(() =>
  draft.lastPeriod
    ? fromKey(draft.lastPeriod).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "",
);

function updateTitle() {
  document.title = `Step ${step.value + 1} of 4: ${steps[step.value]} — periodt.`;
}
async function focusHeading() {
  await nextTick();
  heading.value?.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "auto" });
}
watch(step, () => {
  updateTitle();
  focusHeading();
});
onMounted(() => {
  updateTitle();
  focusHeading();
});
onBeforeUnmount(() => {
  document.title = originalTitle;
});

async function submit() {
  const isFinalStep = step.value === 3;
  const success = isFinalStep ? finish() : next();
  if (success && isFinalStep) emit("complete");
  if (!success) {
    await nextTick();
    form.value?.querySelector('[aria-invalid="true"]')?.focus();
  }
}
function setDate(value) {
  draft.lastPeriod = value;
  errors.value = {};
}
</script>

<template>
  <div class="onboarding-shell">
    <a class="skip-link" href="#onboarding-title" @click.prevent="focusHeading"
      >Skip to setup</a
    >
    <header class="onboarding-header">
      <div>
        <div class="brand onboarding-brand" aria-label="periodt.">
          <span class="brand-flower" aria-hidden="true">✳</span>
          periodt<span class="brand-dot">.</span>
        </div>
        <p class="brand-subtitle">IN YOUR OWN RHYTHM</p>
      </div>
      <div class="onboarding-header-actions">
        <button
          class="onboarding-data-button"
          type="button"
          aria-label="About your data"
          title="About your data"
          @click="privacyDialog.showModal()"
        >
          <Icon name="LockKeyhole" :size="18" />
        </button>
        <ThemeSwitcher />
      </div>
    </header>

    <main class="onboarding-layout">
      <aside class="onboarding-intro" aria-label="A little welcome">
        <div class="onboarding-art" aria-hidden="true">
          <div class="onboarding-art-orbit"></div>
          <span class="onboarding-art-sun">☼</span>
          <BotanicalArt class="onboarding-botanical" />
          <span class="onboarding-art-spark">✧</span>
        </div>
        <h2>Your body.<br />Your pace.<br /><em>Your kind of care.</em></h2>
      </aside>

      <div class="onboarding-form-column">
        <OnboardingProgress :step="step" @navigate="backTo" />
        <section
          class="card onboarding-card"
          :data-step="step"
          aria-labelledby="onboarding-title"
        >
          <div class="onboarding-card-heading">
            <p id="onboarding-step-caption" class="onboarding-sr-only">
              Step {{ step + 1 }} of 4: {{ steps[step] }}
            </p>
            <h1
              id="onboarding-title"
              ref="heading"
              tabindex="-1"
              aria-describedby="onboarding-step-caption"
            >
              {{ titles[step] }}
            </h1>
            <p v-if="descriptions[step]" class="onboarding-description">
              {{ descriptions[step] }}
            </p>
          </div>

          <form ref="form" novalidate @submit.prevent="submit">
            <div :key="step" class="onboarding-step-content">
              <template v-if="step === 0">
                <BotanicalArt
                  class="onboarding-welcome-art"
                  aria-hidden="true"
                />
                <ul class="onboarding-benefits">
                  <li>
                    <span><Icon name="CalendarDays" :size="23" /></span>Cycle
                  </li>
                  <li>
                    <span><Icon name="Smile" :size="23" /></span>Check-ins
                  </li>
                  <li>
                    <span><Icon name="Sprout" :size="23" /></span>Patterns
                  </li>
                </ul>
              </template>

              <template v-else-if="step === 1">
                <div class="onboarding-date-field">
                  <label
                    class="onboarding-input-label"
                    for="onboarding-last-period"
                    >First day of your last period</label
                  >
                  <input
                    id="onboarding-last-period"
                    class="onboarding-date-input"
                    :value="draft.lastPeriod"
                    type="date"
                    :max="dateKey(today)"
                    required
                    :aria-invalid="errors.lastPeriod ? true : undefined"
                    :aria-describedby="
                      errors.lastPeriod ? 'onboarding-date-error' : undefined
                    "
                    @input="setDate($event.target.value)"
                  />
                  <p
                    v-if="errors.lastPeriod"
                    id="onboarding-date-error"
                    class="onboarding-error"
                    role="alert"
                  >
                    {{ errors.lastPeriod }}
                  </p>
                </div>
              </template>

              <div v-else-if="step === 2" class="onboarding-lengths">
                <DayCountField
                  id="onboarding-cycle-length"
                  v-model="draft.cycleLength"
                  label="Cycle length"
                  description="Start to start"
                  :min="21"
                  :max="45"
                  :error="errors.cycleLength"
                  @update:model-value="delete errors.cycleLength"
                />
                <DayCountField
                  id="onboarding-period-length"
                  v-model="draft.periodLength"
                  label="Period length"
                  description="Days you bleed"
                  icon="Droplet"
                  :min="2"
                  :max="10"
                  :error="errors.periodLength"
                  @update:model-value="delete errors.periodLength"
                />
              </div>

              <template v-else>
                <dl class="onboarding-review">
                  <div>
                    <div>
                      <dt>Last period started</dt>
                      <dd>{{ dateLabel }}</dd>
                    </div>
                    <button
                      type="button"
                      aria-label="Edit last period start"
                      @click="backTo(1)"
                    >
                      <Icon name="Pencil" :size="17" />
                    </button>
                  </div>
                  <div>
                    <div>
                      <dt>Cycle length</dt>
                      <dd>{{ draft.cycleLength }} days</dd>
                    </div>
                    <button
                      type="button"
                      aria-label="Edit cycle length"
                      @click="backTo(2)"
                    >
                      <Icon name="Pencil" :size="17" />
                    </button>
                  </div>
                  <div>
                    <div>
                      <dt>Period length</dt>
                      <dd>{{ draft.periodLength }} days</dd>
                    </div>
                    <button
                      type="button"
                      aria-label="Edit period length"
                      @click="backTo(2)"
                    >
                      <Icon name="Pencil" :size="17" />
                    </button>
                  </div>
                </dl>
                <p class="onboarding-estimate-note">
                  Estimates can vary. Not for birth control.
                </p>
              </template>
            </div>

            <div class="onboarding-actions">
              <button
                v-if="step > 0"
                class="button onboarding-back"
                type="button"
                @click="backTo(step - 1)"
              >
                <Icon name="ArrowLeft" :size="17" /> Back
              </button>
              <button
                class="button button-dark onboarding-continue"
                type="submit"
              >
                {{
                  step === 0
                    ? "Let’s begin"
                    : step === 3
                      ? "Open my space"
                      : "Continue"
                }}
                <Icon :name="step === 3 ? 'Check' : 'ArrowRight'" :size="18" />
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>

    <dialog
      ref="privacyDialog"
      class="onboarding-data-dialog"
      aria-labelledby="onboarding-data-title"
      @click="$event.target === privacyDialog && privacyDialog.close()"
    >
      <div class="onboarding-data-heading">
        <h2 id="onboarding-data-title">Your data, simply.</h2>
        <button
          class="onboarding-data-button"
          type="button"
          aria-label="Close data information"
          autofocus
          @click="privacyDialog.close()"
        >
          <Icon name="X" :size="20" />
        </button>
      </div>
      <p>
        Your details stay in this browser, without an account. Storage isn’t
        encrypted; anyone using this browser profile can see your entries.
        Clearing browser data deletes them.
      </p>
    </dialog>
  </div>
</template>

<style src="../../styles/onboarding.css"></style>
