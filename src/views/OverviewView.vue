<script setup>
import { useRouter } from "vue-router";
import Icon from "../components/AppIcon.vue";
import BotanicalArt from "../components/BotanicalArt.vue";
import CycleCalendar from "../components/CycleCalendar.vue";
import CycleGlance from "../components/CycleGlance.vue";
import { articles } from "../lib/content.js";
import { useCycle } from "../composables/useCycle";
import { useDialog } from "../composables/useDialog.js";

const { state } = useCycle();
const { openDialog } = useDialog();
const router = useRouter();
</script>

<template>
  <CycleGlance />
  <div class="middle-grid overview-calendar">
    <CycleCalendar />
    <section class="partner-card">
      <div class="partner-art">
        <span class="partner-circle circle-one"
          ><Icon name="Heart" :size="29" /></span
        ><span class="partner-circle circle-two"
          ><Icon name="Sprout" :size="30" /></span
        ><span class="partner-star">✧</span>
      </div>
      <span class="card-eyebrow">BETTER, TOGETHER</span>
      <h2>A little more understanding.</h2>
      <p>
        Let your person in on your rhythm.<br />Share what feels right, on your
        terms.
      </p>
      <button
        class="button button-outline"
        @click="router.push({ name: 'Partner space' })"
      >
        <Icon name="Link" :size="16" />
        {{
          state.sharing.code
            ? "Manage partner space"
            : "Explore partner preview"
        }}<Icon name="ArrowUpRight" :size="16" /></button
      ><span class="partner-caption"
        ><Icon name="ShieldCheck" :size="12" /> You’re always in control.</span
      >
    </section>
  </div>
  <section class="care-section">
    <div class="care-heading">
      <div>
        <h2>A little care goes a long way</h2>
        <p>Small things to support you, wherever you are in your cycle.</p>
      </div>
      <button class="small-text-button" @click="openDialog('guides')">
        Browse self-care guides <Icon name="ArrowRight" :size="16" />
      </button>
    </div>
    <div class="article-grid">
      <button
        v-for="article in articles"
        :key="article.title"
        class="article-card"
        @click="openDialog('guides', { article })"
      >
        <div class="article-art" :class="article.color">
          <BotanicalArt :variant="article.art" />
        </div>
        <div class="article-copy">
          <span>{{ article.tag }}</span>
          <h3>{{ article.title }}</h3>
          <p>{{ article.description }}</p>
          <div>{{ article.time }}<Icon name="ArrowUpRight" :size="16" /></div>
        </div>
      </button>
    </div>
  </section>
</template>
