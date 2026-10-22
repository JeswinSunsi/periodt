<script setup>
import { onBeforeUnmount, onMounted, ref } from "vue";

const emit = defineEmits(["reveal", "complete"]);
const element = ref(null);
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
let revealed = false;
let completed = false;

function reveal() {
  if (revealed) return;
  revealed = true;
  emit("reveal");
}
function complete() {
  if (completed) return;
  completed = true;
  reveal();
  emit("complete");
}
function motionChanged() {
  if (motionQuery.matches) complete();
}
onMounted(() => {
  motionQuery.addEventListener("change", motionChanged);
  if (motionQuery.matches) {
    complete();
    return;
  }
  element.value?.focus({ preventScroll: true });
});
onBeforeUnmount(() => motionQuery.removeEventListener("change", motionChanged));
</script>

<template>
  <div
    ref="element"
    class="onboarding-handoff"
    role="status"
    aria-label="Opening your space"
    tabindex="-1"
    @animationend.self="complete"
    @animationcancel.self="complete"
  >
    <div class="onboarding-handoff-content">
      <div class="onboarding-handoff-mark" aria-hidden="true">
        <span class="onboarding-handoff-halo"></span>
        <span class="onboarding-handoff-flower" @animationend.self="reveal"
          >✳</span
        >
      </div>
      <p>Welcome to your rhythm.</p>
    </div>
  </div>
</template>

<style>
.onboarding-handoff {
  position: fixed;
  z-index: 300;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--page-bg);
  color: var(--text-heading);
  outline: none;
  animation: onboarding-handoff 900ms ease-in-out both;
}
.onboarding-handoff-content {
  display: grid;
  justify-items: center;
  gap: 24px;
  text-align: center;
}
.onboarding-handoff-mark {
  position: relative;
  display: grid;
  place-items: center;
  width: 116px;
  height: 116px;
}
.onboarding-handoff-halo {
  position: absolute;
  inset: 0;
  border: 1px solid var(--border-accent);
  border-radius: 50%;
  background: var(--accent-soft);
  animation: onboarding-handoff-halo 900ms ease-out both;
}
.onboarding-handoff-flower {
  position: relative;
  display: block;
  color: var(--accent);
  font:
    72px/1 Georgia,
    serif;
  animation: onboarding-handoff-bloom 380ms cubic-bezier(0.2, 0.7, 0.3, 1) both;
}
.onboarding-handoff-content p {
  font:
    25px/1.4 "Lora",
    Georgia,
    serif;
}
.app-shell.app-entering {
  animation: onboarding-app-arrive 480ms ease-out both;
}
@keyframes onboarding-handoff {
  0%,
  100% {
    opacity: 0;
  }
  22%,
  70% {
    opacity: 1;
  }
}
@keyframes onboarding-handoff-bloom {
  from {
    opacity: 0;
    transform: scale(0.65) rotate(-35deg);
  }
  to {
    opacity: 1;
    transform: scale(1) rotate(0);
  }
}
@keyframes onboarding-handoff-halo {
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  35% {
    opacity: 1;
  }
  to {
    opacity: 1;
    transform: scale(1.08);
  }
}
@keyframes onboarding-app-arrive {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
@media (prefers-reduced-motion: reduce) {
  .onboarding-handoff,
  .onboarding-handoff-flower,
  .onboarding-handoff-halo,
  .app-shell.app-entering {
    animation: none;
  }
}
</style>
