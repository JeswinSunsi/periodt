<script setup>
import OnboardingFlow from "./OnboardingFlow.vue";
import { appOpening } from "../../composables/useOnboarding.js";
</script>

<template>
  <OnboardingFlow
    :inert="appOpening ? true : undefined"
    :aria-hidden="appOpening ? true : undefined"
    @complete="appOpening = true"
  />
</template>
