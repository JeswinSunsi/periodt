<script setup>
import Icon from "../components/AppIcon.vue";
import { useCycle } from "../composables/useCycle";
import { useDialog } from "../composables/useDialog.js";

const { state } = useCycle();
const { openDialog, notify } = useDialog();
function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6)),
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  state.sharing.code =
    "PT-" + [...bytes].map((x) => alphabet[x % alphabet.length]).join("");
  notify("Your demo sharing code is ready.");
}
async function copyCode() {
  try {
    await navigator.clipboard.writeText(state.sharing.code);
    notify("Code copied to your clipboard.");
  } catch {
    notify("Copy isn’t available. Select and copy the code below.");
  }
}
</script>

<template>
  <div class="demo-notice sharing-demo">
    <strong>Partner preview · saved in this browser only</strong>
    <p>
      Codes work here for trying the experience. They don’t connect another
      device or send your details to anyone.
    </p>
  </div>
  <div class="sharing-grid">
    <section class="card sharing-card">
      <span class="sharing-icon"><Icon name="Users" :size="28" /></span>
      <h2>Let your person in.</h2>
      <p>
        Choose the details you’d like to share. A little context can make care
        feel more personal.
      </p>
      <div class="share-options">
        <label
          v-for="option in [
            {
              key: 'cycle',
              title: 'Cycle & period dates',
              text: 'Your estimated phase and next period',
            },
            {
              key: 'mood',
              title: 'Today’s mood',
              text: 'How you’re feeling, in your own words',
            },
            {
              key: 'symptoms',
              title: 'Today’s symptoms',
              text: 'A little context for a little extra care',
            },
          ]"
          :key="option.key"
          class="share-option"
          ><span
            ><strong>{{ option.title }}</strong
            ><small>{{ option.text }}</small></span
          ><input
            type="checkbox"
            v-model="state.sharing[option.key]"
            class="toggle"
        /></label>
      </div>
      <p class="private-note">
        <Icon name="LockKeyhole" :size="14" /> Your journal notes always stay
        private.
      </p>
      <div v-if="state.sharing.code" class="share-code">
        <span>YOUR PARTNER CODE</span>
        <div>
          <strong>{{ state.sharing.code }}</strong
          ><button
            class="icon-button"
            aria-label="Copy partner code"
            @click="copyCode"
          >
            <Icon name="Copy" :size="19" />
          </button>
        </div>
      </div>
      <button
        v-else
        class="button button-dark w-full"
        :disabled="
          !state.sharing.cycle && !state.sharing.mood && !state.sharing.symptoms
        "
        @click="generateCode"
      >
        <Icon name="Link" :size="17" /> Create a demo code
      </button>
      <p
        v-if="
          !state.sharing.cycle && !state.sharing.mood && !state.sharing.symptoms
        "
        class="form-hint"
      >
        Select at least one detail to include in the preview.
      </p>
      <div v-if="state.sharing.code" class="flex flex-wrap gap-3 mt-4">
        <button class="button button-dark" @click="openDialog('partner')">
          Try your partner’s view
          <Icon name="ArrowUpRight" :size="17" /></button
        ><button
          class="small-text-button"
          @click="
            state.sharing.code = '';
            notify('Sharing stopped. Your old code is no longer active.');
          "
        >
          Stop sharing
        </button>
      </div>
    </section>
    <div>
      <section class="partner-card partner-explainer">
        <div class="partner-art">
          <span class="partner-circle circle-one"
            ><Icon name="Heart" :size="30" /></span
          ><span class="partner-circle circle-two"
            ><Icon name="Sprout" :size="30"
          /></span>
        </div>
        <h2>Care looks good on you two.</h2>
        <p>
          Sometimes support is a cup of tea.<br />Sometimes it’s just
          understanding.
        </p>
        <ul>
          <li><Icon name="Check" :size="16" /> Choose what you share</li>
          <li><Icon name="Check" :size="16" /> Change your mind anytime</li>
          <li>
            <Icon name="Check" :size="16" /> Keep your personal notes to
            yourself
          </li>
        </ul>
      </section>
      <button class="card redeem-card" @click="openDialog('partner')">
        <Icon name="Link" /><span
          ><strong>Have a partner code?</strong
          ><small>Try the local partner preview</small></span
        ><Icon name="ArrowRight" :size="18" />
      </button>
    </div>
  </div>
</template>
