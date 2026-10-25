<script>
import { ref } from "vue";
import { useCycle } from "../composables/useCycle";

// Module scope so the browsed month and key survive leaving and returning to Overview.
const { today } = useCycle();
const calendarKeyOpen = ref(false);
const calendarMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1));
</script>

<script setup>
import { computed } from "vue";
import Icon from "./AppIcon.vue";
import { hasCheckin } from "../lib/checkin.js";
import { calendarEstimateAtDay, estimateCaveats } from "../lib/cyclePhases.js";
import { dateRangeLabel } from "../lib/insights.js";
import { bleedingAfterOvulation, periodDayType } from "../lib/periodHistory.js";
import {
  dateKey,
  fromKey,
  dayDifference,
  shortDate,
} from "../composables/useCycle";
import { useCheckin } from "../composables/useCheckin.js";
import { useInsights } from "../composables/useInsights.js";

// A Monday-first month, padded to complete weeks with adjacent-month dates.
function monthDates(year, month) {
  const first = new Date(year, month, 1, 12);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0, 12).getDate();
  return Array.from(
    { length: Math.ceil((offset + days) / 7) * 7 },
    (_, index) => new Date(year, month, index - offset + 1, 12),
  );
}

const { state, nextPeriod, ovulationDate } = useCycle();
const { todayLog, periodEndDates, openLog, openCalendarDate } = useCheckin();
const { range } = useInsights();
const caveats = computed(() => estimateCaveats(state.profile));
const calendarTitle = computed(() =>
  calendarMonth.value.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  }),
);
const calendarCells = computed(() => {
  const start = new Date(
    calendarMonth.value.getFullYear(),
    calendarMonth.value.getMonth(),
    1,
  );
  const hideFertile = bleedingAfterOvulation(state, dateKey(today));
  return monthDates(start.getFullYear(), start.getMonth()).map((date) => {
    const relative = dayDifference(date, fromKey(state.profile.lastPeriod));
    let type = calendarEstimateAtDay(relative + 1, state.profile.cycleLength);
    if (hideFertile && (type === "fertile" || type === "ovulation")) type = "";
    const bleedingType = periodDayType(state, dateKey(date), dateKey(today));
    if (bleedingType) type = bleedingType;
    if (
      dateKey(date) <= dateKey(today) &&
      state.logs[dateKey(date)]?.flowRecorded &&
      state.logs[dateKey(date)].flow === "None" &&
      type === "predicted"
    )
      type = "";
    return {
      date,
      key: dateKey(date),
      day: date.getDate(),
      outside: date.getMonth() !== start.getMonth(),
      today: dateKey(date) === dateKey(today),
      type,
      logged: hasCheckin(state.logs[dateKey(date)]),
    };
  });
});
function changeMonth(direction) {
  calendarMonth.value = new Date(
    calendarMonth.value.getFullYear(),
    calendarMonth.value.getMonth() + direction,
    1,
  );
}
</script>

<template>
  <section class="calendar-card card">
    <div class="section-card-heading">
      <div class="flex items-center gap-2">
        <Icon name="CalendarDays" :size="18" />
        <h2>Your cycle calendar</h2>
      </div>
    </div>
    <div class="calendar-content">
      <div class="calendar-main">
        <div class="calendar-navigation">
          <strong aria-live="polite">{{ calendarTitle }}</strong>
          <div class="flex gap-1">
            <button
              class="icon-button"
              aria-label="Previous month"
              @click="changeMonth(-1)"
            >
              <Icon name="ChevronLeft" :size="16" /></button
            ><button
              class="icon-button"
              aria-label="Next month"
              @click="changeMonth(1)"
            >
              <Icon name="ChevronRight" :size="16" />
            </button>
          </div>
        </div>
        <div class="calendar-grid" :aria-label="calendarTitle">
          <span
            v-for="(day, i) in [
              'Mon',
              'Tue',
              'Wed',
              'Thu',
              'Fri',
              'Sat',
              'Sun',
            ]"
            :key="'weekday-' + i"
            class="weekday"
            >{{ day }}</span
          >
          <button
            v-for="cell in calendarCells"
            :key="cell.key"
            class="calendar-day"
            :class="[
              cell.type,
              {
                outside: cell.outside,
                today: cell.today,
                logged: cell.logged,
              },
            ]"
            :aria-label="`${cell.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}${cell.today ? ', today' : ''}${cell.type === 'period' ? ', recorded bleeding' : cell.type === 'predicted' ? ', estimated next period start' : cell.type ? ', estimated ' + cell.type : ''}${periodEndDates.has(cell.key) ? ', period ended' : ''}${cell.logged ? ', has check-in' : ''}`"
            :data-date="cell.key"
            :aria-current="cell.today ? 'date' : undefined"
            @click="openCalendarDate(cell.date)"
          >
            <span>{{ cell.day }}</span>
            <i v-if="cell.logged" aria-hidden="true"></i>
          </button>
        </div>
      </div>
      <div class="calendar-side">
        <p v-if="state.profile.demo" class="calendar-estimate-label">
          Sample cycle
        </p>
        <div class="upcoming">
          <div>
            <span>Next period</span
            ><strong>{{
              range
                ? dateRangeLabel(range.earliest, range.latest)
                : shortDate(nextPeriod)
            }}</strong>
          </div>
        </div>
        <div class="upcoming">
          <div>
            <span>Ovulation</span
            ><strong>{{ shortDate(ovulationDate) }}</strong>
          </div>
        </div>
        <p
          v-for="caveat in caveats"
          :key="caveat"
          class="calendar-estimate-caveat"
        >
          {{ caveat }}
        </p>
      </div>
    </div>
    <div class="calendar-footer">
      <div v-if="todayLog" class="calendar-checkin-action">
        <span><Icon name="Check" :size="16" /> Check-in saved</span>
        <button
          class="small-text-button"
          aria-label="Edit today’s check-in"
          @click="openLog()"
        >
          Edit
        </button>
      </div>
      <div class="calendar-key">
        <button
          type="button"
          class="calendar-key-toggle"
          :aria-expanded="calendarKeyOpen"
          aria-controls="calendar-key-content"
          @click="calendarKeyOpen = !calendarKeyOpen"
        >
          Calendar key <Icon name="ChevronDown" :size="16" />
        </button>
        <div
          id="calendar-key-content"
          class="calendar-key-content"
          :class="{ 'is-open': calendarKeyOpen }"
          :aria-hidden="!calendarKeyOpen"
          :inert="!calendarKeyOpen"
        >
          <div class="calendar-key-clip">
            <div class="calendar-legend">
              <div class="calendar-legend-group">
                <h3>Bleeding</h3>
                <span><i class="legend-dot period"></i> Recorded bleeding</span>
                <span
                  ><i class="legend-dot predicted"></i> Next period
                  (estimated)</span
                >
              </div>
              <div class="calendar-legend-group">
                <h3>Cycle estimates</h3>
                <span><i class="legend-dot fertile"></i> Fertile window</span>
                <span><i class="legend-dot ovulation"></i> Ovulation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
