<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import Icon from "./AppIcon.vue";
import CycleRing from "./CycleRing.vue";
import { useCycle, addDays, dateKey, fromKey } from "../composables/useCycle";
import { phaseAtDay, phaseStories } from "../lib/cyclePhases";

const emit = defineEmits(["log", "calendar"]);
const {
  state,
  today,
  cycleDay,
  phase,
  nextPeriod,
  remaining,
  currentPeriodLength,
} = useCycle();
const selectedDay = ref(
  Math.max(1, Math.min(cycleDay.value, state.profile.cycleLength)),
);
const exploring = ref(false);
const selectedPhase = computed(() =>
  exploring.value
    ? phaseAtDay(
        selectedDay.value,
        state.profile.cycleLength,
        currentPeriodLength.value,
      )
    : phase.value,
);
const story = computed(() => phaseStories[selectedPhase.value]);
const selectedDate = computed(() =>
  addDays(fromKey(state.profile.lastPeriod), selectedDay.value - 1),
);
const selectedLog = computed(
  () => state.logs[dateKey(exploring.value ? selectedDate.value : today)],
);
const currentLogs = computed(() =>
  Object.entries(state.logs).filter(
    ([date]) =>
      date >= state.profile.lastPeriod &&
      date <= dateKey(today) &&
      date < dateKey(nextPeriod.value),
  ),
);
const symptomSummary = computed(() => {
  const counts = {};
  currentLogs.value.forEach(([, log]) =>
    log.symptoms.forEach((name) => {
      counts[name] = (counts[name] || 0) + 1;
    }),
  );
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
});
const pretty = (date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
function returnToToday() {
  exploring.value = false;
  selectedDay.value = Math.max(
    1,
    Math.min(cycleDay.value, state.profile.cycleLength),
  );
}
// On landing, sweep the ring from day 1 up to today.
const sweepDay = ref(null);
let sweepFrame = 0;
function stopSweep() {
  cancelAnimationFrame(sweepFrame);
  sweepDay.value = null;
}
onMounted(() => {
  const target = Math.min(cycleDay.value, state.profile.cycleLength);
  if (
    target <= 1 ||
    phase.value === "Unconfirmed" ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  )
    return;
  const duration = Math.min(1400, 400 + target * 30);
  const start = performance.now();
  sweepDay.value = 1;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    sweepDay.value = 1 + Math.round(eased * (target - 1));
    if (t < 1) sweepFrame = requestAnimationFrame(step);
    else sweepDay.value = null;
  };
  sweepFrame = requestAnimationFrame(step);
});
onBeforeUnmount(stopSweep);
const ringDay = computed(
  () => sweepDay.value ?? (exploring.value ? selectedDay.value : cycleDay.value),
);
const ringPhase = computed(() =>
  sweepDay.value === null
    ? selectedPhase.value
    : phaseAtDay(
        sweepDay.value,
        state.profile.cycleLength,
        currentPeriodLength.value,
      ),
);
function selectDay(day) {
  stopSweep();
  selectedDay.value = day;
  exploring.value = true;
}
watch(
  () => [
    state.profile.lastPeriod,
    state.profile.cycleLength,
    currentPeriodLength.value,
  ],
  returnToToday,
);
const chartPhase = computed(
  () =>
    ({
      Menstrual: 8,
      Follicular: 31,
      Ovulation: 48,
      Luteal: 75,
      Unconfirmed: 0,
    })[selectedPhase.value],
);
const showEstrogen = ref(true),
  showProgesterone = ref(true);
const chartId = `cycle-hormones`;
</script>
<template>
  <div class="cycle-detail" :data-phase="selectedPhase">
    <section class="cycle-explorer" :data-phase="selectedPhase">
      <div class="cycle-explorer-body">
        <div class="cycle-orbit">
          <span class="orbit-star star-one" aria-hidden="true">✧</span
          ><span class="orbit-star star-two" aria-hidden="true">✧</span>
          <CycleRing
            :day="ringDay"
            :cycle-length="state.profile.cycleLength"
            :period-length="currentPeriodLength"
            :phase="ringPhase"
            detailed
            interactive
            :sweeping="sweepDay !== null"
            :value-text="`Day ${exploring ? selectedDay : cycleDay}, ${pretty(exploring ? selectedDate : today)}, estimated ${selectedPhase} phase`"
            :label="exploring ? 'EXPLORING DAY' : 'TODAY · CYCLE DAY'"
            @select="selectDay"
          />
          <p class="cycle-orbit-caption">
            {{ exploring ? pretty(selectedDate) : pretty(today) }}
            <span>·</span>
            {{
              selectedPhase === "Unconfirmed"
                ? "Awaiting a new period date"
                : `${selectedPhase} phase`
            }}
          </p>
        </div>
        <div class="cycle-story">
          <span class="cycle-season"
            ><Icon :name="story.icon" :size="15" /> {{ story.season }}</span
          >
          <Transition name="phase-story" mode="out-in"
            ><div :key="selectedPhase">
              <h2>{{ story.title }}</h2>
              <p>{{ story.body }}</p>
            </div></Transition
          >
          <div class="cycle-story-action flex flex-wrap items-center gap-3">
            <button
              class="button button-dark"
              @click="emit('log', exploring ? selectedDate : today)"
            >
              <Icon name="Plus" :size="16" />
              {{
                exploring && dateKey(selectedDate) > dateKey(today)
                  ? "Plan a note for this day"
                  : exploring && dateKey(selectedDate) !== dateKey(today)
                    ? "Check in on this day"
                    : "Check in with myself"
              }}</button
            ><button
              v-if="exploring"
              class="cycle-text-link"
              @click="returnToToday"
            >
              Back to today <Icon name="ArrowRight" :size="14" />
            </button>
          </div>
        </div>
        <div class="cycle-pressed-flower" aria-hidden="true">
          <span v-for="n in 8" :key="n" :style="{ '--petal': n }"></span><i></i>
        </div>
      </div>

    </section>

    <div class="cycle-detail-grid">
      <section class="card cycle-body-card">
        <div class="cycle-section-title">
          <span class="detail-icon"><Icon name="Sparkles" :size="18" /></span>
          <div>
            <span class="card-eyebrow">BENEATH THE SURFACE</span>
            <h2>What’s happening within</h2>
          </div>
        </div>
        <div class="cycle-body-facts" :key="selectedPhase">
          <div>
            <span class="cycle-fact-dot"></span>
            <div>
              <h3>The hormone story</h3>
              <p>{{ story.hormone }}</p>
            </div>
          </div>
          <div>
            <span class="cycle-fact-dot peach"></span>
            <div>
              <h3>What you might notice</h3>
              <p>{{ story.notice }}</p>
            </div>
          </div>
        </div>
        <div class="cycle-hormone-chart">
          <div class="flex flex-wrap items-center justify-between gap-2">
            <span>A typical hormone pattern</span
            ><span class="illustration-badge">Illustration only</span>
          </div>
          <svg
            viewBox="0 0 500 150"
            role="img"
            :aria-labelledby="chartId"
            preserveAspectRatio="xMidYMid meet"
          >
            <title :id="chartId">
              Illustrative cycle hormone pattern. Estrogen generally peaks
              before ovulation; progesterone rises after it. This graph is not
              your measured hormone data.
            </title>
            <defs>
              <linearGradient id="estrogen-fill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stop-color="var(--hormone-estrogen)"
                  stop-opacity=".2"
                />
                <stop
                  offset="100%"
                  stop-color="var(--hormone-estrogen)"
                  stop-opacity="0"
                />
              </linearGradient>
            </defs>
            <path
              d="M10 40H490M10 80H490M10 120H490"
              stroke="var(--border)"
              stroke-dasharray="3 5"
              fill="none"
            />
            <rect
              v-if="selectedPhase !== 'Unconfirmed'"
              :x="chartPhase * 4.8 - 8"
              y="10"
              width="40"
              height="118"
              rx="12"
              fill="var(--accent-soft)"
              opacity=".7"
              class="hormone-phase-highlight"
            />
            <g
              :class="{ 'hormone-hidden': !showEstrogen }"
              class="hormone-curve"
            >
              <path
                d="M10 116C58 119 89 109 122 99S186 68 214 28S241 23 257 73S300 83 331 63S391 77 426 94S468 112 490 118L490 135H10Z"
                fill="url(#estrogen-fill)"
              />
              <path
                pathLength="1"
                d="M10 116C58 119 89 109 122 99S186 68 214 28S241 23 257 73S300 83 331 63S391 77 426 94S468 112 490 118"
                stroke="var(--hormone-estrogen)"
                stroke-width="3"
                fill="none"
                stroke-linecap="round"
                class="hormone-draw"
              />
            </g>
            <path
              d="M10 127C76 126 165 130 216 124S259 110 288 81S337 26 367 36S413 91 448 116S477 127 490 128"
              stroke="var(--hormone-progesterone)"
              stroke-width="3"
              stroke-dasharray="6 5"
              stroke-linecap="round"
              fill="none"
              class="hormone-curve"
              :class="{ 'hormone-hidden': !showProgesterone }"
            />
          </svg>
          <div class="hormone-phase-labels" aria-hidden="true">
            <span>Period</span><span>Before ovulation</span
            ><span>After ovulation</span>
          </div>
          <div class="hormone-legend">
            <button
              :aria-pressed="showEstrogen"
              @click="showEstrogen = !showEstrogen"
            >
              <i></i>Estrogen<Icon
                v-if="showEstrogen"
                name="Check"
                :size="12"
              /></button
            ><button
              :aria-pressed="showProgesterone"
              @click="showProgesterone = !showProgesterone"
            >
              <i></i>Progesterone<Icon
                v-if="showProgesterone"
                name="Check"
                :size="12"
              />
            </button>
          </div>
          <p class="hormone-disclaimer">
            A general sketch of an ovulatory cycle
          </p>
        </div>
      </section>
      <div class="cycle-detail-side">
        <section class="cycle-care-card">
          <span class="care-flower" aria-hidden="true">✳</span
          ><span class="card-eyebrow">A LITTLE CARE FOR THIS CHAPTER</span>
          <div class="flex items-center gap-3 mt-4">
            <Icon :name="story.careIcon" :size="22" />
            <h2>{{ story.care }}</h2>
          </div>
          <p>{{ story.careText }}</p>
          <div class="cycle-journal-prompt">
            <Icon name="BookOpen" :size="17" /><span>{{ story.question }}</span>
          </div>
          <button class="cycle-text-link" @click="emit('log', today)">
            Make a little note <Icon name="ArrowUpRight" :size="15" />
          </button>
        </section>
        <section class="card cycle-dates-card">
          <div class="flex items-center justify-between">
            <h2>A little look ahead</h2>
            <Icon name="CalendarDays" :size="18" />
          </div>
          <div class="cycle-date-row">
            <span>{{
              remaining >= 0
                ? "Next period, estimated"
                : "Previous estimated start"
            }}</span
            ><strong>{{ pretty(nextPeriod) }}</strong>
          </div>
          <div class="cycle-date-row">
            <span>{{
              state.profile.demo ? "Cycle length" : "Your cycle setting"
            }}</span
            ><strong>{{ state.profile.cycleLength }} days</strong>
          </div>
          <button class="cycle-text-link" @click="emit('calendar')">
            See calendar on Overview <Icon name="ArrowRight" :size="15" />
          </button>
        </section>
      </div>
    </div>

    <section class="card cycle-observations">
      <div>
        <span class="card-eyebrow">YOUR EXPERIENCE MATTERS MOST</span>
        <h2>The little things you’ve noticed</h2>
        <p>
          {{
            currentLogs.length
              ? `${currentLogs.length} check-in${currentLogs.length === 1 ? "" : "s"} recorded in this cycle. A starting point, not a diagnosis.`
              : "Your patterns begin with your own observations. A few check-ins can help you get to know them."
          }}
        </p>
      </div>
      <div class="cycle-observation-content">
        <div v-if="selectedLog" class="selected-day-log">
          <Icon name="Smile" :size="20" />
          <div>
            <small
              >{{ exploring ? pretty(selectedDate) : "Today" }} · Your
              check-in</small
            ><strong>{{ selectedLog.mood || "A moment for me" }}</strong
            ><span>{{
              selectedLog.symptoms.length
                ? selectedLog.symptoms.join(" · ")
                : "No symptoms recorded"
            }}</span>
          </div>
          <button
            class="icon-button"
            aria-label="Edit selected day’s check-in"
            @click="emit('log', exploring ? selectedDate : today)"
          >
            <Icon name="ArrowUpRight" :size="18" />
          </button>
        </div>
        <div v-if="symptomSummary.length" class="cycle-symptom-tags">
          <span v-for="[name, count] in symptomSummary" :key="name"
            >{{ name }}
            <b>{{ count }}{{ count === 1 ? " day" : " days" }}</b></span
          >
        </div>
        <button v-else class="cycle-text-link" @click="emit('log', today)">
          Add a check-in <Icon name="Plus" :size="16" />
        </button>
      </div>
    </section>
    <details class="cycle-research-note">
      <summary>
        <Icon name="BookOpen" :size="15" /> A guide grounded in a little science
        <Icon name="ChevronDown" :size="15" />
      </summary>
      <div>
        <p>
          Phases and dates are calculated from the period start and usual cycle
          length you entered. They don’t confirm ovulation and shouldn’t be used
          as contraception. They may not reflect irregular cycles, hormonal
          contraception, pregnancy, or postpartum changes.
        </p>
        <p>
          Hormone patterns are educational illustrations. Your mood and energy
          don’t have to match a phase. If symptoms are severe, persistent, or
          unusual for you, seek medical advice.
        </p>
        <div class="flex flex-wrap gap-4">
          <a
            href="https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/"
            target="_blank"
            rel="noopener noreferrer"
            >NHS · The menstrual cycle
            <Icon name="ArrowUpRight" :size="13" /></a
          ><a
            href="https://womenshealth.gov/menstrual-cycle/your-menstrual-cycle"
            target="_blank"
            rel="noopener noreferrer"
            >Office on Women’s Health · Your cycle
            <Icon name="ArrowUpRight" :size="13" /></a
          ><a
            href="https://womenshealth.gov/menstrual-cycle/premenstrual-syndrome"
            target="_blank"
            rel="noopener noreferrer"
            >OWH · PMS & symptom tracking <Icon name="ArrowUpRight" :size="13"
          /></a>
        </div>
      </div>
    </details>
  </div>
</template>
