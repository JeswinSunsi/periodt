import test from "node:test";
import assert from "node:assert/strict";
import { createMemoryHistory } from "vue-router";
import { createAppRouter } from "../src/router/index.js";

function testRouter() {
  const router = createAppRouter(createMemoryHistory());
  // Stub the page component to exercise routing without a browser.
  const page = { render: () => null };
  for (const record of router.getRoutes()) {
    if (record.components) record.components.default = page;
  }
  return router;
}

test("direct page URLs and named navigation resolve to the same clean paths", async () => {
  const pages = [
    ["/overview", "Overview"],
    ["/cycle", "My cycle"],
    ["/insights", "Cycle insights"],
    ["/journal", "My journal"],
    ["/partner", "Partner space"],
  ];
  for (const [path, name] of pages) {
    const router = testRouter();
    await router.push(path);
    assert.equal(router.currentRoute.value.name, name);
    assert.equal(router.currentRoute.value.hash, "");
    await router.push("/unrecognized");
    await router.push({ name });
    assert.equal(router.currentRoute.value.fullPath, path);
  }
});

test("home, removed calendar, and unknown paths redirect to Overview", async () => {
  for (const path of ["/", "/calendar", "/missing/page"]) {
    const router = testRouter();
    await router.push(path);
    assert.equal(router.currentRoute.value.fullPath, "/overview");
    assert.equal(router.currentRoute.value.name, "Overview");
  }
});

test("existing hash bookmarks migrate to clean paths and preserve query parameters", async () => {
  for (const path of [
    "overview",
    "cycle",
    "insights",
    "journal",
    "partner",
    "calendar",
  ]) {
    const router = testRouter();
    await router.push(`/?source=bookmark#/${path}`);
    const expected = path === "calendar" ? "overview" : path;
    assert.equal(
      router.currentRoute.value.fullPath,
      `/${expected}?source=bookmark`,
    );
    assert.equal(router.currentRoute.value.hash, "");
  }
});

test("ordinary content anchors are preserved", async () => {
  const router = testRouter();
  await router.push("/journal#main-content");
  assert.equal(router.currentRoute.value.name, "My journal");
  assert.equal(router.currentRoute.value.hash, "#main-content");
});

test("back and forward restore the routed page", async () => {
  const router = testRouter();
  await router.push("/overview");
  await router.push({ name: "My cycle" });
  await router.push({ name: "My journal" });

  async function travel(action) {
    const finished = new Promise((resolve) => {
      const stop = router.afterEach(() => {
        stop();
        resolve();
      });
    });
    action();
    await finished;
  }

  await travel(() => router.back());
  assert.equal(router.currentRoute.value.name, "My cycle");
  await travel(() => router.back());
  assert.equal(router.currentRoute.value.name, "Overview");
  await travel(() => router.forward());
  assert.equal(router.currentRoute.value.name, "My cycle");
  assert.equal(router.currentRoute.value.fullPath, "/cycle");
});
