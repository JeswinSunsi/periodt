<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import Icon from "../components/AppIcon.vue";
import {
  healthNotes,
  insightsSummary,
  regularityLabel,
  settingSuggestions,
  symptomForecast,
} from "../lib/insights.js";
import { useCycle, fromKey, addDays, dateKey } from "../composables/useCycle";
import { useCheckin } from "../composables/useCheckin.js";
import { useDialog } from "../composables/useDialog.js";
import { useEdgeBounce } from "../composables/useEdgeBounce.js";
import { useInsights } from "../composables/useInsights.js";

const { state, phase, cycleDay } = useCycle();
const { openLog } = useCheckin();
const { openDialog, notify } = useDialog();
const { todayKey, cycles, stats, range } = useInsights();
const router = useRouter();

const late = computed(() => range.value?.lateBy > 0);
const suggestions = computed(() =>
  settingSuggestions(state.profile, stats.value),
);
const notes = computed(() => healthNotes(state, cycles.value, stats.value));
const forecast = computed(() =>
  range.value
    ? symptomForecast(state, cycles.value, range.value, todayKey)
    : [],
);
const history = computed(() => cycles.value.toReversed().slice(0, 12));
// Bars share one scale so cycle lengths compare at a glance.
const longest = computed(() =>
  Math.max(35, ...history.value.map((c) => c.length ?? c.day)),
);

const plural = (count, word) => `${count} ${word}${count === 1 ? "" : "s"}`;
const dayLabel = (key) =>
  fromKey(key).toLocaleDateString("en-US", { month: "short", day: "numeric" });
const longDay = (key) =>
  fromKey(key).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
const startLabel = (key) =>
  fromKey(key).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(key.slice(0, 4) === todayKey.slice(0, 4) ? {} : { year: "numeric" }),
  });

// A scrollable strip of calendar days: a week either side of the likely
// window, opening centred on the likeliest day.
const rangeDays = computed(() => {
  if (!range.value) return [];
  const first = addDays(fromKey(range.value.earliest), -7);
  const count = range.value.before + range.value.after + 15;
  return Array.from({ length: count }, (_, i) => {
    const date = addDays(first, i);
    const key = dateKey(date);
    return {
      key,
      // The first day and each 1st carry the month, so scrolling keeps context.
      label:
        i === 0 || date.getDate() === 1
          ? date.toLocaleDateString("en-US", { month: "short" })
          : date.toLocaleDateString("en-US", { weekday: "narrow" }),
      month: i === 0 || date.getDate() === 1,
      day: date.getDate(),
      inRange: key >= range.value.earliest && key <= range.value.latest,
      likely: key === range.value.likely,
      today: key === todayKey,
    };
  });
});
const rangeStrip = ref(null);
const rangeTrack = ref(null);
useEdgeBounce(rangeStrip, rangeTrack);
function centreLikelyDay() {
  const strip = rangeStrip.value;
  const likely = strip?.querySelector(".likely");
  if (!likely) return;
  strip.scrollLeft =
    likely.offsetLeft - (strip.clientWidth - likely.offsetWidth) / 2;
}
watch(rangeDays, () => nextTick(centreLikelyDay));
onMounted(centreLikelyDay);

function applySuggestion({ field, label, value }) {
  state.profile[field] = value;
  notify(`Predictions now use a ${value}-day ${label}.`);
}

async function shareSummary() {
  const text = insightsSummary({
    cycles: cycles.value,
    stats: stats.value,
    notes: notes.value,
    forecast: forecast.value,
  });
  try {
    if (navigator.share) {
      await navigator.share({ title: "My cycle summary", text });
      return;
    }
    await navigator.clipboard.writeText(text);
    notify("Summary copied. Paste it wherever you need it.");
  } catch (error) {
    if (error?.name !== "AbortError")
      notify("Couldn’t share the summary on this device.");
  }
}
</script>

<template>
  <div v-if="!cycles.length || !range" class="card empty-state">
    <span class="empty-icon"
      ><Icon name="ChartNoAxesColumnIncreasing" :size="35"
    /></span>
    <h2>Your insights grow with your cycles.</h2>
    <p>
      Add the first day of your last period. As you log each new start, your
      predictions get sharper and your patterns appear here.
    </p>
    <button class="button button-dark" @click="openDialog('settings')">
      <Icon name="CalendarDays" :size="17" /> Add my dates
    </button>
  </div>

  <template v-else>
    <section
      class="cycle-explorer insights-hero"
      :data-phase="late ? 'Menstrual' : phase"
    >
      <div class="cycle-explorer-body">
        <span class="orbit-star star-one" aria-hidden="true">✧</span
        ><span class="orbit-star star-two" aria-hidden="true">✧</span>
        <div v-if="late" class="cycle-story">
          <span class="cycle-season"
            ><Icon name="Heart" :size="15" /> Later than usual</span
          >
          <h2>{{ plural(range.lateBy, "day") }} past your usual range.</h2>
          <p>
            Your period was most likely due {{ dayLabel(range.likely)
            }}<template v-if="range.measured"
              >, and usually comes by {{ dayLabel(range.latest) }}</template
            >. A late period is common, and one on its own is rarely a sign of a
            problem.
          </p>
          <div class="cycle-story-action flex flex-wrap items-center gap-3">
            <button class="button button-dark" @click="openLog()">
              <Icon name="Droplet" :size="16" /> My period started</button
            ><button class="cycle-text-link" @click="openDialog('settings')">
              Fix my dates <Icon name="ArrowRight" :size="14" />
            </button>
          </div>
        </div>
        <div v-else class="cycle-story">
          <span class="cycle-season"
            ><Icon name="CalendarDays" :size="15" />
            {{
              phase === "Menstrual"
                ? `Period day ${cycleDay} · your next one`
                : "Your next period"
            }}</span
          >
          <div ref="rangeStrip" class="range-strip" aria-hidden="true">
            <ol ref="rangeTrack" class="range-track">
              <li
                v-for="day in rangeDays"
                :key="day.key"
                :class="{
                  'in-range': day.inRange,
                  likely: day.likely,
                  today: day.today,
                }"
              >
                <small :class="{ month: day.month }">{{ day.label }}</small
                ><span>{{ day.day }}</span>
              </li>
            </ol>
          </div>
          <h2>
            {{
              range.earliest <= todayKey
                ? "Could start any day now."
                : `Most likely ${dayLabel(range.likely)}.`
            }}
          </h2>
          <p>
            Likely between {{ longDay(range.earliest) }} and
            {{ longDay(range.latest) }}.
            {{
              range.measured
                ? `Based on the shortest and longest of your last ${plural(stats.cycleCount, "cycle")}.`
                : "A rough range for now. It narrows once you’ve logged two full cycles."
            }}
          </p>
          <div class="cycle-story-action flex flex-wrap items-center gap-3">
            <button
              class="cycle-text-link"
              @click="router.push({ name: 'Overview' })"
            >
              See it on your calendar <Icon name="ArrowRight" :size="14" />
            </button>
          </div>
        </div>
        <div class="cycle-pressed-flower" aria-hidden="true">
          <span v-for="n in 8" :key="n" :style="{ '--petal': n }"></span><i></i>
        </div>
      </div>
    </section>

    <section v-if="late" class="card cycle-body-card">
      <div class="cycle-section-title">
        <span class="detail-icon"><Icon name="Leaf" :size="18" /></span>
        <div>
          <span class="card-eyebrow">WHILE YOU WAIT</span>
          <h2>A few gentle next steps</h2>
        </div>
      </div>
      <div class="cycle-body-facts">
        <div>
          <span class="cycle-fact-dot peach"></span>
          <div>
            <h3>If pregnancy is possible</h3>
            <p>
              A home test is reliable from the day your period was due. If it’s
              negative and your period still hasn’t come, test again a few days
              later.
            </p>
          </div>
        </div>
        <div>
          <span class="cycle-fact-dot"></span>
          <div>
            <h3>Common reasons for a delay</h3>
            <p>
              Stress, illness, travel, changes in weight or exercise, and
              starting or stopping contraception can all shift your timing.
            </p>
          </div>
        </div>
        <div>
          <span class="cycle-fact-dot"></span>
          <div>
            <h3>When to talk to someone</h3>
            <p>
              If you’ve missed three periods in a row, or you’re worried, a
              healthcare professional can help.
            </p>
          </div>
        </div>
      </div>
    </section>

    <section v-if="notes.length" class="card cycle-body-card">
      <div class="cycle-section-title">
        <span class="detail-icon"
          ><Icon name="MessageCircleHeart" :size="18"
        /></span>
        <div>
          <span class="card-eyebrow">WORTH A CONVERSATION</span>
          <h2>A few things to mention</h2>
        </div>
      </div>
      <div class="cycle-body-facts">
        <div v-for="note in notes" :key="note">
          <span class="cycle-fact-dot peach"></span>
          <p class="note-fact">{{ note }}</p>
        </div>
      </div>
      <p class="insights-caption">
        These come from your own logs, not a diagnosis, and missed logs can
        cause them too. If something keeps happening or worries you, a
        healthcare professional can help.
      </p>
    </section>

    <section v-if="suggestions.length" class="card cycle-dates-card">
      <div class="flex items-center justify-between">
        <h2>Make your estimates yours</h2>
        <Icon name="Settings2" :size="18" />
      </div>
      <template v-for="suggestion in suggestions" :key="suggestion.field">
        <div class="cycle-date-row">
          <span
            >Your average {{ suggestion.label }} ·
            {{ plural(suggestion.basis, suggestion.label) }}</span
          ><strong>{{ suggestion.value }} days</strong>
        </div>
        <div class="cycle-date-row">
          <span>Your estimates use</span
          ><strong>{{ suggestion.current }} days</strong>
        </div>
        <button class="cycle-text-link" @click="applySuggestion(suggestion)">
          Use my average {{ suggestion.label }}
          <Icon name="ArrowRight" :size="15" />
        </button>
      </template>
    </section>

    <section class="card cycle-observations insights-history">
      <div>
        <span class="card-eyebrow">YOUR RHYTHM, SO FAR</span>
        <h2>The cycles you’ve logged</h2>
        <p>
          {{
            stats.cycleCount
              ? `Averages from your last ${plural(stats.cycleCount, "full cycle")}. A starting point, not a diagnosis.`
              : "Your averages appear once your next period starts. Log it in your check-in."
          }}
        </p>
      </div>
      <div class="cycle-symptom-tags">
        <span v-if="stats.cycleCount"
          >Cycle <b>{{ stats.averageCycle }} days</b></span
        ><span v-if="stats.periodCount"
          >Period <b>{{ stats.averagePeriod }} days</b></span
        ><span v-if="stats.variation !== null"
          >{{ regularityLabel(stats.variation) }}
          <b>{{ stats.variation }}-day spread</b></span
        >
      </div>
      <ol class="history-list">
        <li v-for="cycle in history" :key="cycle.start">
          <div class="history-label">
            <span
              >{{ startLabel(cycle.start) }}</span
            >
            <strong v-if="cycle.gap"
              >{{ cycle.length }} days · a start may be missing</strong
            >
            <strong v-else-if="cycle.length">{{ cycle.length }} days</strong>
            <strong v-else>Day {{ cycle.day }} · now</strong>
          </div>
          <div
            class="history-bar"
            :class="{ current: !cycle.length, gap: cycle.gap }"
            aria-hidden="true"
            :style="{
              width: `${(Math.min(cycle.length ?? cycle.day, longest) / longest) * 100}%`,
            }"
          >
            <i
              :style="{
                width: `${(Math.min(cycle.periodLength ?? cycle.expectedPeriodLength, cycle.length ?? cycle.day) / (cycle.length ?? cycle.day)) * 100}%`,
              }"
            ></i>
          </div>
        </li>
      </ol>
      <p class="insights-caption">
        The peach part of each line is your period.<template
          v-if="!stats.periodCount"
        >
          Mark when a period ends in your check-in to see its real
          length.</template
        >
      </p>
    </section>

    <button class="card redeem-card" @click="shareSummary">
      <Icon name="BookOpen" /><span
        ><strong>Bring it to an appointment</strong
        ><small
          >A plain summary for your doctor. Notes stay private.</small
        ></span
      ><Icon name="ArrowUpRight" :size="18" />
    </button>

    <details class="cycle-research-note">
      <summary>
        <Icon name="BookOpen" :size="15" /> How these insights work
        <Icon name="ChevronDown" :size="15" />
      </summary>
      <div>
        <p>
          Ranges come from your own shortest and longest recent cycles. Typical
          ranges follow FIGO guidance: cycles of 24–38 days, periods up to 8
          days, and up to 7–9 days of difference between cycles.
        </p>
        <p>
          Phases and fertile windows are calendar estimates, not confirmed
          ovulation. Predictions shouldn’t be used as contraception.
        </p>
        <div class="flex flex-wrap gap-4">
          <a
            href="https://www.nhs.uk/conditions/stopped-or-missed-periods/"
            target="_blank"
            rel="noopener noreferrer"
            >NHS · Missed periods <Icon name="ArrowUpRight" :size="13" /></a
          ><a
            href="https://womenshealth.gov/menstrual-cycle/premenstrual-syndrome"
            target="_blank"
            rel="noopener noreferrer"
            >OWH · PMS & symptom tracking <Icon name="ArrowUpRight" :size="13"
          /></a>
        </div>
      </div>
    </details>
  </template>
</template>

<style scoped>
.insights-hero .cycle-explorer-body {
  padding-top: 30px;
}
.insights-hero .cycle-story h2 {
  margin: 18px 0 10px;
}
/* Fill the card rather than growing to fit the long, scrolling day strip. */
.insights-hero .cycle-story {
  width: 100%;
  min-width: 0;
}
/* Runs edge to edge inside the hero and scrolls sideways; the edges fade
   so it reads as a longer stretch of days. */
.range-strip {
  position: relative;
  margin: 22px -16px 0;
  padding: 2px 16px 4px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x proximity;
  scrollbar-width: none;
  -webkit-mask-image: linear-gradient(
    90deg,
    transparent,
    #000 28px,
    #000 calc(100% - 28px),
    transparent
  );
  mask-image: linear-gradient(
    90deg,
    transparent,
    #000 28px,
    #000 calc(100% - 28px),
    transparent
  );
}
.range-strip::-webkit-scrollbar {
  display: none;
}
/* Moves on its own for the edge bounce, so the scroll position stays put. */
.range-track {
  display: flex;
  gap: 6px;
  width: max-content;
}
.range-strip li {
  display: grid;
  flex: 0 0 38px;
  justify-items: center;
  gap: 6px;
  scroll-snap-align: center;
  font-size: 12px;
  color: var(--text-muted);
}
.range-strip small.month {
  font-weight: 600;
  color: var(--accent);
}
.range-strip span {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border: 1px solid transparent;
  border-radius: 50%;
  font-size: 14px;
  color: var(--text-secondary);
}
.range-strip .in-range span {
  background: var(--predicted-bg);
  color: var(--predicted-text);
}
.range-strip .likely span {
  border: 1px dashed var(--predicted-border);
  font-weight: 700;
}
.range-strip .today span {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
.note-fact {
  margin-top: 0;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-secondary);
}
.insights-caption {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}
.cycle-dates-card .cycle-text-link + .cycle-date-row {
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--border-soft);
}
.insights-history {
  gap: 18px;
}
.history-list {
  display: grid;
  gap: 14px;
}
.history-label {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 7px;
  font-size: 12px;
  color: var(--text-secondary);
}
.history-label strong {
  font-weight: 500;
  color: var(--text-heading);
  text-align: right;
}
.history-bar {
  height: 6px;
  border-radius: 6px;
  background: var(--accent-soft-strong);
  overflow: hidden;
}
.history-bar.current {
  background: repeating-linear-gradient(
    135deg,
    var(--accent-soft-strong) 0 3px,
    transparent 3px 6px
  );
}
.history-bar.gap {
  opacity: 0.5;
}
.history-bar i {
  display: block;
  height: 100%;
  background: var(--phase-menstrual);
}
.redeem-card {
  margin-top: 0;
}
</style>
