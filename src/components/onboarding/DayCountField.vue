<script setup>
import Icon from "../AppIcon.vue";

const props = defineProps({
  modelValue: [Number, String],
  id: { type: String, required: true },
  label: { type: String, required: true },
  description: { type: String, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  error: String,
});
const emit = defineEmits(["update:modelValue"]);
function adjust(amount) {
  const value = Number(props.modelValue);
  emit(
    "update:modelValue",
    Math.max(
      props.min,
      Math.min(
        props.max,
        (Number.isFinite(value) ? value : props.min) + amount,
      ),
    ),
  );
}
</script>

<template>
  <div class="onboarding-count-field" :class="{ 'has-error': error }">
    <div class="onboarding-count-label">
      <div>
        <label :for="id">{{ label }}</label>
        <p :id="`${id}-description`">{{ description }}</p>
      </div>
    </div>
    <div class="onboarding-counter">
      <button
        type="button"
        :aria-label="`Decrease ${label.toLowerCase()}`"
        :disabled="Number(modelValue) <= min"
        @click="adjust(-1)"
      >
        <span aria-hidden="true">−</span>
      </button>
      <div class="onboarding-count-value">
        <input
          :id="id"
          :value="modelValue"
          type="number"
          inputmode="numeric"
          :min="min"
          :max="max"
          step="1"
          required
          :aria-invalid="error ? true : undefined"
          :aria-describedby="`${id}-description${error ? ` ${id}-error` : ''}`"
          @input="
            $emit(
              'update:modelValue',
              $event.target.value === '' ? '' : Number($event.target.value),
            )
          "
        />
      </div>
      <button
        type="button"
        :aria-label="`Increase ${label.toLowerCase()}`"
        :disabled="Number(modelValue) >= max"
        @click="adjust(1)"
      >
        <Icon name="Plus" :size="18" />
      </button>
    </div>
    <p v-if="error" :id="`${id}-error`" class="onboarding-error" role="alert">
      {{ error }}
    </p>
  </div>
</template>
