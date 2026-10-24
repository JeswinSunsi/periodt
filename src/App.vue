<script setup>
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { RouterLink, RouterView, useRoute } from "vue-router";
import Icon from "./components/AppIcon.vue";
import ThemeSwitcher from "./components/ThemeSwitcher.vue";
import AppDialog from "./components/dialogs/AppDialog.vue";
import { trapFocus } from "./lib/focus.js";
import { useCycle } from "./composables/useCycle";
import { useCheckin } from "./composables/useCheckin.js";
import { useDialog } from "./composables/useDialog.js";
import { appOpening } from "./composables/useOnboarding.js";
const { storageError, today } = useCycle();
const { todayLog, openLog } = useCheckin();
const { modal, toast, openDialog, clearToast } = useDialog();
const route = useRoute();
const activePage = computed(() => route.name);
const mobileNav = ref(false);
const navigation = [
  { title: "Overview", icon: "House" },
  { title: "My cycle", icon: "Sprout" },
  { title: "Cycle insights", icon: "ChartNoAxesColumnIncreasing" },
  { title: "My journal", icon: "BookOpen" },
  { title: "Partner space", icon: "Users" },
];
const fullDate = today.toLocaleDateString("en-US", {
  weekday: "long",
  month: "long",
  day: "numeric",
});
watch(
  () => route.fullPath,
  async () => {
    mobileNav.value = false;
    await nextTick();
    document.querySelector(".page-heading h1")?.focus({ preventScroll: true });
  },
  { flush: "post" },
);
const sidebarElement = ref(null);
function syncBodyScrollLock() {
  document.body.style.overflow =
    modal.value || mobileNav.value || appOpening.value ? "hidden" : "";
}
watch([modal, appOpening], syncBodyScrollLock);
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
function navigationKeydown(event) {
  if (!mobileNav.value) return;
  if (event.key === "Escape") mobileNav.value = false;
  trapFocus(event, sidebarElement.value);
}
function openSettingsFromShell() {
  mobileNav.value = false;
  openDialog("settings");
}
onBeforeUnmount(() => {
  clearToast();
  document.body.style.overflow = "";
});
</script>

<template>
  <a
    class="skip-link"
    href="#main-content"
    :inert="modal || mobileNav || appOpening ? true : undefined"
    @click.prevent="skipToContent"
    >Skip to content</a
  >
  <div
    class="app-shell"
    :class="{ 'app-entering': appOpening }"
    :inert="modal || appOpening ? true : undefined"
  >
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
      <RouterLink
        :to="{ name: 'Overview' }"
        class="brand"
        aria-label="periodt home"
        @click="mobileNav = false"
        ><span class="brand-flower">✳</span> periodt<span class="brand-dot"
          >.</span
        ></RouterLink
      >
      <p class="brand-subtitle">IN YOUR OWN RHYTHM</p>
      <div class="nav-label">YOUR LITTLE SPACE</div>
      <nav class="space-y-2" aria-label="Main navigation">
        <RouterLink
          v-for="item in navigation"
          :key="item.title"
          :to="{ name: item.title }"
          class="nav-item"
          active-class="active"
          @click="mobileNav = false"
        >
          <Icon :name="item.icon" :size="19" /><span>{{ item.title }}</span
          ><span v-if="item.title === 'Partner space'" class="nav-heart"
            >♡</span
          >
        </RouterLink>
      </nav>
      <div class="sidebar-bottom">
        <div class="sidebar-note">
          <div class="note-flower">✳</div>
          <p>Your body.<br />Your pace.<br />Your kind of care.</p>
          <span>A little reminder, just for you.</span>
        </div>
        <button class="nav-item settings-link" @click="openSettingsFromShell">
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
        <div class="topbar-context flex items-center gap-3">
          <button
            class="icon-button mobile-menu"
            :aria-expanded="mobileNav"
            aria-controls="main-navigation"
            aria-label="Open navigation"
            @click="mobileNav = !mobileNav"
          >
            <Icon name="Menu" /></button
          ><span class="breadcrumb"
            ><span class="breadcrumb-home">My space</span>
            <span class="breadcrumb-separator">/</span>
            <b>{{ activePage }}</b></span
          >
        </div>
        <div class="topbar-actions flex items-center gap-3">
          <ThemeSwitcher />
          <span class="private-label"
            ><Icon name="LockKeyhole" :size="13" /> Just for you</span
          ><button
            class="top-avatar"
            aria-label="Open cycle settings"
            @click="openSettingsFromShell"
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
            <h1 tabindex="-1">{{ route.meta.heading }}</h1>
            <p class="page-description">{{ route.meta.description }}</p>
          </div>
          <button
            v-if="
              !todayLog &&
              activePage !== 'Partner space' &&
              activePage !== 'My cycle'
            "
            class="button button-dark"
            @click="openLog()"
          >
            <Icon name="Plus" :size="18" />
            Log my day
          </button>
        </section>
        <RouterView />
        <footer class="page-footer">
          <span
            ><Icon name="Sprout" :size="15" /> Made for your rhythm. Every
            version of you.</span
          ><button @click="openDialog('about')">
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
    <AppDialog />
  </div>
</template>

<style scoped>
.topbar {
  gap: 16px;
}
.topbar-context {
  min-width: 0;
}
.breadcrumb {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.breadcrumb .breadcrumb-home {
  padding: 0;
}
.topbar-actions {
  flex-shrink: 0;
}
@media (max-width: 1100px) {
  .topbar-actions .private-label {
    display: none;
  }
}
@media (max-width: 680px) {
  .topbar,
  .topbar-context,
  .topbar-actions {
    gap: 8px;
  }
  .breadcrumb-home,
  .breadcrumb-separator {
    display: none;
  }
}
</style>
