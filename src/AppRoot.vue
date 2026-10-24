<script setup>
import { nextTick } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import OnboardingHandoff from "./components/onboarding/OnboardingHandoff.vue";
import { appOpening } from "./composables/useOnboarding.js";
import { onboardingDestination } from "./router/index.js";

const router = useRouter();
const route = useRoute();

// The handoff outlives the onboarding route so the app can open beneath it.
let reveal;
function revealApp() {
  reveal ||= router.replace(onboardingDestination(route.query.redirect));
  return reveal;
}
async function finishAppEntry() {
  await revealApp();
  reveal = undefined;
  appOpening.value = false;
  await nextTick();
  window.scrollTo({ top: 0, behavior: "auto" });
  document.querySelector(".page-heading h1")?.focus({ preventScroll: true });
}
</script>

<template>
  <RouterView />
  <OnboardingHandoff
    v-if="appOpening"
    @reveal="revealApp"
    @complete="finishAppEntry"
  />
</template>
