<script setup>
import { computed } from "vue";
import Icon from "../AppIcon.vue";
import { progressRange } from "../../lib/onboarding.js";

const props = defineProps({
  steps: { type: Array, required: true },
  step: { type: Number, required: true },
});
defineEmits(["navigate"]);
const range = computed(() => progressRange(props.step, props.steps.length));
const first = computed(() => range.value[0]);
const visibleSteps = computed(() =>
  props.steps.map((title, index) => ({ title, index })).slice(...range.value),
);
</script>

<template>
  <nav class="onboarding-progress" aria-label="Setup progress">
    <ol :start="first + 1">
      <li
        v-for="{ title, index } in visibleSteps"
        :key="title"
        :class="{ 'is-current': index === step, 'is-complete': index < step }"
        :aria-current="index === step ? 'step' : undefined"
      >
        <button
          type="button"
          :disabled="index >= step"
          :aria-label="
            index < step ? `Back to ${title}` : `Step ${index + 1}: ${title}`
          "
          @click="$emit('navigate', index)"
        >
          <span class="onboarding-step-number"
            ><Icon
              v-if="index < step"
              class="onboarding-step-check"
              name="Check"
              :size="15"
            /><span v-else>{{ index + 1 }}</span></span
          >
          <span class="onboarding-step-name"
            >{{ title
            }}<span v-if="index < step" class="onboarding-sr-only">
              (completed, go back)</span
            ></span
          >
        </button>
      </li>
    </ol>
  </nav>
</template>
