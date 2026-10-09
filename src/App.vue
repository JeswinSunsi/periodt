<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  watch,
} from "vue";
import Icon from "./components/AppIcon.vue";
import BotanicalArt from "./components/BotanicalArt.vue";
import CycleRing from "./components/CycleRing.vue";
import CycleDetail from "./components/CycleDetail.vue";
import {
  isPeriodStart,
  removePeriodStart,
  periodWindows,
  periodDayType,
} from "./lib/periodHistory.js";
import {
  useCycle,
  dateKey,
  fromKey,
  addDays,
  dayDifference,
} from "./composables/useCycle";
const {
  state,
  today,
  cycleDay,
  remaining,
  nextPeriod,
  phase,
  storageError,
  currentPeriodLength,
} = useCycle();
const pageRoutes = {
  Overview: "/overview",
  "My cycle": "/cycle",
  "My calendar": "/calendar",
  "Cycle insights": "/insights",
  "My journal": "/journal",
  "Partner space": "/partner",
};
function pageFromHash() {
  return (
    Object.keys(pageRoutes).find(
      (page) => pageRoutes[page] === window.location.hash.slice(1),
    ) || "Overview"
  );
}
const activePage = ref(pageFromHash()),
  mobileNav = ref(false);
const navigation = [
  { title: "Overview", icon: "House" },
  { title: "My cycle", icon: "Sprout" },
  { title: "My calendar", icon: "CalendarDays" },
  { title: "Cycle insights", icon: "ChartNoAxesColumnIncreasing" },
  { title: "My journal", icon: "BookOpen" },
  { title: "Partner space", icon: "Users" },
];
const pageHeading = computed(
  () =>
    ({
      Overview: "A little more in tune.",
      "My cycle": "A little closer to you.",
      "My calendar": "Your cycle, at a glance.",
      "Cycle insights": "Get to know your rhythm.",
      "My journal": "A little space for you.",
      "Partner space": "A little closer, together.",
    })[activePage.value],
);
const pageDescription = computed(
  () =>
    ({
      Overview: "Every day is different. Let’s meet you where you are.",
      "My cycle": "Understand the changes. Get curious about your own rhythm.",
      "My calendar": "Notice your patterns, one day at a time.",
      "Cycle insights":
        "Your body tells a story. Start listening to the patterns.",
      "My journal":
        "The big feelings, the little things. They all belong here.",
      "Partner space": "Preview the details you’d want your person to see.",
    })[activePage.value],
);
const shortDate = (date) =>
  date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fullDate = today.toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
const todayLog = computed(() => state.logs[dateKey(today)]);
const moods = [
  { name: "Low", face: "low" },
  { name: "A little off", face: "off" },
  { name: "Okay", face: "okay" },
  { name: "Good", face: "good" },
  { name: "Glowing", face: "glow" },
];
const selectedMood = ref(todayLog.value?.mood || "");
const phaseCopy = {
  Menstrual: {
    title: "A little room to rest.",
    description:
      "Your period is part of your rhythm. Make space for whatever feels good today.",
    icon: "Moon",
  },
  Follicular: {
    title: "A fresh little beginning.",
    description:
      "Your body is moving into a new chapter. There’s no rush — find your own rhythm.",
    icon: "Sprout",
  },
  Ovulation: {
    title: "Check in with your energy.",
    description:
      "You may be near ovulation. Take a moment to notice how you’re feeling.",
    icon: "Sun",
  },
  Luteal: {
    title: "Come back to yourself.",
    description:
      "A softer pace might feel good. Listen to your body and make room for your needs.",
    icon: "Leaf",
  },
  Unconfirmed: {
    title: "Your rhythm is your own.",
    description:
      "Your next period hasn’t been logged. Update your dates when you’re ready.",
    icon: "Heart",
  },
};
const currentPhaseCopy = computed(() => phaseCopy[phase.value]);
const calendarMonth = ref(new Date(today.getFullYear(), today.getMonth(), 1));
const calendarTitle = computed(() =>
  calendarMonth.value.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  }),
);
const calendarCells = computed(() => {
  const windows = periodWindows(state, dateKey(today));
  const start = new Date(
    calendarMonth.value.getFullYear(),
    calendarMonth.value.getMonth(),
    1,
  );
  const offset = (start.getDay() + 6) % 7,
    last = new Date(start.getFullYear(), start.getMonth() + 1, 0).getDate();
  return Array.from({ length: Math.ceil((offset + last) / 7) * 7 }, (_, i) => {
    const date = addDays(start, i - offset),
      relative = dayDifference(date, fromKey(state.profile.lastPeriod));
    let type = "";
    if (
      relative >= state.profile.cycleLength &&
      relative < state.profile.cycleLength + state.profile.periodLength
    )
      type = "predicted";
    if (
      relative >= state.profile.cycleLength - 20 &&
      relative <= state.profile.cycleLength - 15
    )
      type = "fertile";
    if (relative === state.profile.cycleLength - 15) type = "ovulation";
    const bleedingType = periodDayType(
      state,
      dateKey(date),
      dateKey(today),
      windows,
    );
    if (bleedingType) type = bleedingType;
    if (
      date <= today &&
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
      logged: !!state.logs[dateKey(date)],
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
async function goTo(page) {
  activePage.value = page;
  window.location.hash = pageRoutes[page];
  mobileNav.value = false;
  await nextTick();
  window.scrollTo({ top: 0, behavior: "auto" });
  document.querySelector(".page-heading h1")?.focus({ preventScroll: true });
}
async function syncPageFromHash() {
  activePage.value = pageFromHash();
  mobileNav.value = false;
  await nextTick();
  window.scrollTo({ top: 0, behavior: "auto" });
  document.querySelector(".page-heading h1")?.focus({ preventScroll: true });
}
onMounted(() => window.addEventListener("hashchange", syncPageFromHash));
onBeforeUnmount(() =>
  window.removeEventListener("hashchange", syncPageFromHash),
);
const toast = ref("");
let toastTimer;
function notify(message) {
  toast.value = message;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.value = "";
  }, 4000);
}
const modal = ref(""),
  modalElement = ref(null);
const sidebarElement = ref(null);
const closePrompt = ref("");
const draftSnapshot = ref("");
let afterDiscard;
let previousFocus;
function syncBodyScrollLock() {
  document.body.style.overflow = modal.value || mobileNav.value ? "hidden" : "";
}
watch(modal, async (value, old) => {
  syncBodyScrollLock();
  if (value) {
    toast.value = "";
    clearTimeout(toastTimer);
    if (!old) previousFocus = document.activeElement;
    await nextTick();
    modalElement.value?.focus();
    modalElement.value?.scrollTo({ top: 0 });
  } else {
    closePrompt.value = "";
    selectedMood.value = todayLog.value?.mood || "";
    await nextTick();
    const isVisible = (element) =>
      element?.getClientRects().length &&
      getComputedStyle(element).visibility !== "hidden";
    const menu = document.querySelector(".mobile-menu");
    const target = isVisible(previousFocus)
      ? previousFocus
      : isVisible(menu)
        ? menu
        : document.querySelector(".page-heading h1");
    target?.focus();
  }
});
watch(mobileNav, async (open) => {
  syncBodyScrollLock();
  await nextTick();
  if (open) sidebarElement.value?.querySelector(".nav-close")?.focus();
  else if (
    !modal.value &&
    sidebarElement.value?.contains(document.activeElement)
  )
    document.querySelector(".mobile-menu")?.focus();
});
const mobileQuery = window.matchMedia("(max-width: 680px)");
function syncNavigationViewport() {
  if (!mobileQuery.matches) mobileNav.value = false;
}
function skipToContent() {
  document.querySelector(".page-heading h1")?.focus();
}
onMounted(() => mobileQuery.addEventListener("change", syncNavigationViewport));
onBeforeUnmount(() =>
  mobileQuery.removeEventListener("change", syncNavigationViewport),
);
function trapFocus(event, root) {
  if (event.key !== "Tab") return;
  const items = [
    ...root.querySelectorAll("button, input, textarea, select, a[href]"),
  ].filter(
    (el) =>
      !el.disabled &&
      !el.closest("[inert]") &&
      !el.closest("fieldset:disabled") &&
      el.offsetParent !== null,
  );
  if (
    event.shiftKey &&
    (document.activeElement === items[0] ||
      !items.includes(document.activeElement))
  ) {
    event.preventDefault();
    items.at(-1)?.focus();
  } else if (!event.shiftKey && document.activeElement === items.at(-1)) {
    event.preventDefault();
    items[0]?.focus();
  }
}
function modalKeydown(event) {
  if (event.key === "Escape") {
    event.preventDefault();
    closePrompt.value ? keepEditing() : requestClose();
  }
  trapFocus(event, modalElement.value);
}
function navigationKeydown(event) {
  if (!mobileNav.value) return;
  if (event.key === "Escape") mobileNav.value = false;
  trapFocus(event, sidebarElement.value);
}
const hasUnsavedChanges = computed(() =>
  modal.value === "log"
    ? JSON.stringify(draft) !== draftSnapshot.value
    : modal.value === "settings" &&
      JSON.stringify(settings) !== draftSnapshot.value,
);
async function showPrompt(kind) {
  closePrompt.value = kind;
  await nextTick();
  modalElement.value?.querySelector(".close-prompt button")?.focus();
}
function requestClose(nextAction) {
  if (hasUnsavedChanges.value) {
    afterDiscard = nextAction;
    showPrompt("discard");
  } else if (nextAction) nextAction();
  else modal.value = "";
}
async function keepEditing() {
  closePrompt.value = "";
  afterDiscard = undefined;
  await nextTick();
  modalElement.value?.focus();
}
function confirmDiscard() {
  closePrompt.value = "";
  const action = afterDiscard;
  afterDiscard = undefined;
  if (action) action();
  else modal.value = "";
}
const logDate = ref(dateKey(today)),
  draft = reactive({
    mood: "",
    flow: "None",
    flowRecorded: false,
    symptoms: [],
    notes: "",
    periodStart: false,
    periodEnd: false,
  });
const symptoms = [
  "Cramps",
  "Bloating",
  "Headache",
  "Tender breasts",
  "Low energy",
  "Acne",
  "Backache",
  "Cravings",
];
const canSaveLog = computed(
  () =>
    !!state.logs[logDate.value] ||
    isPeriodStart(state, logDate.value) ||
    !!(
      draft.mood ||
      draft.flowRecorded ||
      draft.flow !== "None" ||
      draft.symptoms.length ||
      draft.notes.trim() ||
      draft.periodStart ||
      draft.periodEnd
    ),
);
const showPeriodStart = computed(() => {
  if (isPeriodStart(state, logDate.value)) return true;
  if (logDate.value > dateKey(today)) return false;
  const recordedStarts = [
    ...(state.profile.demo ? [] : [state.profile.lastPeriod]),
    ...state.periodHistory.map((period) => period.start),
    ...Object.entries(state.logs)
      .filter(([, log]) => log.periodStart)
      .map(([date]) => date),
  ];
  return !recordedStarts.some((start) => {
    const elapsed = dayDifference(fromKey(logDate.value), fromKey(start));
    return elapsed >= 0 && elapsed < 7;
  });
});
const checkinPeriod = computed(() =>
  periodWindows(state, dateKey(today))
    .filter((period) => !period.sample && period.start <= logDate.value)
    .at(-1),
);
const showPeriodEnd = computed(() => {
  const period = checkinPeriod.value;
  return (
    logDate.value <= dateKey(today) &&
    !isPeriodStart(state, logDate.value) &&
    !!period &&
    dayDifference(fromKey(logDate.value), fromKey(period.start)) >= 3 &&
    (!period.end || period.end >= logDate.value)
  );
});
function togglePeriodEnd(event) {
  draft.periodEnd = event.target.checked;
  if (draft.periodEnd) {
    draft.periodStart = false;
    draft.flow = "None";
    draft.flowRecorded = true;
  } else if (draft.flow === "None") {
    // Undo the end rather than leaving an explicit None that would end it again.
    draft.flowRecorded = false;
  }
}
function selectFlow(flow) {
  draft.flow = flow;
  draft.flowRecorded = true;
  draft.periodEnd = flow === "None" && showPeriodEnd.value;
}
function openLog(date = today, initialMood = "") {
  logDate.value = dateKey(date);
  const existing = state.logs[logDate.value];
  Object.assign(draft, {
    mood: existing?.mood || "",
    flow: existing?.flow || "None",
    flowRecorded:
      existing?.flowRecorded === true ||
      !!(existing?.flow && existing.flow !== "None"),
    symptoms: [...(existing?.symptoms || [])],
    notes: existing?.notes || "",
    periodStart: isPeriodStart(state, logDate.value),
    periodEnd: checkinPeriod.value?.end === logDate.value,
  });
  draftSnapshot.value = JSON.stringify(draft);
  if (initialMood) draft.mood = initialMood;
  modal.value = "log";
}
function toggleSymptom(symptom) {
  const index = draft.symptoms.indexOf(symptom);
  index < 0 ? draft.symptoms.push(symptom) : draft.symptoms.splice(index, 1);
}
function setPeriodStart(date) {
  if (
    !state.profile.demo &&
    date !== state.profile.lastPeriod &&
    !state.periodHistory.some((p) => p.start === state.profile.lastPeriod)
  ) {
    state.periodHistory.push({
      start: state.profile.lastPeriod,
      length: state.profile.periodLength,
    });
  }
  if (state.profile.demo || date >= state.profile.lastPeriod) {
    state.profile.lastPeriod = date;
    state.profile.demo = false;
  } else if (!state.periodHistory.some((p) => p.start === date))
    state.periodHistory.push({
      start: date,
      length: state.profile.periodLength,
    });
}
function saveLog() {
  if (!canSaveLog.value) return;
  if (draft.periodStart && logDate.value <= dateKey(today))
    setPeriodStart(logDate.value);
  else if (!draft.periodStart && isPeriodStart(state, logDate.value))
    removePeriodStart(state, logDate.value, dateKey(addDays(today, -11)));
  state.logs[logDate.value] = { ...draft, symptoms: [...draft.symptoms] };
  if (logDate.value === dateKey(today)) selectedMood.value = draft.mood;
  modal.value = "";
  notify(
    logDate.value > dateKey(today)
      ? "Your planned note is saved."
      : "Your check-in is saved. ♡",
  );
}
function deleteLog() {
  if (isPeriodStart(state, logDate.value))
    removePeriodStart(state, logDate.value, dateKey(addDays(today, -11)));
  delete state.logs[logDate.value];
  modal.value = "";
  notify("Check-in deleted.");
}
const settings = reactive({ lastPeriod: "", cycleLength: 28, periodLength: 5 });
function openSettings() {
  requestClose(() => {
    mobileNav.value = false;
    Object.assign(settings, state.profile);
    draftSnapshot.value = JSON.stringify(settings);
    modal.value = "settings";
  });
}
function saveSettings() {
  setPeriodStart(settings.lastPeriod);
  Object.assign(state.profile, settings, { demo: false });
  modal.value = "";
  notify("Your cycle details are updated.");
}
const journalEntries = computed(() =>
  Object.entries(state.logs).sort(([a], [b]) => b.localeCompare(a)),
);
const periodEndDates = computed(
  () =>
    new Set(
      periodWindows(state, dateKey(today))
        .map((period) => period.end)
        .filter(Boolean),
    ),
);
const mostLogged = computed(() => {
  const counts = {};
  completedEntries.value.forEach(([, log]) =>
    log.symptoms.forEach((s) => {
      counts[s] = (counts[s] || 0) + 1;
    }),
  );
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
});
const completedEntries = computed(() =>
  journalEntries.value.filter(([date]) => date <= dateKey(today)),
);
function generateCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6)),
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  state.sharing.code =
    "PT-" + [...bytes].map((x) => alphabet[x % alphabet.length]).join("");
  notify("Your demo sharing code is ready.");
}
async function copyCode() {
  try {
    await navigator.clipboard.writeText(state.sharing.code);
    notify("Code copied to your clipboard.");
  } catch {
    notify("Copy isn’t available. Select and copy the code below.");
  }
}
const enteredCode = ref(""),
  codeError = ref("");
function previewPartner() {
  enteredCode.value = "";
  codeError.value = "";
  modal.value = "redeem";
}
function redeemCode() {
  if (
    state.sharing.code &&
    enteredCode.value.trim().toUpperCase() === state.sharing.code
  )
    modal.value = "partner";
  else
    codeError.value = "That code doesn’t match an active code in this browser.";
}
const articles = [
  {
    tag: "KNOW YOUR BODY",
    title: "Your cycle has seasons, too.",
    description: "A gentle guide to your four cycle phases.",
    art: "leaves",
    color: "sage",
    time: "3 min read",
    body: "The menstrual cycle starts on the first day of your period. During the follicular phase, an egg develops and estrogen rises. Ovulation is when an ovary releases an egg. The luteal phase follows ovulation and ends when the next period starts. Menstruation overlaps with the beginning of the follicular phase — the four seasons are a helpful way to explore, not four rigid boxes. Timing and experiences vary, and calendar estimates cannot confirm ovulation.",
    source:
      "https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/",
    sourceName: "NHS: Periods and fertility",
  },
  {
    tag: "A LITTLE SELF-CARE",
    title: "Small comforts, big difference.",
    description: "Make a little space for a softer day.",
    art: "tea",
    color: "peach",
    time: "2 min read",
    body: "A warm bath, a heat pad wrapped in a towel, or a gentle walk may help ease period discomfort. Choose what feels comfortable for you; you don’t need to be productive to deserve rest. Keeping a note of pain and other symptoms can help you spot changes. If pain is severe, worse than usual, or stops you doing your normal activities, seek medical advice.",
    source: "https://www.nhs.uk/symptoms/period-pain/",
    sourceName: "NHS: Period pain",
  },
  {
    tag: "FIND YOUR RHYTHM",
    title: "Move the way you feel.",
    description: "Less pressure. More listening to you.",
    art: "landscape",
    color: "sand",
    time: "2 min read",
    body: "There is no single exercise schedule that everyone needs to follow through their cycle. Check in with your energy and preferences. Gentle movement such as walking, swimming, or yoga may help with period pain. Record how you feel before and after movement to learn what works for you, without assuming your phase determines your abilities.",
    source: "https://www.nhs.uk/symptoms/period-pain/",
    sourceName: "NHS: Period pain",
  },
];
const selectedArticle = ref(articles[0]);
function openArticle(article) {
  selectedArticle.value = article;
  modal.value = "article";
}
onBeforeUnmount(() => {
  clearTimeout(toastTimer);
  document.body.style.overflow = "";
});
</script>

<template>
  <a
    class="skip-link"
    href="#main-content"
    :inert="modal || mobileNav ? true : undefined"
    @click.prevent="skipToContent"
    >Skip to content</a
  >
  <div class="app-shell" :inert="modal ? true : undefined">
    <aside
      id="main-navigation"
      ref="sidebarElement"
      class="sidebar"
      :class="{ 'mobile-open': mobileNav }"
      :role="mobileNav ? 'dialog' : undefined"
      :aria-modal="mobileNav ? true : undefined"
      aria-label="Main navigation"
      @keydown="navigationKeydown"
    >
      <button
        class="icon-button nav-close"
        aria-label="Close navigation"
        @click="mobileNav = false"
      >
        <Icon name="X" />
      </button>
      <a
        href="#"
        class="brand"
        aria-label="periodt home"
        @click.prevent="goTo('Overview')"
        ><span class="brand-flower">✳</span> periodt<span class="brand-dot"
          >.</span
        ></a
      >
      <p class="brand-subtitle">IN YOUR OWN RHYTHM</p>
      <div class="nav-label">YOUR LITTLE SPACE</div>
      <nav class="space-y-2" aria-label="Main navigation">
        <button
          v-for="item in navigation"
          :key="item.title"
          class="nav-item"
          :class="{ active: activePage === item.title }"
          :aria-current="activePage === item.title ? 'page' : undefined"
          @click="goTo(item.title)"
        >
          <Icon :name="item.icon" :size="19" /><span>{{ item.title }}</span
          ><span v-if="item.title === 'Partner space'" class="nav-heart"
            >♡</span
          >
        </button>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-note">
          <div class="note-flower">✳</div>
          <p>Your body.<br />Your pace.<br />Your kind of care.</p>
          <span>A little reminder, just for you.</span>
        </div>
        <button class="nav-item settings-link" @click="openSettings">
          <Icon name="Settings2" :size="19" /> Cycle settings
        </button>
        <div class="profile">
          <div class="avatar"><Icon name="Sprout" :size="21" /></div>
          <div>
            <strong>My little space</strong><span>Growing with you</span>
          </div>
        </div>
      </div>
    </aside>
    <button
      v-if="mobileNav"
      class="nav-backdrop"
      aria-label="Close navigation"
      tabindex="-1"
      @click="mobileNav = false"
    ></button>
    <main
      id="main-content"
      class="main-content"
      :inert="mobileNav ? true : undefined"
    >
      <header class="topbar">
        <div class="flex items-center gap-3">
          <button
            class="icon-button mobile-menu"
            :aria-expanded="mobileNav"
            aria-controls="main-navigation"
            aria-label="Open navigation"
            @click="mobileNav = !mobileNav"
          >
            <Icon name="Menu" /></button
          ><span class="breadcrumb"
            >My space <span>/</span> <b>{{ activePage }}</b></span
          >
        </div>
        <div class="flex items-center gap-3">
          <span class="private-label"
            ><Icon name="LockKeyhole" :size="13" /> Just for you</span
          ><button
            class="top-avatar"
            aria-label="Open cycle settings"
            @click="openSettings"
          >
            <Icon name="Sprout" :size="18" />
          </button>
        </div>
      </header>
      <div class="page-content">
        <div v-if="storageError.value" class="storage-warning" role="alert">
          Your browser couldn’t save this update. Keep this tab open to retain
          your changes.
        </div>
        <section
          class="page-heading flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p class="eyebrow">
              <span class="tiny-sun">☼</span> {{ fullDate }}
            </p>
            <h1 tabindex="-1">{{ pageHeading }}</h1>
            <p class="page-description">{{ pageDescription }}</p>
          </div>
          <button class="button button-dark" @click="openLog()">
            <Icon :name="todayLog ? 'Pencil' : 'Plus'" :size="18" />
            {{ todayLog ? "Edit today’s check-in" : "Log my day" }}
          </button>
        </section>
        <CycleDetail
          v-if="activePage === 'My cycle'"
          @back="goTo('Overview')"
          @log="(date) => openLog(date)"
          @settings="openSettings"
          @calendar="goTo('My calendar')"
        />
        <div v-if="activePage === 'Overview'" class="top-grid">
          <section class="cycle-card cycle-card-interactive">
            <button
              class="cycle-card-hitbox"
              aria-label="Open my cycle: explore phases, body changes, and check-ins"
              @click="goTo('My cycle')"
            ></button>
            <div class="cycle-card-top">
              <span class="card-eyebrow">YOU & YOUR CYCLE</span
              ><button
                class="cycle-edit"
                aria-label="Edit cycle details"
                @click="openSettings"
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
                <span class="phase-badge"
                  ><Icon :name="currentPhaseCopy.icon" :size="14" />
                  {{
                    phase === "Unconfirmed"
                      ? "Awaiting your next log"
                      : phase + " phase"
                  }}</span
                >
                <h2>{{ currentPhaseCopy.title }}</h2>
                <p>{{ currentPhaseCopy.description }}</p>
                <span class="text-button cycle-explore-link"
                  >Explore my cycle <Icon name="ArrowUpRight" :size="16"
                /></span>
              </div>
            </div>
            <div class="cycle-card-footer">
              <span
                ><span class="small-dot peach-dot"></span>
                {{
                  remaining >= 0
                    ? "Next period in about"
                    : "Expected period was"
                }}
                <strong
                  >{{ Math.abs(remaining) }} days{{
                    remaining < 0 ? " ago" : ""
                  }}</strong
                ></span
              ><span class="estimate"
                >{{ state.profile.demo ? "Sample cycle" : "Estimated" }}
                <span>·</span> {{ shortDate(nextPeriod) }}</span
              >
            </div>
          </section>
          <section class="checkin-card card">
            <div class="flex items-center justify-between">
              <span class="card-eyebrow">YOUR DAILY CHECK-IN</span
              ><Icon name="Sun" :size="20" />
            </div>
            <h2>How’s your little world?</h2>
            <p>A moment to pause and check in with you.</p>
            <div class="mood-options">
              <button
                v-for="mood in moods"
                :key="mood.name"
                class="mood-option"
                :class="{ selected: selectedMood === mood.name }"
                :aria-pressed="selectedMood === mood.name"
                @click="openLog(today, mood.name)"
              >
                <span class="mood-face" :class="mood.face"
                  ><i></i><i></i><b></b
                  ><span v-if="mood.face === 'glow'" class="face-spark"
                    >✧</span
                  ></span
                ><span>{{ mood.name }}</span>
              </button>
            </div>
            <button
              class="checkin-button"
              @click="openLog(today, selectedMood)"
            >
              {{ todayLog ? "Edit today’s check-in" : "Check in with yourself"
              }}<Icon
                :name="todayLog ? 'Check' : 'ArrowRight'"
                :size="17"
              /></button
            ><span class="checkin-caption">{{
              todayLog
                ? "Today’s check-in is saved. Tap a mood to edit."
                : "Choose a mood, then save your check-in."
            }}</span>
          </section>
        </div>
        <div
          v-if="activePage === 'Overview' || activePage === 'My calendar'"
          class="middle-grid"
          :class="{ 'calendar-page': activePage === 'My calendar' }"
        >
          <section class="calendar-card card">
            <div class="section-card-heading">
              <div class="flex items-center gap-2">
                <Icon name="CalendarDays" :size="18" />
                <h2>Your cycle calendar</h2>
              </div>
              <button
                v-if="activePage === 'Overview'"
                class="small-text-button"
                @click="goTo('My calendar')"
              >
                View calendar <Icon name="ArrowUpRight" :size="15" /></button
              ><button
                v-else
                class="small-text-button"
                @click="
                  calendarMonth = new Date(
                    today.getFullYear(),
                    today.getMonth(),
                    1,
                  )
                "
              >
                Back to today
              </button>
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
                <div class="calendar-grid">
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
                  ><button
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
                    :aria-label="`${cell.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}${cell.today ? ', today' : ''}${cell.type === 'period' ? ', recorded bleeding' : cell.type === 'expected-period' ? ', expected bleeding' + (state.profile.demo ? ', sample cycle' : '') : cell.type ? ', estimated ' + cell.type : ''}${periodEndDates.has(cell.key) ? ', period ended' : ''}${cell.logged ? ', has check-in' : ''}`"
                    :data-date="cell.key"
                    :aria-current="cell.today ? 'date' : undefined"
                    @click="openLog(cell.date)"
                  >
                    <span>{{ cell.day }}</span
                    ><i v-if="cell.logged"></i>
                  </button>
                </div>
                <p class="calendar-instruction">
                  Select a date to add or edit a check-in. Future dates are for
                  planned notes.
                </p>
              </div>
              <div class="calendar-side">
                <p class="card-eyebrow">A LITTLE LOOK AHEAD</p>
                <div class="upcoming">
                  <span class="upcoming-icon"
                    ><Icon name="Droplet" :size="18"
                  /></span>
                  <div>
                    <span>Next period</span
                    ><strong
                      >{{ shortDate(nextPeriod) }} –
                      {{
                        shortDate(
                          addDays(nextPeriod, state.profile.periodLength - 1),
                        )
                      }}</strong
                    ><small>Estimated start</small>
                  </div>
                </div>
                <div class="upcoming">
                  <span class="upcoming-icon sage"
                    ><Icon name="Sprout" :size="18"
                  /></span>
                  <div>
                    <span>Ovulation</span
                    ><strong
                      >~
                      {{
                        shortDate(
                          addDays(
                            fromKey(state.profile.lastPeriod),
                            state.profile.cycleLength - 15,
                          ),
                        )
                      }}</strong
                    ><small>Calendar estimate</small>
                  </div>
                </div>
                <p class="calendar-note">
                  <Icon name="Heart" :size="14" /> A guide, not a rule.<br />Your
                  rhythm can change.
                </p>
              </div>
            </div>
            <div class="calendar-legend">
              <span><i class="legend-dot period"></i> Recorded bleeding</span
              ><span
                ><i class="legend-dot expected-period"></i> Expected bleeding{{
                  state.profile.demo ? " (sample)" : ""
                }}</span
              ><span><i class="legend-dot predicted"></i> Predicted period</span
              ><span
                ><i class="legend-dot fertile"></i> Est. fertile window</span
              ><span><i class="legend-dot ovulation"></i> Est. ovulation</span>
              <span><i class="legend-dot current-day"></i> Today</span>
              <span><i class="legend-dot logged"></i> Has check-in</span>
            </div>
          </section>
          <section v-if="activePage === 'Overview'" class="partner-card">
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
              Let your person in on your rhythm.<br />Share what feels right, on
              your terms.
            </p>
            <button
              class="button button-outline"
              @click="goTo('Partner space')"
            >
              <Icon name="Link" :size="16" />
              {{
                state.sharing.code
                  ? "Manage partner space"
                  : "Explore partner preview"
              }}<Icon name="ArrowUpRight" :size="16" /></button
            ><span class="partner-caption"
              ><Icon name="ShieldCheck" :size="12" /> You’re always in
              control.</span
            >
          </section>
        </div>
        <section v-if="activePage === 'Overview'" class="care-section">
          <div class="care-heading">
            <div>
              <h2>A little care goes a long way <span>✧</span></h2>
              <p>
                Small things to support you, wherever you are in your cycle.
              </p>
            </div>
            <button class="small-text-button" @click="modal = 'library'">
              Browse self-care guides <Icon name="ArrowRight" :size="16" />
            </button>
          </div>
          <div class="article-grid">
            <button
              v-for="article in articles"
              :key="article.title"
              class="article-card"
              @click="openArticle(article)"
            >
              <div class="article-art" :class="article.color">
                <BotanicalArt :variant="article.art" />
              </div>
              <div class="article-copy">
                <span>{{ article.tag }}</span>
                <h3>{{ article.title }}</h3>
                <p>{{ article.description }}</p>
                <div>
                  {{ article.time }}<Icon name="ArrowUpRight" :size="16" />
                </div>
              </div>
            </button>
          </div>
        </section>
        <template v-if="activePage === 'Cycle insights'"
          ><div class="insight-grid">
            <div class="card stat-card">
              <Icon name="CalendarDays" /><span>Your cycle length</span
              ><strong
                >{{ state.profile.cycleLength }} <small>days</small></strong
              >
              <p>
                {{
                  state.profile.demo
                    ? "Sample setting — edit in Cycle settings"
                    : "Based on your cycle setting"
                }}
              </p>
            </div>
            <div class="card stat-card">
              <Icon name="Droplet" /><span>Your period length</span
              ><strong
                >{{ state.profile.periodLength }} <small>days</small></strong
              >
              <p>
                {{
                  state.profile.demo
                    ? "Sample setting — edit in Cycle settings"
                    : "Based on your period setting"
                }}
              </p>
            </div>
            <div class="card stat-card">
              <Icon name="BookOpen" /><span>Little moments logged</span
              ><strong
                >{{ completedEntries.length }}
                <small>{{
                  completedEntries.length === 1 ? "day" : "days"
                }}</small></strong
              >
              <p>Every check-in is a little insight.</p>
            </div>
          </div>
          <div class="card insights-detail">
            <h2>Meet your cycle’s seasons</h2>
            <p>
              Four ways to understand your cycle. Every body has its own timing.
            </p>
            <div class="phase-grid">
              <template v-for="(item, name) in phaseCopy" :key="name"
                ><button
                  v-if="name !== 'Unconfirmed'"
                  class="phase-item"
                  @click="modal = 'phases'"
                >
                  <Icon :name="item.icon" :size="25" />
                  <h3>{{ name }}</h3>
                  <p>{{ item.title }}</p>
                </button></template
              >
            </div>
            <div class="insights-note">
              Your phases and fertile window are estimates, not confirmed
              ovulation. Predictions shouldn’t be used as contraception.
            </div>
          </div>
          <div class="card insights-detail">
            <h2>The patterns you’re noticing</h2>
            <div v-if="mostLogged.length" class="symptom-bars">
              <div
                v-for="[name, count] in mostLogged"
                :key="name"
                class="symptom-row"
              >
                <span>{{ name }}</span>
                <div>
                  <i
                    :style="{
                      width: `${(count / completedEntries.length) * 100}%`,
                    }"
                  ></i>
                </div>
                <strong>{{ count }} {{ count === 1 ? "day" : "days" }}</strong>
              </div>
            </div>
            <p v-else>
              Log symptoms during your daily check-in. Over time, your most
              frequent symptoms will appear here.
            </p>
            <button class="button button-dark mt-5" @click="openLog()">
              Add a check-in<Icon name="Plus" :size="17" />
            </button></div
        ></template>
        <template v-if="activePage === 'My journal'"
          ><div v-if="!journalEntries.length" class="card empty-state">
            <span class="empty-icon"><Icon name="BookOpen" :size="35" /></span>
            <h2>Your story starts with a little check-in.</h2>
            <p>
              Keep track of your mood, symptoms, and the things on your mind.<br />This
              space is yours.
            </p>
            <button class="button button-dark" @click="openLog()">
              <Icon name="Plus" :size="17" /> Write your first entry
            </button>
          </div>
          <div v-else class="journal-list">
            <button
              v-for="[date, log] in journalEntries"
              :key="date"
              class="card journal-entry"
              @click="openLog(fromKey(date))"
            >
              <div class="journal-date">
                <strong>{{ fromKey(date).getDate() }}</strong
                ><span>{{
                  fromKey(date).toLocaleDateString("en-US", { month: "short" })
                }}</span>
                <small>{{ fromKey(date).getFullYear() }}</small>
              </div>
              <div class="journal-content">
                <h3>
                  {{ log.mood || "A moment for me" }}
                  <span v-if="date > dateKey(today)">Planned note</span>
                  <span v-if="periodEndDates.has(date)">Period ended</span>
                  <span v-else-if="log.flowRecorded && log.flow === 'None'"
                    >No bleeding</span
                  >
                  <span v-if="log.flow !== 'None'">{{ log.flow }} flow</span>
                </h3>
                <p>{{ log.notes || "A little check-in with myself." }}</p>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="symptom in log.symptoms"
                    :key="symptom"
                    class="tag"
                    >{{ symptom }}</span
                  >
                </div>
              </div>
              <Icon name="ArrowUpRight" :size="18" />
            </button></div
        ></template>
        <template v-if="activePage === 'Partner space'"
          ><div class="demo-notice sharing-demo">
            <strong>Partner preview · saved in this browser only</strong>
            <p>
              Codes work here for trying the experience. They don’t connect
              another device or send your details to anyone.
            </p>
          </div>
          <div class="sharing-grid">
            <section class="card sharing-card">
              <span class="sharing-icon"><Icon name="Users" :size="28" /></span>
              <h2>Let your person in.</h2>
              <p>
                Choose the details you’d like to share. A little context can
                make care feel more personal.
              </p>
              <div class="share-options">
                <label
                  v-for="option in [
                    {
                      key: 'cycle',
                      title: 'Cycle & period dates',
                      text: 'Your estimated phase and next period',
                    },
                    {
                      key: 'mood',
                      title: 'Today’s mood',
                      text: 'How you’re feeling, in your own words',
                    },
                    {
                      key: 'symptoms',
                      title: 'Today’s symptoms',
                      text: 'A little context for a little extra care',
                    },
                  ]"
                  :key="option.key"
                  class="share-option"
                  ><span
                    ><strong>{{ option.title }}</strong
                    ><small>{{ option.text }}</small></span
                  ><input
                    type="checkbox"
                    v-model="state.sharing[option.key]"
                    class="toggle"
                /></label>
              </div>
              <p class="private-note">
                <Icon name="LockKeyhole" :size="14" /> Your journal notes always
                stay private.
              </p>
              <div v-if="state.sharing.code" class="share-code">
                <span>YOUR PARTNER CODE</span>
                <div>
                  <strong>{{ state.sharing.code }}</strong
                  ><button
                    class="icon-button"
                    aria-label="Copy partner code"
                    @click="copyCode"
                  >
                    <Icon name="Copy" :size="19" />
                  </button>
                </div>
              </div>
              <button
                v-else
                class="button button-dark w-full"
                :disabled="
                  !state.sharing.cycle &&
                  !state.sharing.mood &&
                  !state.sharing.symptoms
                "
                @click="generateCode"
              >
                <Icon name="Link" :size="17" /> Create a demo code
              </button>
              <p
                v-if="
                  !state.sharing.cycle &&
                  !state.sharing.mood &&
                  !state.sharing.symptoms
                "
                class="form-hint"
              >
                Select at least one detail to include in the preview.
              </p>
              <div v-if="state.sharing.code" class="flex flex-wrap gap-3 mt-4">
                <button class="button button-dark" @click="previewPartner">
                  Try your partner’s view
                  <Icon name="ArrowUpRight" :size="17" /></button
                ><button
                  class="small-text-button"
                  @click="
                    state.sharing.code = '';
                    notify(
                      'Sharing stopped. Your old code is no longer active.',
                    );
                  "
                >
                  Stop sharing
                </button>
              </div>
            </section>
            <div>
              <section class="partner-card partner-explainer">
                <div class="partner-art">
                  <span class="partner-circle circle-one"
                    ><Icon name="Heart" :size="30" /></span
                  ><span class="partner-circle circle-two"
                    ><Icon name="Sprout" :size="30"
                  /></span>
                </div>
                <h2>Care looks good on you two.</h2>
                <p>
                  Sometimes support is a cup of tea.<br />Sometimes it’s just
                  understanding.
                </p>
                <ul>
                  <li>
                    <Icon name="Check" :size="16" /> Choose what you share
                  </li>
                  <li>
                    <Icon name="Check" :size="16" /> Change your mind anytime
                  </li>
                  <li>
                    <Icon name="Check" :size="16" /> Keep your personal notes to
                    yourself
                  </li>
                </ul>
              </section>
              <button class="card redeem-card" @click="previewPartner">
                <Icon name="Link" /><span
                  ><strong>Have a partner code?</strong
                  ><small>Try the local partner preview</small></span
                ><Icon name="ArrowRight" :size="18" />
              </button>
            </div></div
        ></template>
        <footer class="page-footer">
          <span
            ><Icon name="Sprout" :size="15" /> Made for your rhythm. Every
            version of you.</span
          ><button @click="modal = 'about'">
            A note about your data <Icon name="ArrowUpRight" :size="12" />
          </button>
        </footer>
      </div>
    </main>
    <Transition name="toast"
      ><div v-if="toast" class="toast-message" role="status">
        <Icon name="Check" :size="18" />{{ toast }}
      </div></Transition
    >
    <Teleport to="body"
      ><div v-if="modal" class="modal-backdrop" @click.self="requestClose()">
        <section
          ref="modalElement"
          class="modal-card"
          :class="{ 'wide-modal': modal === 'phases' }"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          tabindex="-1"
          @keydown="modalKeydown"
        >
          <div v-if="closePrompt" class="close-prompt" role="alert">
            <strong>{{
              closePrompt === "delete"
                ? "Delete this check-in?"
                : "Discard your unsaved changes?"
            }}</strong>
            <p>
              {{
                closePrompt === "delete"
                  ? "This removes the entry and any period start recorded for this date. This can’t be undone."
                  : "Your changes haven’t been saved. Keep editing to finish your check-in or cycle settings."
              }}
            </p>
            <div class="dialog-actions">
              <button class="button button-dark" @click="keepEditing">
                Keep editing
              </button>
              <button
                class="button button-outline danger-action"
                @click="
                  closePrompt === 'delete' ? deleteLog() : confirmDiscard()
                "
              >
                {{
                  closePrompt === "delete"
                    ? "Delete check-in"
                    : "Discard changes"
                }}
              </button>
            </div>
          </div>
          <div :inert="closePrompt ? true : undefined">
            <button
              class="modal-close icon-button"
              aria-label="Close dialog"
              @click="requestClose()"
            >
              <Icon name="X" />
            </button>
            <form v-if="modal === 'log'" @submit.prevent="saveLog">
              <span class="eyebrow">A MOMENT FOR YOU</span>
              <h2 id="modal-title">
                {{
                  logDate > dateKey(today)
                    ? "Plan a little note."
                    : "How are you feeling?"
                }}
              </h2>
              <p>
                {{
                  fromKey(logDate).toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })
                }}
              </p>
              <p v-if="logDate > dateKey(today)" class="future-note">
                This is a future date. You can plan a note; log symptoms after
                they happen.
              </p>
              <fieldset :disabled="logDate > dateKey(today)">
                <legend>My mood</legend>
                <div class="choice-row">
                  <button
                    v-for="mood in moods"
                    :key="mood.name"
                    type="button"
                    class="choice"
                    :class="{ chosen: draft.mood === mood.name }"
                    :aria-pressed="draft.mood === mood.name"
                    @click="
                      draft.mood = draft.mood === mood.name ? '' : mood.name
                    "
                  >
                    {{ mood.name }}
                  </button>
                </div>
              </fieldset>
              <label
                v-if="showPeriodEnd"
                class="period-start-option period-end-option"
                ><input
                  type="checkbox"
                  :checked="draft.periodEnd"
                  @change="togglePeriodEnd"
                /><span
                  >My period ended<small
                    >No bleeding on this date. Stops the remaining expected
                    days.</small
                  ></span
                ></label
              >
              <label v-else-if="showPeriodStart" class="period-start-option"
                ><input type="checkbox" v-model="draft.periodStart" /><span
                  >My period started this day<small
                    >Sets this date as the start of a cycle.</small
                  ></span
                ></label
              >
              <fieldset :disabled="logDate > dateKey(today)">
                <legend>Period flow</legend>
                <div class="choice-row">
                  <button
                    v-for="flow in [
                      'None',
                      'Spotting',
                      'Light',
                      'Medium',
                      'Heavy',
                    ]"
                    :key="flow"
                    type="button"
                    class="choice"
                    :class="{
                      chosen: draft.flowRecorded && draft.flow === flow,
                    }"
                    :aria-pressed="draft.flowRecorded && draft.flow === flow"
                    @click="selectFlow(flow)"
                  >
                    {{ flow }}
                  </button>
                </div>
              </fieldset>
              <fieldset :disabled="logDate > dateKey(today)">
                <legend>What I’m noticing</legend>
                <div class="choice-row">
                  <button
                    v-for="symptom in symptoms"
                    :key="symptom"
                    type="button"
                    class="choice"
                    :class="{ chosen: draft.symptoms.includes(symptom) }"
                    :aria-pressed="draft.symptoms.includes(symptom)"
                    @click="toggleSymptom(symptom)"
                  >
                    {{ symptom }}
                  </button>
                </div>
              </fieldset>
              <p
                v-if="
                  draft.flowRecorded &&
                  draft.flow === 'None' &&
                  logDate <= dateKey(today)
                "
                class="form-hint"
                role="status"
              >
                {{
                  draft.periodStart
                    ? "This date is still marked as a period start. Uncheck it above to remove that start."
                    : "Saving None records no bleeding on this date and stops any remaining expected days for this period."
                }}
              </p>
              <label class="field-label" for="journal-note"
                >A little note <span>(just for you)</span></label
              ><textarea
                id="journal-note"
                v-model="draft.notes"
                rows="3"
                placeholder="What’s on your mind?"
                maxlength="3000"
              ></textarea>
              <p class="form-hint">
                Need to correct a period start date? Update it in
                <button type="button" @click="openSettings">
                  cycle settings</button
                >.
              </p>
              <p v-if="!canSaveLog" class="form-hint">
                {{
                  logDate > dateKey(today)
                    ? "Add a note to save your plan."
                    : "Choose a mood, flow or symptom, or add a note to save."
                }}
              </p>
              <button
                type="submit"
                class="button button-dark w-full mt-5"
                :disabled="!canSaveLog"
              >
                <Icon name="Check" :size="17" />
                {{
                  logDate > dateKey(today)
                    ? "Save planned note"
                    : "Save my check-in"
                }}
              </button>
              <div class="dialog-actions">
                <button
                  type="button"
                  class="small-text-button"
                  @click="requestClose()"
                >
                  Cancel
                </button>
                <button
                  v-if="state.logs[logDate]"
                  type="button"
                  class="small-text-button danger-action"
                  @click="showPrompt('delete')"
                >
                  Delete check-in
                </button>
              </div>
            </form>
            <form
              v-else-if="modal === 'settings'"
              @submit.prevent="saveSettings"
            >
              <span class="eyebrow">YOUR OWN RHYTHM</span>
              <h2 id="modal-title">Make this space yours.</h2>
              <p>A few dates help us get to know your cycle.</p>
              <div v-if="state.profile.demo" class="demo-notice">
                You’re exploring a sample cycle. Add your dates to personalize
                your estimates.
              </div>
              <label class="field-label" for="last-period"
                >First day of your last period</label
              ><input
                id="last-period"
                v-model="settings.lastPeriod"
                type="date"
                :max="dateKey(today)"
                required
              /><label class="field-label" for="cycle-length"
                >Usual cycle length (days)</label
              ><input
                id="cycle-length"
                v-model.number="settings.cycleLength"
                type="number"
                min="21"
                max="45"
                aria-describedby="cycle-length-help"
                required
              />
              <p id="cycle-length-help" class="form-hint">
                From the first day of one period to the first day of the next.
                Supported range: 21–45 days.
              </p>
              <label class="field-label" for="period-length"
                >Usual period length (days)</label
              ><input
                id="period-length"
                v-model.number="settings.periodLength"
                type="number"
                min="2"
                max="10"
                aria-describedby="period-length-help"
                required
              />
              <p id="period-length-help" class="form-hint">
                How many days you usually bleed. Supported range: 2–10 days.
              </p>
              <p class="form-hint">
                Cycles vary. These estimates may be less useful with irregular
                cycles or hormonal contraception. They aren’t birth control.
              </p>
              <button class="button button-dark w-full mt-5" type="submit">
                Save cycle details <Icon name="Check" :size="17" />
              </button>
              <button
                type="button"
                class="small-text-button dialog-cancel"
                @click="requestClose()"
              >
                Cancel
              </button>
            </form>
            <template v-else-if="modal === 'phases'"
              ><span class="eyebrow">GET TO KNOW YOU</span>
              <h2 id="modal-title">Your cycle has seasons.</h2>
              <p>
                Your experience is personal. Here’s a gentle guide to what
                happens in your body.
              </p>
              <div class="phase-explanations">
                <div>
                  <Icon name="Moon" />
                  <h3>Menstrual</h3>
                  <p>
                    Your period starts a new cycle. The lining of your uterus
                    sheds; bleeding often lasts 2–7 days.
                  </p>
                </div>
                <div>
                  <Icon name="Sprout" />
                  <h3>Follicular</h3>
                  <p>
                    This begins with your period. An egg develops in the ovary
                    and estrogen rises ahead of ovulation.
                  </p>
                </div>
                <div>
                  <Icon name="Sun" />
                  <h3>Ovulation</h3>
                  <p>
                    An ovary releases an egg. The timing varies, so a calendar
                    can estimate but can’t confirm it.
                  </p>
                </div>
                <div>
                  <Icon name="Leaf" />
                  <h3>Luteal</h3>
                  <p>
                    After ovulation, progesterone rises. If pregnancy doesn’t
                    occur, hormone levels fall and a new period begins.
                  </p>
                </div>
              </div>
              <p class="form-hint">
                Energy and mood don’t follow a fixed schedule. Listen to your
                own experience. Calendar predictions should not be used as
                contraception.
              </p>
              <a
                class="source-link"
                href="https://www.nhs.uk/conditions/periods/fertility-in-the-menstrual-cycle/"
                target="_blank"
                rel="noopener noreferrer"
                >Read more from the NHS
                <Icon name="ArrowUpRight" :size="14" /></a
            ></template>
            <template v-else-if="modal === 'article'"
              ><div class="modal-article-art" :class="selectedArticle.color">
                <BotanicalArt :variant="selectedArticle.art" />
              </div>
              <span class="eyebrow">{{ selectedArticle.tag }}</span>
              <h2 id="modal-title">{{ selectedArticle.title }}</h2>
              <p class="article-body">{{ selectedArticle.body }}</p>
              <a
                class="source-link"
                :href="selectedArticle.source"
                target="_blank"
                rel="noopener noreferrer"
                >{{ selectedArticle.sourceName }}
                <Icon name="ArrowUpRight" :size="14" /></a
            ></template>
            <template v-else-if="modal === 'library'"
              ><span class="eyebrow">THE LITTLE THINGS</span>
              <h2 id="modal-title">A softer kind of self-care.</h2>
              <p>A few gentle reads, whenever you need them.</p>
              <button
                v-for="article in articles"
                :key="article.title"
                class="library-item"
                @click="openArticle(article)"
              >
                <div class="library-art" :class="article.color">
                  <BotanicalArt :variant="article.art" />
                </div>
                <div>
                  <h3>{{ article.title }}</h3>
                  <p>{{ article.time }}</p>
                </div>
                <Icon name="ArrowUpRight" :size="18" /></button
            ></template>
            <form v-else-if="modal === 'redeem'" @submit.prevent="redeemCode">
              <span class="eyebrow">A LITTLE CLOSER</span>
              <h2 id="modal-title">Welcome to their rhythm.</h2>
              <p>
                Enter the code created in this browser to try the partner
                experience.
              </p>
              <label class="field-label" for="partner-code">Partner code</label
              ><input
                id="partner-code"
                v-model="enteredCode"
                @input="codeError = ''"
                placeholder="PT-XXXXXX"
                autocomplete="off"
                autocapitalize="characters"
                :spellcheck="false"
                required
                :aria-invalid="!!codeError"
                aria-describedby="code-error"
              />
              <p
                id="code-error"
                v-if="codeError"
                class="error-text"
                role="alert"
              >
                {{ codeError }}
              </p>
              <button class="button button-dark w-full mt-5">
                Open partner preview<Icon name="ArrowRight" :size="17" />
              </button>
              <p class="form-hint">
                Frontend demo: this code doesn’t connect different devices.
              </p>
            </form>
            <template v-else-if="modal === 'partner'"
              ><span class="eyebrow">PARTNER PREVIEW</span>
              <h2 id="modal-title">A little understanding.</h2>
              <p>Here’s what your person has chosen to share.</p>
              <div v-if="state.sharing.cycle" class="partner-detail">
                <Icon :name="currentPhaseCopy.icon" />
                <div>
                  <span>Estimated phase</span>
                  <h3>
                    {{
                      phase === "Unconfirmed"
                        ? "Awaiting a new period date"
                        : phase + " phase"
                    }}
                  </h3>
                  <p>
                    Next period estimated {{ shortDate(nextPeriod)
                    }}{{ state.profile.demo ? " · Sample cycle" : "" }}
                  </p>
                </div>
              </div>
              <div v-if="state.sharing.mood" class="partner-detail">
                <Icon name="Smile" />
                <div>
                  <span>Today’s mood</span>
                  <h3>{{ todayLog?.mood || "No mood shared yet" }}</h3>
                </div>
              </div>
              <div v-if="state.sharing.symptoms" class="partner-detail">
                <Icon name="Heart" />
                <div>
                  <span>Today’s symptoms</span>
                  <h3>
                    {{
                      todayLog?.symptoms?.length
                        ? todayLog.symptoms.join(", ")
                        : "No symptoms shared today"
                    }}
                  </h3>
                </div>
              </div>
              <p
                v-if="
                  !state.sharing.cycle &&
                  !state.sharing.mood &&
                  !state.sharing.symptoms
                "
              >
                No details are being shared right now.
              </p>
              <div class="demo-notice">
                <strong>A little way to show up</strong>
                <p>
                  Ask “What would feel supportive today?” Their answer matters
                  more than any prediction.
                </p>
              </div></template
            >
            <template v-else-if="modal === 'about'"
              ><span class="eyebrow">A SPACE YOU CAN UNDERSTAND</span>
              <h2 id="modal-title">Your data, simply.</h2>
              <p>
                Your cycle settings, check-ins, and demo sharing preferences are
                stored in this browser’s local storage. They aren’t sent to a
                server.
              </p>
              <p class="mt-4">
                This prototype has no account or authentication. Someone with
                access to this browser can see its data. Clearing browser
                storage removes your entries. Partner codes only demonstrate the
                flow in this browser.
              </p>
              <p class="mt-4">
                Cycle phases and dates are estimates for awareness, not medical
                advice or contraception. If symptoms are severe or unusual for
                you, speak with a healthcare professional.
              </p>
              <a
                class="source-link"
                href="https://www.acog.org/womens-health/faqs/Premenstrual-Syndrome"
                target="_blank"
                rel="noopener noreferrer"
                >Why keep a symptom diary? · ACOG
                <Icon name="ArrowUpRight" :size="14" /></a
            ></template>
          </div>
        </section></div
    ></Teleport>
  </div>
</template>
