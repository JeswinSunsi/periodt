<script setup>
import { computed, ref } from "vue";
import Icon from "../AppIcon.vue";
import { phaseCopy } from "../../lib/content.js";
import { useCycle, shortDate } from "../../composables/useCycle";
import { useCheckin } from "../../composables/useCheckin.js";
import { useDialog } from "../../composables/useDialog.js";

const { state, nextPeriod, phase } = useCycle();
const { todayLog } = useCheckin();
const { focusDialog } = useDialog();
const currentPhaseCopy = computed(() => phaseCopy[phase.value]);
// The code form unlocks the preview of what a partner would see.
const unlocked = ref(false);
const enteredCode = ref(""),
  codeError = ref("");
function redeemCode() {
  if (
    state.sharing.code &&
    enteredCode.value.trim().toUpperCase() === state.sharing.code
  ) {
    unlocked.value = true;
    focusDialog();
  } else
    codeError.value = "That code doesn’t match an active code in this browser.";
}
</script>

<template>
  <form v-if="!unlocked" @submit.prevent="redeemCode">
    <span class="eyebrow">A LITTLE CLOSER</span>
    <h2 id="modal-title">Welcome to their rhythm.</h2>
    <p>Enter the code created in this browser to try the partner experience.</p>
    <label class="field-label" for="partner-code">Partner code</label
    ><input
      id="partner-code"
      v-model="enteredCode"
      @input="codeError = ''"
      placeholder="PT-XXXXXX"
      autocomplete="off"
      autocapitalize="characters"
      :spellcheck="false"
      required
      :aria-invalid="!!codeError"
      aria-describedby="code-error"
    />
    <p id="code-error" v-if="codeError" class="error-text" role="alert">
      {{ codeError }}
    </p>
    <button class="button button-dark w-full mt-5">
      Open partner preview<Icon name="ArrowRight" :size="17" />
    </button>
    <p class="form-hint">
      Frontend demo: this code doesn’t connect different devices.
    </p>
  </form>
  <template v-else>
    <span class="eyebrow">PARTNER PREVIEW</span>
    <h2 id="modal-title">A little understanding.</h2>
    <p>Here’s what your person has chosen to share.</p>
    <div v-if="state.sharing.cycle" class="partner-detail">
      <Icon :name="currentPhaseCopy.icon" />
      <div>
        <span>Estimated phase</span>
        <h3>
          {{
            phase === "Unconfirmed"
              ? "Awaiting a new period date"
              : phase + " phase"
          }}
        </h3>
        <p>
          Next period estimated {{ shortDate(nextPeriod)
          }}{{ state.profile.demo ? " · Sample cycle" : "" }}
        </p>
      </div>
    </div>
    <div v-if="state.sharing.mood" class="partner-detail">
      <Icon name="Smile" />
      <div>
        <span>Today’s mood</span>
        <h3>{{ todayLog?.mood || "No mood shared yet" }}</h3>
      </div>
    </div>
    <div v-if="state.sharing.symptoms" class="partner-detail">
      <Icon name="Heart" />
      <div>
        <span>Today’s symptoms</span>
        <h3>
          {{
            todayLog?.symptoms?.length
              ? todayLog.symptoms.join(", ")
              : "No symptoms shared today"
          }}
        </h3>
      </div>
    </div>
    <p
      v-if="
        !state.sharing.cycle && !state.sharing.mood && !state.sharing.symptoms
      "
    >
      No details are being shared right now.
    </p>
    <div class="demo-notice">
      <strong>A little way to show up</strong>
      <p>
        Ask “What would feel supportive today?” Their answer matters more than
        any prediction.
      </p>
    </div>
  </template>
</template>
