import { computed, readonly, ref } from "vue";
import {
  DEFAULT_THEME_ID,
  THEME_STORAGE_KEY,
  findTheme,
  themes,
} from "../lib/themes.js";

const themeId = ref(DEFAULT_THEME_ID);
const storageError = ref(false);
const currentTheme = computed(() => findTheme(themeId.value));
let initialized = false;

function applyTheme() {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = themeId.value;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", currentTheme.value.browserColor);
}

// Called before mounting so a saved preference is applied on the first render.
export function initializeTheme() {
  if (initialized) return;
  initialized = true;
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    themeId.value = findTheme(saved)?.id ?? DEFAULT_THEME_ID;
  } catch {
    // Browsers can disable local storage; the theme still works for this visit.
    themeId.value = DEFAULT_THEME_ID;
  }
  applyTheme();
}

function setTheme(id) {
  if (!findTheme(id)) return false;
  themeId.value = id;
  applyTheme();
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id);
    storageError.value = false;
  } catch {
    storageError.value = true;
  }
  return true;
}

export function useTheme() {
  initializeTheme();
  return {
    themes,
    themeId: readonly(themeId),
    currentTheme,
    storageError: readonly(storageError),
    setTheme,
  };
}
