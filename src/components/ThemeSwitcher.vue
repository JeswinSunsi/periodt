<script setup>
import { computed } from "vue";
import { useTheme } from "../composables/useTheme.js";

const { themes, themeId, currentTheme, storageError, setTheme } = useTheme();
const nextTheme = computed(
  () =>
    themes[
      (themes.findIndex((theme) => theme.id === themeId.value) + 1) % themes.length
    ],
);
</script>

<template>
  <div class="theme-switcher">
    <button
      type="button"
      class="theme-control"
      :style="{ background: currentTheme.swatch }"
      :aria-label="`Switch to ${nextTheme.label} theme (${currentTheme.label} selected)`"
      @click="setTheme(nextTheme.id)"
    ></button>
    <span v-if="storageError" class="theme-storage-note" role="status">
      Theme changed for this visit. Your browser couldn’t save the preference.
    </span>
  </div>
</template>

<style scoped>
.theme-switcher {
  position: relative;
  flex-shrink: 0;
}
.theme-control {
  display: block;
  width: 44px;
  height: 44px;
  min-width: 44px;
  min-height: 44px;
  padding: 0;
  border: 3px solid var(--border);
  border-radius: 50%;
  cursor: pointer;
}
.theme-control:focus-visible {
  outline: 3px solid var(--theme-control-text);
  outline-offset: 3px;
}
.theme-storage-note {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  padding: 10px 12px;
  border: 1px solid var(--theme-control-border);
  border-radius: 8px;
  background: var(--theme-control-bg);
  color: var(--theme-control-text);
  font-size: 12px;
  line-height: 1.5;
}
</style>
