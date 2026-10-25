<script setup>
import { computed, nextTick, ref } from "vue";
import Icon from "../AppIcon.vue";
import { dateRangeLabel } from "../../lib/insights.js";
import {
  markedLength,
  maxSetupPeriods,
  periodRangeError,
  periodsReplacedBy,
  recommendedSetupPeriods,
  sortedPeriods,
} from "../../lib/onboarding.js";
import { dateKey } from "../../composables/useCycle.js";

const props = defineProps({
  modelValue: { type: Array, required: true },
  today: { type: String, required: true },
  error: String,
});
const emit = defineEmits(["update:modelValue"]);

// How far back the full calendar scrolls; six cycles fit comfortably.
const monthsBack = 12;
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const todayDate = new Date(`${props.today}T12:00:00`);
const preview = ref(null);
const sheet = ref(null);
const scroller = ref(null);
const moreDialog = ref(null);
const isOpen = ref(false);

const markedPeriod = (key) =>
  props.modelValue.find((period) => period.start <= key && key <= period.end);

// A tap marks the start, a second tap the end; the range waits for Confirm.
const start = ref("");
const end = ref("");
// A confirmed period tapped again, offered for removal; the tapped day also
// anchors a new range if the next tap marks over it instead.
const selected = ref(null);
let selectedDay = "";
const pending = computed(() =>
  start.value && end.value ? { start: start.value, end: end.value } : null,
);
// Marking over a confirmed period replaces it once the new range is confirmed.
const replaced = computed(() =>
  pending.value ? periodsReplacedBy(pending.value, props.modelValue) : [],
);
const kept = computed(() =>
  props.modelValue.filter((period) => !replaced.value.includes(period)),
);
const pendingError = computed(() => {
  if (!pending.value) return "";
  return (
    periodRangeError(pending.value, kept.value, props.today) ||
    (kept.value.length >= maxSetupPeriods
      ? `You can mark up to ${maxSetupPeriods}. Remove one first.`
      : "")
  );
});
const full = computed(() => props.modelValue.length >= maxSetupPeriods);
const remaining = computed(() => maxSetupPeriods - props.modelValue.length);

// A Monday-first month padded to complete weeks with adjacent-month dates,
// like the Overview calendar. The preview shows those dates; the scrolling
// calendar keeps them invisible, so the two line up cell for cell.
function month(year, index) {
  const first = new Date(year, index, 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, index + 1, 0, 12).getDate();
  return {
    key: dateKey(first).slice(0, 7),
    title: first.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    }),
    cells: Array.from(
      { length: Math.ceil((offset + days) / 7) * 7 },
      (_, i) => {
        const date = new Date(year, index, i - offset + 1, 12);
        const key = dateKey(date);
        const marked = markedPeriod(key);
        const inPending =
          !!start.value &&
          key >= start.value &&
          key <= (end.value || start.value);
        return {
          key,
          day: date.getDate(),
          label: date.toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          }),
          outside: date.getMonth() !== first.getMonth(),
          future: key > props.today,
          today: key === props.today,
          marked: !!marked,
          inPending,
          selected: !!marked && marked === selected.value,
        };
      },
    ),
  };
}
// Oldest first, so scrolling up goes back in time.
const months = computed(() =>
  Array.from({ length: monthsBack + 1 }, (_, i) =>
    month(todayDate.getFullYear(), todayDate.getMonth() - monthsBack + i),
  ),
);
const currentMonth = computed(() => months.value.at(-1));

function tap(cell) {
  if (cell.future) return;
  const marked = markedPeriod(cell.key);
  if (selected.value && marked !== selected.value) {
    // Marking over: the range runs from the day tapped in the period.
    selected.value = null;
    end.value = "";
    start.value = selectedDay;
  }
  if (!start.value || end.value) {
    if (marked && !start.value) {
      selected.value = selected.value === marked ? null : marked;
      selectedDay = cell.key;
      return;
    }
    selected.value = null;
    end.value = "";
    start.value = cell.key;
  } else if (cell.key < start.value) {
    end.value = start.value;
    start.value = cell.key;
  } else end.value = cell.key;
}
function clear() {
  start.value = end.value = "";
  selected.value = null;
}
function confirm() {
  if (!pending.value || pendingError.value) return;
  emit("update:modelValue", sortedPeriods([...kept.value, pending.value]));
  clear();
}
function remove() {
  emit(
    "update:modelValue",
    props.modelValue.filter((period) => period !== selected.value),
  );
  selected.value = null;
}
function done() {
  if (props.modelValue.length < recommendedSetupPeriods)
    moreDialog.value.showModal();
  else finish();
}
// Done only closes the calendar; Continue on the step moves on.
function finish() {
  moreDialog.value.close();
  close();
}

const rangeLabel = (period) => dateRangeLabel(period.start, period.end);
const daysLabel = (period) =>
  `${markedLength(period)} ${markedLength(period) === 1 ? "day" : "days"}`;
const startLabel = computed(() => dateRangeLabel(start.value, start.value));
const summary = computed(() =>
  [...props.modelValue].reverse().map(rangeLabel).join(", "),
);

// Opening morphs the preview into the calendar's current month: that month
// moves and scales from the preview's spot while the sheet's edges grow out
// of the preview's, and everything else fades in. Closing runs it in reverse,
// so the sheet lands exactly on the preview before it goes away.
const reducedMotion = () =>
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
let running = [];
function stopMorph() {
  running.forEach((animation) => animation.cancel());
  running = [];
}
function morph(opening) {
  stopMorph();
  const target = scroller.value.lastElementChild.firstElementChild;
  const from = preview.value.getBoundingClientRect();
  const to = target.getBoundingClientRect();
  const clip = `inset(${from.top}px ${window.innerWidth - from.right}px ${window.innerHeight - from.bottom}px ${from.left}px round 8px)`;
  // The month moves and resizes rather than scaling, so its text keeps its
  // shape; scaling a narrower box would squash the letters mid-morph.
  const moved = `translate(${from.left - to.left}px, ${from.top - to.top}px)`;
  const fromCell = preview.value.querySelector(".calendar-day").offsetHeight;
  const toCell = target.querySelector(".calendar-day").offsetHeight;
  const timing = {
    duration: opening ? 520 : 440,
    easing: "cubic-bezier(0.2, 0, 0, 1)",
    fill: "both",
  };
  // Keyframes are written for opening; closing plays them backwards.
  const play = (element, frames, options = timing) =>
    element.animate(opening ? frames : [...frames].reverse(), options);
  const fading = sheet.value.querySelectorAll(
    ".period-sheet-header, .period-sheet-bar, .period-sheet-month:not(:last-child)",
  );
  running = [
    play(sheet.value, [{ clipPath: clip }, { clipPath: "inset(0 round 0)" }]),
    play(target, [
      { transform: moved, width: `${from.width}px` },
      { transform: "none", width: `${to.width}px` },
    ]),
    // Short screens draw the preview's days shorter; grow them to full size.
    ...(fromCell === toCell
      ? []
      : [...target.querySelectorAll(".calendar-day")].map((cell) =>
          play(cell, [
            { height: `${fromCell}px`, minHeight: `${fromCell}px` },
            { height: `${toCell}px`, minHeight: `${toCell}px` },
          ]),
        )),
    // Dates styled differently in the preview cross-fade to their sheet look.
    ...[...target.querySelectorAll(".outside")].map((cell) =>
      play(cell, [{ opacity: 0.4 }, { opacity: 0 }]),
    ),
    ...[...target.querySelectorAll(":disabled")].map((cell) =>
      play(cell, [{ opacity: 1 }, { opacity: 0.3 }]),
    ),
    ...[...fading].map((element) =>
      play(
        element,
        [{ opacity: 0 }, { opacity: 1 }],
        opening
          ? { ...timing, duration: 360, delay: 80 }
          : { ...timing, duration: 200 },
      ),
    ),
  ];
  return Promise.all(running.map((animation) => animation.finished)).catch(
    () => {},
  );
}
async function open() {
  if (isOpen.value) return;
  isOpen.value = true;
  sheet.value.showModal();
  await nextTick();
  scroller.value.scrollTop = scroller.value.scrollHeight;
  if (reducedMotion()) return;
  await morph(true);
  if (isOpen.value) stopMorph();
}
async function close() {
  if (!isOpen.value) return;
  isOpen.value = false;
  clear();
  if (!reducedMotion()) await morph(false);
  sheet.value.close();
  stopMorph();
}
function onCancel(event) {
  event.preventDefault();
  close();
}

defineExpose({ open });
</script>

<template>
  <div class="period-picker" :class="{ 'has-error': error }">
    <button
      ref="preview"
      type="button"
      class="period-preview period-month"
      :aria-label="`Open calendar to mark your periods${modelValue.length ? `. Marked: ${summary}` : ''}`"
      :aria-invalid="error ? true : undefined"
      :aria-describedby="error ? 'onboarding-periods-error' : undefined"
      @click="open"
    >
      <span class="calendar-navigation">
        <strong>{{ currentMonth.title }}</strong>
      </span>
      <span class="calendar-grid" aria-hidden="true">
        <span v-for="day in weekdays" :key="day" class="weekday">{{
          day
        }}</span>
        <span
          v-for="cell in currentMonth.cells"
          :key="cell.key"
          class="calendar-day"
          :class="{
            outside: cell.outside,
            today: cell.today,
            period: cell.marked,
          }"
          ><span>{{ cell.day }}</span></span
        >
      </span>
    </button>
    <p
      v-if="error"
      id="onboarding-periods-error"
      class="onboarding-error"
      role="alert"
    >
      {{ error }}
    </p>

    <dialog
      ref="sheet"
      class="period-sheet"
      aria-labelledby="period-sheet-title"
      @cancel="onCancel"
    >
      <header class="period-sheet-header">
        <div>
          <h2 id="period-sheet-title">Mark your periods</h2>
          <p>Scroll up for earlier months.</p>
        </div>
        <button
          class="onboarding-data-button"
          type="button"
          aria-label="Close calendar"
          @click="close"
        >
          <Icon name="X" :size="20" />
        </button>
      </header>
      <div
        ref="scroller"
        class="period-sheet-months"
        :class="{ 'is-confirming': !!pending }"
      >
        <section
          v-for="m in months"
          :key="m.key"
          class="period-sheet-month"
          :aria-label="m.title"
        >
          <div class="period-month">
            <div class="calendar-navigation">
              <strong>{{ m.title }}</strong>
            </div>
            <div class="calendar-grid">
              <span
                v-for="day in weekdays"
                :key="day"
                class="weekday"
                aria-hidden="true"
                >{{ day }}</span
              >
              <template v-for="cell in m.cells" :key="cell.key">
                <span
                  v-if="cell.outside"
                  class="calendar-day outside"
                  aria-hidden="true"
                  ><span>{{ cell.day }}</span></span
                >
                <button
                  v-else
                  type="button"
                  class="calendar-day"
                  :class="{
                    today: cell.today,
                    period: cell.marked || cell.inPending,
                    pending: cell.inPending,
                    selected: cell.selected,
                  }"
                  :disabled="cell.future"
                  :aria-label="`${cell.label}${cell.today ? ', today' : ''}${cell.marked ? ', marked as period' : ''}${cell.inPending ? ', in your selection' : ''}`"
                  :aria-pressed="cell.marked || cell.inPending"
                  @click="tap(cell)"
                >
                  <span>{{ cell.day }}</span>
                </button>
              </template>
            </div>
          </div>
        </section>
      </div>

      <footer class="period-sheet-bar" aria-live="polite">
        <div class="period-sheet-status">
          <template v-if="pending">
            <strong>{{ rangeLabel(pending) }}</strong>
            <p>{{ daysLabel(pending) }}. Is this right?</p>
          </template>
          <template v-else-if="start">
            <strong>Started {{ startLabel }}</strong>
            <p>Now tap the day it ended.</p>
          </template>
          <template v-else-if="selected">
            <strong>{{ rangeLabel(selected) }}</strong>
          </template>
          <template v-else-if="!modelValue.length">
            <strong>Your most recent period</strong>
            <p>Tap its first day, then its last.</p>
          </template>
          <template v-else>
            <strong
              >{{ modelValue.length }}
              {{ modelValue.length === 1 ? "period" : "periods" }}
              marked</strong
            >
            <p v-if="!full">Scroll up and mark one more.</p>
          </template>
        </div>
        <div class="period-sheet-actions">
          <template v-if="start">
            <button class="button onboarding-back" type="button" @click="clear">
              Clear
            </button>
            <button
              class="button button-dark"
              type="button"
              :disabled="!pending || !!pendingError"
              @click="confirm"
            >
              <Icon name="Check" :size="17" /> Confirm
            </button>
          </template>
          <template v-else-if="selected">
            <button
              class="button onboarding-back"
              type="button"
              @click="selected = null"
            >
              Keep
            </button>
            <button class="button button-dark" type="button" @click="remove">
              <Icon name="Trash2" :size="17" /> Remove
            </button>
          </template>
          <button
            v-else-if="modelValue.length >= 2"
            class="button button-dark"
            type="button"
            @click="done"
          >
            Done <Icon name="Check" :size="17" />
          </button>
          <button
            v-else-if="modelValue.length === 1"
            class="button button-dark"
            type="button"
            disabled
          >
            Mark up to {{ remaining }} more
          </button>
          <button v-else class="button button-dark" type="button" disabled>
            <Icon name="Check" :size="17" /> Confirm
          </button>
        </div>
      </footer>

      <dialog
        ref="moreDialog"
        class="onboarding-data-dialog period-more-dialog"
        aria-labelledby="period-more-title"
      >
        <h2 id="period-more-title">Add a few more?</h2>
        <p>
          You can add more periods. Each one you add makes your estimates
          better.
        </p>
        <div class="period-more-actions">
          <button
            class="button button-dark"
            type="button"
            autofocus
            @click="moreDialog.close()"
          >
            Okay
          </button>
          <button class="button onboarding-back" type="button" @click="finish">
            No, continue with {{ modelValue.length }} periods
          </button>
        </div>
      </dialog>
    </dialog>
  </div>
</template>
