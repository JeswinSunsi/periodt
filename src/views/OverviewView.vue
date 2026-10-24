<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import Icon from "../components/AppIcon.vue";
import BotanicalArt from "../components/BotanicalArt.vue";
import CycleCalendar from "../components/CycleCalendar.vue";
import CycleGlance from "../components/CycleGlance.vue";
import { articles, moods } from "../lib/content.js";
import { checkinStreak } from "../lib/overview.js";
import { useCycle, dateKey } from "../composables/useCycle";
import { useCheckin } from "../composables/useCheckin.js";
import { useDialog } from "../composables/useDialog.js";

const { state, today } = useCycle();
const { todayLog, openLog, openCalendarDate } = useCheckin();
const { openDialog } = useDialog();
const router = useRouter();
const streak = computed(() => checkinStreak(state.logs, dateKey(today)));
const todaySummary = computed(() => {
  const log = todayLog.value;
  const flow =
    log.flow && log.flow !== "None"
      ? `${log.flow} flow`
      : log.flowRecorded && "No bleeding";
  return [log.symptoms?.join(", "), flow].filter(Boolean).join(" · ");
});
</script>

<template>
  <div class="top-grid overview-glance">
    <CycleGlance />
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
  <div class="middle-grid overview-calendar">
    <CycleCalendar />
    <section v-if="todayLog" class="checkin-card card checkin-done">
      <div class="flex items-center justify-between">
        <span class="card-eyebrow">TODAY’S CHECK-IN</span>
        <Icon name="Check" :size="20" />
      </div>
      <h2>
        {{
          todayLog.mood
            ? `Feeling ${todayLog.mood.toLowerCase()}.`
            : "You checked in today."
        }}
      </h2>
      <p>{{ todaySummary || "Nothing else noted, and that’s okay." }}</p>
      <p v-if="streak > 1" class="checkin-streak">
        <span aria-hidden="true">✧</span> {{ streak }} days in a row
      </p>
      <div class="checkin-done-actions">
        <button class="button button-outline" @click="openCalendarDate(today)">
          View today
        </button>
        <button class="small-text-button" @click="openLog()">
          <Icon name="Pencil" :size="14" /> Edit
        </button>
      </div>
    </section>
    <section v-else class="checkin-card card">
      <div class="flex items-center justify-between">
        <span class="card-eyebrow">YOUR DAILY CHECK-IN</span>
        <Icon name="Sun" :size="20" />
      </div>
      <h2>How’s your little world?</h2>
      <p>A moment to pause and check in with you.</p>
      <div class="mood-options">
        <button
          v-for="mood in moods"
          :key="mood.name"
          class="mood-option"
          @click="openLog(today, mood.name)"
        >
          <span class="mood-face" :class="mood.face">
            <i></i><i></i><b></b>
            <span v-if="mood.face === 'glow'" class="face-spark">✧</span>
          </span>
          <span>{{ mood.name }}</span>
        </button>
      </div>
    </section>
  </div>
  <section class="care-section">
    <div class="care-heading">
      <div>
        <h2>A little care goes a long way <span>✧</span></h2>
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

<style scoped>
.checkin-done > p {
  margin-top: 10px;
}
.checkin-done > .checkin-streak {
  font-size: 13px;
  color: var(--warning-text);
}
.checkin-done-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: auto;
  padding-top: 22px;
}
.checkin-done-actions .small-text-button {
  font-size: 14px;
  color: var(--text-secondary);
}
</style>
