import test from "node:test";
import assert from "node:assert/strict";
// Load Vue before installing the minimal document fixture used by the composable.
import "vue";
import { DEFAULT_THEME_ID, THEME_STORAGE_KEY } from "../src/lib/themes.js";

let fixtureId = 0;
async function loadTheme({ saved = null, blocked = false } = {}) {
  const values = new Map(saved === null ? [] : [[THEME_STORAGE_KEY, saved]]);
  let browserColor;
  globalThis.localStorage = {
    getItem: (key) => {
      if (blocked) throw new Error("Storage unavailable");
      return values.get(key) ?? null;
    },
    setItem: (key, value) => {
      if (blocked) throw new Error("Storage unavailable");
      values.set(key, value);
    },
  };
  globalThis.document = {
    documentElement: { dataset: {} },
    querySelector: () => ({
      setAttribute: (name, value) => {
        if (name === "content") browserColor = value;
      },
    }),
  };
  const module = await import(
    `../src/composables/useTheme.js?fixture=${++fixtureId}`
  );
  return { ...module, values, browserColor: () => browserColor };
}

test("first visit uses Sage; saved Pink is applied before mounting", async () => {
  let fixture = await loadTheme();
  fixture.initializeTheme();
  assert.equal(document.documentElement.dataset.theme, DEFAULT_THEME_ID);
  assert.equal(fixture.useTheme().themeId.value, "sage");

  fixture = await loadTheme({ saved: "pink" });
  fixture.initializeTheme();
  assert.equal(document.documentElement.dataset.theme, "pink");
  assert.equal(
    fixture.browserColor(),
    fixture.useTheme().currentTheme.value.browserColor,
  );
});

test("switching updates shared state, the document, and the saved preference", async () => {
  const fixture = await loadTheme();
  const first = fixture.useTheme();
  const second = fixture.useTheme();
  assert.equal(first.setTheme("pink"), true);
  assert.equal(second.themeId.value, "pink");
  assert.equal(document.documentElement.dataset.theme, "pink");
  assert.equal(fixture.values.get(THEME_STORAGE_KEY), "pink");
  assert.equal(fixture.browserColor(), second.currentTheme.value.browserColor);
  assert.equal(first.setTheme("sage"), true);
  assert.equal(document.documentElement.dataset.theme, "sage");
  assert.equal(fixture.values.get(THEME_STORAGE_KEY), "sage");
});

test("unknown saved themes fall back safely and invalid selections are ignored", async () => {
  const fixture = await loadTheme({ saved: "removed-theme" });
  const theme = fixture.useTheme();
  assert.equal(theme.themeId.value, DEFAULT_THEME_ID);
  assert.equal(document.documentElement.dataset.theme, DEFAULT_THEME_ID);
  assert.equal(theme.setTheme("unknown"), false);
  assert.equal(theme.themeId.value, DEFAULT_THEME_ID);
  assert.equal(fixture.values.get(THEME_STORAGE_KEY), "removed-theme");
});

test("blocked storage allows switching for this visit and reports persistence failure", async () => {
  const fixture = await loadTheme({ blocked: true });
  const theme = fixture.useTheme();
  assert.equal(theme.themeId.value, "sage");
  assert.equal(theme.setTheme("pink"), true);
  assert.equal(theme.themeId.value, "pink");
  assert.equal(document.documentElement.dataset.theme, "pink");
  assert.equal(theme.storageError.value, true);

  localStorage.setItem = (key, value) => fixture.values.set(key, value);
  theme.setTheme("sage");
  assert.equal(theme.storageError.value, false);
  assert.equal(fixture.values.get(THEME_STORAGE_KEY), "sage");
});
