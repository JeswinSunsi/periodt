<script setup>
import { computed } from "vue";
import { useRouter } from "vue-router";
import Icon from "../components/AppIcon.vue";
import BotanicalArt from "../components/BotanicalArt.vue";
import CycleCalendar from "../components/CycleCalendar.vue";
import CycleRing from "../components/CycleRing.vue";
import { articles, moods, phaseCopy } from "../lib/content.js";
import { useCycle, shortDate } from "../composables/useCycle";
import { useCheckin } from "../composables/useCheckin.js";
import { useDialog } from "../composables/useDialog.js";

const {
  state,
  today,
  cycleDay,
  remaining,
  nextPeriod,
  phase,
  currentPeriodLength,
} = useCycle();
const { todayLog, openLog } = useCheckin();
const { openDialog } = useDialog();
const router = useRouter();
const currentPhaseCopy = computed(() => phaseCopy[phase.value]);
</script>

<template>
  <div class="middle-grid overview-calendar">
    <CycleCalendar />
    <section class="checkin-card card" v-if="!todayLog">
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
  <div class="top-grid overview-support">
    <section class="cycle-card cycle-card-interactive">
      <button
        class="cycle-card-hitbox"
        aria-label="Open my cycle: explore phases, body changes, and check-ins"
        @click="router.push({ name: 'My cycle' })"
      ></button>
      <div class="cycle-card-top">
        <span class="card-eyebrow">YOU & YOUR CYCLE</span>
        <button
          class="cycle-edit"
          aria-label="Edit cycle details"
          @click="openDialog('settings')"
        >
          <Icon name="Ellipsis" :size="23" />
        </button>
      </div>
      <div class="cycle-card-body">
        <div class="cycle-ring">
          <CycleRing
            :day="cycleDay"
            :cycle-length="state.profile.cycleLength"
            :period-length="currentPeriodLength"
            :phase="phase"
          />
        </div>
        <div class="cycle-message">
          <span class="phase-badge">
            <Icon :name="currentPhaseCopy.icon" :size="14" />
            {{
              phase === "Unconfirmed"
                ? "Awaiting your next log"
                : phase + " phase"
            }}
          </span>
          <h2>{{ currentPhaseCopy.title }}</h2>
          <p>{{ currentPhaseCopy.description }}</p>
          <span class="text-button cycle-explore-link">
            Explore my cycle <Icon name="ArrowUpRight" :size="16" />
          </span>
        </div>
      </div>
      <div class="cycle-card-footer">
        <span
          ><span class="small-dot peach-dot"></span>
          {{ remaining >= 0 ? "Next period in about" : "Expected period was" }}
          <strong
            >{{ Math.abs(remaining) }} days{{
              remaining < 0 ? " ago" : ""
            }}</strong
          >
        </span>
        <span class="estimate"
          >{{ state.profile.demo ? "Sample cycle" : "Estimated" }} ·
          {{ shortDate(nextPeriod) }}</span
        >
      </div>
    </section>
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
