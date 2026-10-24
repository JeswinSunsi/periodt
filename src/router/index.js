import { createRouter } from "vue-router";

const App = () => import("../App.vue");
const OnboardingPage = () =>
  import("../components/onboarding/OnboardingPage.vue");

const pages = [
  { path: "/overview", name: "Overview" },
  { path: "/cycle", name: "My cycle" },
  { path: "/insights", name: "Cycle insights" },
  { path: "/journal", name: "My journal" },
  { path: "/partner", name: "Partner space" },
];

// Only same-app paths may be resumed after setup.
export function onboardingDestination(redirect) {
  return typeof redirect === "string" &&
    redirect.startsWith("/") &&
    !redirect.startsWith("//")
    ? redirect
    : { name: "Overview" };
}

export function createAppRouter(history, { needsOnboarding }) {
  const router = createRouter({
    history,
    routes: [
      { path: "/", redirect: { name: "Overview" } },
      { path: "/onboarding", name: "Onboarding", component: OnboardingPage },
      ...pages.map((page) => ({ ...page, component: App })),
      { path: "/calendar", redirect: { name: "Overview" } },
      { path: "/:pathMatch(.*)*", redirect: { name: "Overview", params: {} } },
    ],
    scrollBehavior: () => ({ left: 0, top: 0 }),
  });

  // Keep previously shared hash links working while replacing them with clean URLs.
  router.beforeEach((to) => {
    const legacyPath = to.hash.slice(1);
    if (
      pages.some((page) => page.path === legacyPath) ||
      legacyPath === "/calendar"
    )
      return { path: legacyPath, query: to.query, replace: true };
  });

  // Setup runs before any page; the requested page opens once it is complete.
  router.beforeEach((to) => {
    const onboarding = to.name === "Onboarding";
    if (needsOnboarding() && !onboarding)
      return {
        name: "Onboarding",
        query: to.name === "Overview" ? {} : { redirect: to.fullPath },
        replace: true,
      };
    if (!needsOnboarding() && onboarding)
      return onboardingDestination(to.query.redirect);
  });

  return router;
}
