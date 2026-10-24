<script setup>
import Icon from "../AppIcon.vue";
</script>

<template>
  <span class="eyebrow">GET TO KNOW YOU</span>
  <h2 id="modal-title">Your cycle has seasons.</h2>
  <p>
    Your experience is personal. Here’s a gentle guide to what happens in your
    body.
  </p>
  <div class="phase-explanations">
    <div>
      <Icon name="Moon" />
      <h3>Menstrual</h3>
      <p>
        Your period starts a new cycle. The lining of your uterus sheds;
        bleeding often lasts 2–7 days.
      </p>
    </div>
    <div>
      <Icon name="Sprout" />
      <h3>Follicular</h3>
      <p>
        This begins with your period. An egg develops in the ovary and estrogen
        rises ahead of ovulation.
      </p>
    </div>
    <div>
      <Icon name="Sun" />
      <h3>Ovulation</h3>
      <p>
        An ovary releases an egg. The timing varies, so a calendar can estimate
        but can’t confirm it.
      </p>
    </div>
    <div>
      <Icon name="Leaf" />
      <h3>Luteal</h3>
      <p>
        After ovulation, progesterone rises. If pregnancy doesn’t occur, hormone
        levels fall and a new period begins.
      </p>
    </div>
  </div>
  <p class="form-hint">
    Energy and mood don’t follow a fixed schedule. Listen to your own
    experience. Calendar predictions should not be used as contraception.
  </p>
  <a
    class="source-link"
    href="https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/"
    target="_blank"
    rel="noopener noreferrer"
    >Read more from the NHS <Icon name="ArrowUpRight" :size="14"
  /></a>
</template>
