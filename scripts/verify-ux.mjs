// Run against a local dev server. Optional first argument: path to Playwright's index.mjs.
// Screenshots use an ignored folder and a fresh browser context with synthetic data.
import { mkdir, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";
const { chromium } = await import(
  process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright"
);
const browser = await chromium.launch({
  headless: true,
  channel: process.env.UX_BROWSER || "msedge",
});
const context = await browser.newContext({ reducedMotion: "reduce" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
const base = process.env.UX_URL || "http://127.0.0.1:5174/";
await mkdir("ux.local", { recursive: true });
const report = [];
try {
  await page.goto(base);
  await page.getByRole("button", { name: "Let’s begin" }).click();
  await page.getByLabel("First day of your last period").fill("2026-10-11");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Open my space" }).click();
  for (const width of [1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 950 });
    for (const route of [
      "overview",
      "cycle",
      "insights",
      "journal",
      "partner",
    ]) {
      await page.goto(`${base}#/${route}`);
      await page.locator(".page-heading h1").waitFor();
      await page.evaluate(() => document.fonts.ready);
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        overflowing: [...document.querySelectorAll("main *")]
          .filter((el) => el.getBoundingClientRect().right > innerWidth + 1)
          .map((el) => el.className)
          .slice(0, 12),
        smallControls: [...document.querySelectorAll("button")]
          .filter(
            (el) =>
              el.getClientRects().length &&
              getComputedStyle(el).visibility !== "hidden" &&
              !el.closest("[inert]") &&
              (el.getBoundingClientRect().height < 43 ||
                el.getBoundingClientRect().width < 24),
          )
          .map((el) => ({
            text: el.textContent.trim(),
            class: el.className,
            width: el.offsetWidth,
            height: el.offsetHeight,
          })),
        smallText: [
          ...document.querySelectorAll(
            "main p, main small, main label, main button, main span",
          ),
        ]
          .filter(
            (el) =>
              el.getClientRects().length &&
              el.textContent.trim() &&
              parseFloat(getComputedStyle(el).fontSize) < 11.5,
          )
          .map((el) => ({
            text: el.textContent.trim().slice(0, 50),
            class: el.className,
            size: getComputedStyle(el).fontSize,
          }))
          .slice(0, 20),
      }));
      report.push({ width, route, ...metrics });
      if ([1440, 390].includes(width))
        await page.screenshot({
          path: `ux.local/${route}-${width}.png`,
          fullPage: true,
        });
    }
  }
  await writeFile("ux.local/report.json", JSON.stringify(report, null, 2));
  console.log(
    JSON.stringify(
      report.filter(
        (r) => r.overflow || r.smallControls.length || r.smallText.length,
      ),
      null,
      2,
    ),
  );
  assert.equal(
    report.some((r) => r.overflow),
    false,
    "Pages must fit the viewport",
  );
  assert.equal(
    report.some((r) => r.smallControls.length),
    false,
    "Controls need usable targets",
  );
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto(`${base}#/overview`);
  const dialog = page.locator(".modal-card");
  const closeDialog = async () => {
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
  };
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  assert.equal(await page.locator("main").getAttribute("inert"), "");
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent.trim()),
    "Cycle settings",
    "Menu traps reverse tab",
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() =>
      document.activeElement.getAttribute("aria-label"),
    ),
    "Close navigation",
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await page
      .getByRole("button", { name: "Open navigation" })
      .evaluate((el) => el === document.activeElement),
    true,
  );
  await page.locator(".mood-option").filter({ hasText: "Good" }).click();
  await dialog.waitFor();
  assert.equal(
    await dialog
      .getByRole("button", { name: "Good", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await page
    .getByRole("textbox", { name: "A little note (just for you)", exact: true })
    .fill("Synthetic UX test note");
  await dialog.getByRole("button", { name: "Cramps", exact: true }).click();
  await page.screenshot({ path: "ux.local/check-in-390.png" });
  await page
    .getByRole("button", { name: "Save my check-in", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await page.reload();
  assert.equal(
    await page.locator(".mood-option.selected").innerText(),
    "Good",
    "Mood persists after reload",
  );
  await page.getByRole("button", { name: "Low", exact: true }).click();
  assert.equal(
    await dialog
      .getByRole("button", { name: "Low", exact: true })
      .getAttribute("aria-pressed"),
    "true",
    "New mood overrides existing mood",
  );
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    await page.locator(".mood-option.selected").innerText(),
    "Good",
    "Discard restores saved mood",
  );
  await page
    .getByRole("button", { name: "Open cycle settings", exact: true })
    .click();
  await page.getByLabel("Usual cycle length").fill("31");
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  assert.equal(await page.getByLabel("Usual cycle length").inputValue(), "31");
  await page
    .getByRole("button", { name: "Save cycle details", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    await page.locator(".sample-banner").count(),
    0,
    "Setup removes sample banner",
  );
  await page.goto(`${base}#/cycle`);
  await page.getByRole("button", { name: /Luteal/ }).click();
  assert.equal(
    await page
      .getByRole("button", { name: /Luteal/ })
      .getAttribute("aria-pressed"),
    "true",
  );
  const range = page.getByRole("slider");
  await range.focus();
  await page.keyboard.press("End");
  assert.equal(await range.inputValue(), "31");
  await page
    .getByRole("button", { name: "Plan a note for this day", exact: true })
    .click();
  assert.equal(
    await dialog
      .getByRole("button", { name: "Good", exact: true })
      .isDisabled(),
    true,
  );
  await page
    .getByRole("textbox", { name: "A little note (just for you)", exact: true })
    .fill("Synthetic future note");
  await page
    .getByRole("button", { name: "Save planned note", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await page.goto(`${base}#/insights`);
  assert.match(
    await page.locator(".stat-card").nth(2).innerText(),
    /1 day/,
    "Planned notes do not inflate check-in count",
  );
  await page.goto(`${base}#/journal`);
  assert.equal(await page.locator(".journal-entry").count(), 2);
  assert.equal(
    await page.getByText("Planned note", { exact: true }).count(),
    1,
  );
  await page
    .locator(".journal-entry")
    .filter({ hasText: "Synthetic UX test note" })
    .click();
  await page
    .getByRole("button", { name: "Delete check-in", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  await closeDialog();
  assert.equal(
    await page.locator(".journal-entry").count(),
    2,
    "Cancel deletion preserves entry",
  );
  await page
    .locator(".journal-entry")
    .filter({ hasText: "Synthetic UX test note" })
    .click();
  await page
    .getByRole("button", { name: "Delete check-in", exact: true })
    .click();
  await page
    .locator(".close-prompt")
    .getByRole("button", { name: "Delete check-in", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(await page.locator(".journal-entry").count(), 1);
  await page.goto(`${base}#/partner`);
  await page.getByLabel("Cycle & period dates").uncheck();
  assert.equal(
    await page.getByRole("button", { name: "Create a demo code" }).isDisabled(),
    true,
  );
  await page.getByLabel("Cycle & period dates").check();
  await page.getByRole("button", { name: "Create a demo code" }).click();
  const code = await page.locator(".share-code strong").innerText();
  await page.getByRole("button", { name: "Try your partner’s view" }).click();
  await page.getByLabel("Partner code", { exact: true }).fill("WRONG");
  await page.getByRole("button", { name: "Open partner preview" }).click();
  await page.locator("#code-error").waitFor();
  await page.getByLabel("Partner code", { exact: true }).fill(code);
  assert.equal(
    await page.locator("#code-error").count(),
    0,
    "Editing code clears stale error",
  );
  await page.getByRole("button", { name: "Open partner preview" }).click();
  await page
    .getByText("Here’s what your person has chosen to share.")
    .waitFor();
  await closeDialog();
  await page.getByRole("button", { name: "Stop sharing", exact: true }).click();
  assert.equal(await page.locator(".share-code").count(), 0);
  await page.goto(`${base}#/overview`);
  await page.getByRole("button", { name: "Browse self-care guides" }).click();
  await page.locator(".library-item").first().click();
  assert.equal(await page.locator(".article-body").count(), 1);
  await closeDialog();
  // Closing a changed check-in to switch to settings must also preserve a choice.
  await page.getByRole("button", { name: "Log my day", exact: true }).click();
  await page
    .getByRole("textbox", { name: "A little note (just for you)", exact: true })
    .fill("Unsaved transition test");
  await dialog
    .getByRole("button", { name: "cycle settings", exact: true })
    .click();
  await page.getByRole("button", { name: "Keep editing", exact: true }).click();
  assert.equal(
    await page
      .getByRole("textbox", {
        name: "A little note (just for you)",
        exact: true,
      })
      .inputValue(),
    "Unsaved transition test",
  );
  await dialog
    .getByRole("button", { name: "cycle settings", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Discard changes", exact: true })
    .click();
  await page.getByLabel("Usual cycle length").waitFor();
  await closeDialog();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.locator("main:not([inert])").waitFor();
  assert.equal(
    await page.evaluate(() => document.body.style.overflow),
    "",
    "Resizing releases menu scroll lock",
  );
  // Verify every dialog fits a narrow phone, then check keyboard wrapping.
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto(`${base}#/overview`);
  await page.getByRole("button", { name: "Log my day", exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Save my check-in", exact: true })
      .isDisabled(),
    true,
    "Empty entries cannot be saved",
  );
  const checkDialog = async (name) => {
    const size = await dialog.evaluate((el) => ({
      width: el.clientWidth,
      scroll: el.scrollWidth,
    }));
    assert.equal(size.scroll <= size.width, true, `${name} dialog fits 320px`);
    await page.screenshot({ path: `ux.local/dialog-${name}-320.png` });
  };
  await checkDialog("log");
  await page.keyboard.press("Shift+Tab");
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent.trim()),
    "Cancel",
  );
  await page.keyboard.press("Tab");
  assert.equal(
    await page.evaluate(() =>
      document.activeElement.getAttribute("aria-label"),
    ),
    "Close dialog",
  );
  await closeDialog();
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page
    .getByRole("button", { name: "Cycle settings", exact: true })
    .click();
  await checkDialog("settings");
  await closeDialog();
  assert.equal(
    await page
      .getByRole("button", { name: "Open navigation" })
      .evaluate((el) => el === document.activeElement),
    true,
    "Settings returns focus to visible menu",
  );
  await page.goto(`${base}#/insights`);
  await page.locator(".phase-item").first().click();
  await checkDialog("phases");
  await closeDialog();
  await page.goto(`${base}#/overview`);
  await page.getByRole("button", { name: "Browse self-care guides" }).click();
  await checkDialog("library");
  await page.locator(".library-item").first().click();
  await checkDialog("article");
  await closeDialog();
  await page.getByRole("button", { name: "A note about your data" }).click();
  await checkDialog("about");
  await closeDialog();
  for (const scenario of [
    { days: 0, visible: true },
    { days: 2, visible: false },
    { days: 3, visible: false, endVisible: true },
    { days: 6, visible: false, endVisible: true },
    { days: 7, visible: false, endVisible: true },
    { days: 2, demo: true, visible: true },
    { days: 14, history: true, visible: false },
    { days: 14, loggedStart: true, visible: false },
  ]) {
    const originalStart = await page.evaluate((scenario) => {
      const key = (offset) => {
        const date = new Date();
        date.setDate(date.getDate() - offset);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      };
      const lastPeriod = key(scenario.days);
      localStorage.setItem(
        "periodt-v1",
        JSON.stringify({
          version: 1,
          profile: {
            lastPeriod,
            cycleLength: 28,
            periodLength: 5,
            demo: !!scenario.demo,
          },
          periodHistory: scenario.history ? [{ start: key(2), length: 5 }] : [],
          logs: scenario.loggedStart
            ? {
                [key(2)]: {
                  periodStart: true,
                  symptoms: [],
                  flow: "None",
                  mood: "",
                  notes: "",
                },
              }
            : {},
          sharing: { code: "", cycle: true, mood: false, symptoms: false },
        }),
      );
      return lastPeriod;
    }, scenario);
    await page.reload();
    assert.equal(
      await page.locator(".sample-banner").count(),
      0,
      "Setup banner is removed",
    );
    await page.getByRole("button", { name: "Log my day", exact: true }).click();
    assert.equal(
      await page
        .locator(".period-start-option:not(.period-end-option)")
        .count(),
      scenario.visible ? 1 : 0,
      `Period checkbox: ${JSON.stringify(scenario)}`,
    );
    assert.equal(
      await page.locator(".period-end-option").count(),
      scenario.endVisible ? 1 : 0,
      `End checkbox: ${JSON.stringify(scenario)}`,
    );
    await page
      .getByRole("textbox", {
        name: "A little note (just for you)",
        exact: true,
      })
      .fill("Synthetic recent-period check");
    await page
      .getByRole("button", { name: "Save my check-in", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("periodt-v1")).profile.lastPeriod,
      ),
      originalStart,
      "Saving with a hidden checkbox preserves the recorded start",
    );
  }
  assert.deepEqual(errors, [], "No browser runtime errors");
  const seedPeriod = async (elapsed = 2) => {
    const dates = await page.evaluate((elapsed) => {
      const key = (offset) => {
        const date = new Date();
        date.setDate(date.getDate() + offset);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      };
      const dates = { start: key(-elapsed), today: key(0), future: key(1) };
      localStorage.setItem(
        "periodt-v1",
        JSON.stringify({
          version: 1,
          profile: {
            lastPeriod: dates.start,
            cycleLength: 28,
            periodLength: 5,
            demo: false,
          },
          periodHistory: [],
          logs: {},
          sharing: { code: "", cycle: true, mood: false, symptoms: false },
        }),
      );
      return dates;
    }, elapsed);
    await page.goto(`${base}#/overview`);
    await page.reload();
    return dates;
  };
  const dates = await seedPeriod();
  const dayCell = (date) => page.locator(`[data-date="${date}"]`);
  if (!(await dayCell(dates.start).count()))
    await page
      .getByRole("button", { name: "Previous month", exact: true })
      .click();
  await dayCell(dates.start).click();
  const startCheckbox = page.getByRole("checkbox", {
    name: /My period started this day/,
  });
  assert.equal(await startCheckbox.isChecked(), true);
  await startCheckbox.uncheck();
  assert.equal(
    await page
      .getByRole("button", { name: "Save my check-in", exact: true })
      .isEnabled(),
    true,
    "Settings-only starts can be unchecked without adding unrelated details",
  );
  await page
    .getByRole("button", { name: "Save my check-in", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("periodt-v1")).profile.demo,
    ),
    true,
    "Unchecking removes the only recorded start",
  );

  await seedPeriod();
  if (!(await dayCell(dates.future).count()))
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  assert.doesNotMatch(
    await dayCell(dates.future).getAttribute("class"),
    /\bperiod\b/,
    "Unlogged days never assume bleeding",
  );
  await page.screenshot({
    path: "ux.local/period-before-end.png",
    fullPage: true,
  });
  if (!(await dayCell(dates.today).count()))
    await page
      .getByRole("button", { name: "Previous month", exact: true })
      .click();
  await dayCell(dates.today).click();
  assert.equal(
    await page.locator(".period-start-option").count(),
    0,
    "Other days within seven days cannot start another period",
  );
  const noneFlow = dialog.getByRole("button", { name: "None", exact: true });
  assert.equal(
    await noneFlow.getAttribute("aria-pressed"),
    "false",
    "No flow is assumed before selection",
  );
  await noneFlow.click();
  await page
    .getByRole("button", { name: "Save my check-in", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await page.reload();
  if (!(await dayCell(dates.future).count()))
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  assert.doesNotMatch(
    await dayCell(dates.future).getAttribute("class"),
    /expected-period|\bperiod\b/,
  );
  await page.screenshot({
    path: "ux.local/period-after-end.png",
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("periodt-v1")).profile.periodLength,
    ),
    5,
    "Early end leaves the usual length intact",
  );
  await page.goto(`${base}#/journal`);
  await page.getByText("Period ended", { exact: true }).waitFor();
  await page.goto(`${base}#/overview`);
  assert.match(
    await page.locator(".living-ring-phase").innerText(),
    /Follicular/,
    "Current cycle reflects the shortened period",
  );
  await page.goto(`${base}#/overview`);
  if (!(await dayCell(dates.today).count()))
    await page
      .getByRole("button", { name: "Previous month", exact: true })
      .click();
  await dayCell(dates.today).click();
  await dialog.getByRole("button", { name: "Light", exact: true }).click();
  await page
    .getByRole("button", { name: "Save my check-in", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  if (!(await dayCell(dates.future).count()))
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  assert.doesNotMatch(
    await dayCell(dates.future).getAttribute("class"),
    /\bperiod\b/,
    "Correcting None does not assume bleeding on other days",
  );
  const fourthDay = await seedPeriod(3);
  await dayCell(fourthDay.today).click();
  const endCheckbox = page.getByRole("checkbox", { name: /^My period ended/ });
  await endCheckbox.check();
  assert.equal(
    await dialog
      .getByRole("button", { name: "None", exact: true })
      .getAttribute("aria-pressed"),
    "true",
  );
  await page.screenshot({ path: "ux.local/period-ended-checkbox.png" });
  await page
    .getByRole("button", { name: "Save my check-in", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  await page.reload();
  await dayCell(fourthDay.today).click();
  assert.equal(
    await endCheckbox.isChecked(),
    true,
    "End checkbox persists and can be corrected",
  );
  await endCheckbox.uncheck();
  assert.equal(
    await dialog
      .getByRole("button", { name: "None", exact: true })
      .getAttribute("aria-pressed"),
    "false",
    "Unchecking clears the implicit no-flow selection",
  );
  await page
    .getByRole("button", { name: "Save my check-in", exact: true })
    .click();
  await dialog.waitFor({ state: "hidden" });
  if (!(await dayCell(fourthDay.future).count()))
    await page.getByRole("button", { name: "Next month", exact: true }).click();
  assert.doesNotMatch(
    await dayCell(fourthDay.future).getAttribute("class"),
    /\bperiod\b/,
    "Unchecking an end does not assume future bleeding",
  );
  assert.deepEqual(errors, [], "No period-flow runtime errors");
  console.log("PASS: day-four end checkbox visibility, save/reload, and undo.");
  console.log(
    "PASS: start-date unchecking; explicit None; early-end persistence and correction; recorded bleeding only; journal end label; current phase.",
  );
  console.log(
    "PASS: five routes at five widths; menu focus; mood selection; save/reload; discard; settings; cycle slider; future notes; insights counts; journal deletion; partner preview/error/revocation; articles; dialog switching; resize.",
  );
} finally {
  await browser.close();
}
