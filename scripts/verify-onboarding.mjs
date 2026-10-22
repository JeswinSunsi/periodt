// Isolated synthetic data. Optional argument: bundled Playwright index.mjs.
import { mkdir, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve, sep } from "node:path";
import assert from "node:assert/strict";

const { chromium } = await import(
  process.argv[2] ? pathToFileURL(process.argv[2]).href : "playwright"
);
const browser = await chromium.launch({
  headless: true,
  ...(process.env.UX_BROWSER_PATH
    ? { executablePath: process.env.UX_BROWSER_PATH }
    : { channel: process.env.UX_BROWSER || "msedge" }),
});
const offline = process.env.UX_OFFLINE === "1";
const base = offline
  ? "http://periodt.test/"
  : process.env.UX_URL || "http://127.0.0.1:5174/";
const errors = [];
await mkdir("ux.local", { recursive: true });

async function routeOffline(context) {
  if (!offline) return;
  const root = resolve("dist");
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(base).origin) return route.abort();
    const path = resolve(
      root,
      `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`,
    );
    if (!path.startsWith(`${root}${sep}`)) return route.abort();
    try {
      await route.fulfill({
        body: await readFile(path),
        contentType: path.endsWith(".js")
          ? "text/javascript"
          : path.endsWith(".css")
            ? "text/css"
            : path.endsWith(".svg")
              ? "image/svg+xml"
              : "text/html",
      });
    } catch {
      await route.abort();
    }
  });
}

async function newPage(width = 390, height = 667, options = {}) {
  const context = await browser.newContext({
    reducedMotion: options.motion || "reduce",
    viewport: { width, height },
  });
  await routeOffline(context);
  if (options.saved)
    await context.addInitScript((saved) => {
      if (!localStorage.getItem("periodt-v1"))
        localStorage.setItem("periodt-v1", JSON.stringify(saved));
    }, options.saved);
  const page = await context.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${base}${options.hash || ""}`);
  await page
    .locator(options.personalized ? ".page-heading h1" : "#onboarding-title")
    .waitFor();
  return { page, context };
}
async function dateBefore(page, days = 9) {
  return page.evaluate((offset) => {
    const day = new Date();
    day.setDate(day.getDate() - offset);
    return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
  }, days);
}
async function checkFit(page) {
  const metrics = await page.evaluate(() => {
    const visible = (el) =>
      el.getClientRects().length &&
      getComputedStyle(el).visibility !== "hidden";
    const controls = [
      ...document.querySelectorAll(
        ".onboarding-shell button, .onboarding-shell input",
      ),
    ].filter(visible);
    const content = [
      ...document.querySelectorAll(
        ".onboarding-card h1, .onboarding-card p, .onboarding-card label, .onboarding-card input, .onboarding-card dd, .onboarding-shell button",
      ),
    ].filter(visible);
    return {
      horizontal: document.documentElement.scrollWidth > innerWidth + 1,
      vertical: document.documentElement.scrollHeight > innerHeight + 1,
      smallControls: controls
        .filter((el) => el.offsetHeight < 44 || el.offsetWidth < 24)
        .map((el) => el.id || el.textContent.trim()),
      offscreen: content
        .filter((el) => {
          const box = el.getBoundingClientRect();
          return (
            box.bottom > innerHeight + 1 ||
            box.top < -1 ||
            box.right > innerWidth + 1 ||
            box.left < -1
          );
        })
        .map((el) => el.id || el.textContent.trim()),
      internalScroll: [
        ".onboarding-card",
        ".onboarding-step-content",
        ".onboarding-card form",
      ].filter((selector) => {
        const el = document.querySelector(selector);
        return el && el.scrollHeight > el.clientHeight + 1;
      }),
    };
  });
  if (
    metrics.horizontal ||
    metrics.vertical ||
    metrics.offscreen.length ||
    metrics.internalScroll.length
  )
    await page.screenshot({
      path: `ux.local/onboarding-fit-failure-${page.viewportSize().width}x${page.viewportSize().height}.png`,
    });
  assert.deepEqual(
    metrics,
    {
      horizontal: false,
      vertical: false,
      smallControls: [],
      offscreen: [],
      internalScroll: [],
    },
    `Everything must fit ${JSON.stringify(page.viewportSize())}`,
  );
  await page.evaluate(() => window.scrollTo(0, 9999));
  assert.equal(
    await page.evaluate(() => window.scrollY),
    0,
    "The page cannot scroll",
  );
}
async function checkScreen(page, step, theme) {
  await page.evaluate(() => document.fonts.ready);
  assert.equal(
    await page.title(),
    `Step ${step + 1} of 4: ${["Welcome", "Your dates", "Your rhythm", "Your space"][step]} — periodt.`,
  );
  assert.equal(await page.locator('[aria-current="step"]').count(), 1);
  assert.equal(
    await page
      .locator("#onboarding-title")
      .evaluate((el) => el === document.activeElement),
    true,
  );
  assert.doesNotMatch(
    await page.locator(".onboarding-shell").innerText(),
    /sample|not sure|yesterday|today/i,
  );
  assert.equal(await page.getByRole("checkbox").count(), 0);
  await checkFit(page);
  const { width, height } = page.viewportSize();
  if (
    (width === 1440 && height === 900) ||
    (width === 390 && height === 667) ||
    (width === 320 && height === 568) ||
    (width === 844 && height === 390)
  )
    await page.screenshot({
      path: `ux.local/onboarding-${step}-${theme}-${width}x${height}.png`,
    });
}
async function reachReview(page) {
  await page.getByRole("button", { name: "Let’s begin" }).click();
  const start = await dateBefore(page);
  await page.getByLabel("First day of your last period").fill(start);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  return start;
}

try {
  const sizes = [
    [1440, 900],
    [1366, 768],
    [1024, 600],
    [768, 700],
    [390, 844],
    [390, 667],
    [375, 667],
    [360, 640],
    [320, 568],
    [320, 480],
    [844, 390],
    [667, 375],
    [640, 400],
  ];
  const selectedSizes = process.env.UX_VIEWPORT
    ? [process.env.UX_VIEWPORT.split("x").map(Number)]
    : sizes;
  for (const [width, height] of selectedSizes) {
    for (const theme of ["sage", "pink"]) {
      const { page, context } = await newPage(width, height);
      if (theme === "pink") {
        await page
          .getByRole("button", { name: /Switch to Pink theme/ })
          .click();
        await page.locator("#onboarding-title").focus();
      }
      await checkScreen(page, 0, theme);
      await page.getByRole("button", { name: "Let’s begin" }).click();
      await checkScreen(page, 1, theme);
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByRole("alert").waitFor();
      await checkFit(page);
      assert.equal(
        await page
          .locator("#onboarding-last-period")
          .evaluate((el) => el === document.activeElement),
        true,
      );
      const start = await dateBefore(page);
      await page.getByLabel("First day of your last period").fill(start);
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await checkScreen(page, 2, theme);
      // Error messages must also fit the shortest screen, with actions visible.
      await page.getByLabel("Cycle length", { exact: true }).fill("20.5");
      await page.getByLabel("Period length", { exact: true }).fill("11");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      assert.equal(await page.getByRole("alert").count(), 2);
      await checkFit(page);
      await page.getByLabel("Cycle length", { exact: true }).fill("28");
      await page.getByRole("button", { name: "Increase cycle length" }).click();
      await page.getByLabel("Period length", { exact: true }).fill("4");
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await checkScreen(page, 3, theme);
      assert.equal(await page.locator(".app-shell").count(), 0);
      assert.equal(
        await page.evaluate(() => localStorage.getItem("periodt-v1")),
        null,
      );
      await page
        .getByRole("button", { name: "Edit cycle length", exact: true })
        .click();
      assert.equal(
        await page.getByLabel("Cycle length", { exact: true }).inputValue(),
        "29",
      );
      await page.getByRole("button", { name: "Continue", exact: true }).click();
      await page.getByRole("button", { name: "Open my space" }).click();
      await page.locator(".page-heading h1").waitFor();
      const saved = await page.evaluate(() =>
        JSON.parse(localStorage.getItem("periodt-v1")),
      );
      assert.deepEqual(saved.profile, {
        lastPeriod: start,
        cycleLength: 29,
        periodLength: 4,
        demo: false,
      });
      assert.equal(saved.onboarding.status, "completed");
      assert.deepEqual(saved.logs, {});
      await page.reload();
      await page.locator(".page-heading h1").waitFor();
      assert.equal(await page.locator(".onboarding-shell").count(), 0);
      await context.close();
    }
  }

  // Animated current circle and checkmark, with a static reduced-motion state.
  for (const motion of ["no-preference", "reduce"]) {
    const { page, context } = await newPage(390, 667, { motion });
    const animation = await page
      .locator(".is-current .onboarding-step-number")
      .evaluate((el) => getComputedStyle(el, "::after").animationName);
    assert.equal(
      animation,
      motion === "reduce" ? "none" : "onboarding-step-pulse",
    );
    await page.getByRole("button", { name: "Let’s begin" }).click();
    await page.locator(".onboarding-step-check path").first().waitFor();
    const tickAnimation = await page
      .locator(".onboarding-step-check path")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName);
    assert.equal(
      tickAnimation,
      motion === "reduce" ? "none" : "onboarding-check-draw",
    );
    await context.close();
  }

  // Final confirmation saves immediately, then the animated handoff opens the app.
  for (const [width, height, theme] of [
    [390, 667, "sage"],
    [1440, 900, "pink"],
  ]) {
    const { page, context } = await newPage(width, height, {
      motion: "no-preference",
    });
    if (theme === "pink")
      await page.getByRole("button", { name: /Switch to Pink theme/ }).click();
    await reachReview(page);
    await page.getByRole("button", { name: "Open my space" }).click();
    const handoff = page.getByRole("status", { name: "Opening your space" });
    await handoff.waitFor();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("periodt-v1")).onboarding.status,
      ),
      "completed",
    );
    assert.equal(
      await page.evaluate(() => document.body.style.overflow),
      "hidden",
    );
    await handoff.evaluate((el) => {
      for (const animation of el.getAnimations({ subtree: true })) {
        animation.pause();
        animation.currentTime = 300;
      }
    });
    await page.screenshot({
      path: `ux.local/onboarding-handoff-${theme}-${width}.png`,
    });
    await handoff.evaluate((el) => {
      for (const animation of el.getAnimations({ subtree: true }))
        animation.play();
    });
    await page.waitForFunction(
      () => !document.querySelector(".onboarding-handoff"),
    );
    await page.locator(".page-heading h1").waitFor();
    assert.equal(
      await page
        .locator(".page-heading h1")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    assert.equal(await page.locator(".app-shell").getAttribute("inert"), null);
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    assert.equal(await page.locator(".onboarding-shell").count(), 0);
    await page.reload();
    await page.locator(".page-heading h1").waitFor();
    assert.equal(
      await page.locator(".onboarding-handoff").count(),
      0,
      "Returning visits do not replay entry",
    );
    await context.close();
  }
  // A motion-preference change during entry must not leave the page locked.
  {
    const { page, context } = await newPage(320, 480, {
      motion: "no-preference",
    });
    await reachReview(page);
    await page.getByRole("button", { name: "Open my space" }).click();
    await page.locator(".onboarding-handoff").waitFor();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(
      () => !document.querySelector(".onboarding-handoff"),
    );
    assert.equal(await page.evaluate(() => document.body.style.overflow), "");
    assert.equal(
      await page
        .locator(".page-heading h1")
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await context.close();
  }

  // Native data dialog stays on screen, traps focus, and restores its trigger.
  {
    const { page, context } = await newPage(320, 480);
    await page.getByRole("button", { name: "About your data" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor();
    assert.equal(
      await dialog.evaluate((el) => el.scrollHeight > el.clientHeight),
      false,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Close data information" })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press("Tab");
    assert.equal(
      await dialog.evaluate(
        (el) =>
          document.activeElement === document.body ||
          el.contains(document.activeElement),
      ),
      true,
      "Background controls stay out of the modal tab order",
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .getByRole("button", { name: "About your data" })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await checkFit(page);
    await context.close();
  }

  const legacy = {
    version: 1,
    profile: {
      lastPeriod: "2026-10-11",
      cycleLength: 30,
      periodLength: 4,
      demo: false,
    },
    logs: {
      "2026-10-12": { mood: "Good", notes: "Keep my journal", symptoms: [] },
    },
    periodHistory: [{ start: "2026-09-11", length: 4 }],
    sharing: { code: "TEST22", cycle: true, mood: true, symptoms: false },
  };
  {
    const { page, context } = await newPage(390, 667, {
      saved: legacy,
      personalized: true,
      hash: "#/journal",
    });
    await page.getByText("Keep my journal", { exact: true }).waitFor();
    assert.equal(await page.locator(".onboarding-shell").count(), 0);
    assert.deepEqual(
      await page.evaluate(() => JSON.parse(localStorage.getItem("periodt-v1"))),
      legacy,
    );
    await context.close();
  }
  // Previously skipped setups now require a real date; existing entries survive.
  {
    const saved = structuredClone(legacy);
    saved.profile.demo = true;
    saved.onboarding = { status: "skipped" };
    const { page, context } = await newPage(390, 667, {
      saved,
      hash: "#/journal",
    });
    await reachReview(page);
    await page.getByRole("button", { name: "Open my space" }).focus();
    await page.keyboard.press("Enter");
    await page.getByText("Keep my journal", { exact: true }).waitFor();
    const result = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("periodt-v1")),
    );
    assert.equal(result.profile.demo, false);
    assert.deepEqual(result.logs, legacy.logs);
    await context.close();
  }
  {
    const { page, context } = await newPage();
    await reachReview(page);
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new Error("Blocked");
      };
    });
    await page.getByRole("button", { name: "Open my space" }).click();
    await page
      .getByRole("alert")
      .filter({ hasText: "couldn’t save" })
      .waitFor();
    await page.locator(".page-heading h1").waitFor();
    await context.close();
  }
  assert.deepEqual(errors, [], "No browser runtime errors");
  console.log(
    `PASS: four onboarding steps in both themes at ${selectedSizes.length} viewport sizes without page or nested scrolling, including validation errors; progress animations; final handoff, focus, and reduced motion; data dialog; required date; review/edit; persistence; legacy data; blocked storage.`,
  );
} finally {
  await browser.close();
}
