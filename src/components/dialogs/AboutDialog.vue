<script setup>
import Icon from "../AppIcon.vue";
</script>

<template>
  <span class="eyebrow">A SPACE YOU CAN UNDERSTAND</span>
  <h2 id="modal-title">Your data, simply.</h2>
  <p>
    Your cycle settings, check-ins, and demo sharing preferences are stored in
    this browser’s local storage. They aren’t sent to a server.
  </p>
  <p class="mt-4">
    This prototype has no account or authentication. Someone with access to this
    browser can see its data. Clearing browser storage removes your entries.
    Partner codes only demonstrate the flow in this browser.
  </p>
  <p class="mt-4">
    Cycle phases and dates are estimates for awareness, not medical advice or
    contraception. If symptoms are severe or unusual for you, speak with a
    healthcare professional.
  </p>
  <a
    class="source-link"
    href="https://www.acog.org/womens-health/faqs/Premenstrual-Syndrome"
    target="_blank"
    rel="noopener noreferrer"
    >Why keep a symptom diary? · ACOG <Icon name="ArrowUpRight" :size="14"
  /></a>
</template>
