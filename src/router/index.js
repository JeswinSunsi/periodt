import { createRouter } from "vue-router";

const App = () => import("../App.vue");
const OnboardingPage = () =>
  import("../components/onboarding/OnboardingPage.vue");

const pages = [
  {
    path: "/overview",
    name: "Overview",
    component: () => import("../views/OverviewView.vue"),
    meta: {
      heading: "A little more in tune.",
      description: "Every day is different. Let’s meet you where you are.",
    },
  },
  {
    path: "/cycle",
    name: "My cycle",
    component: () => import("../views/CycleView.vue"),
    meta: {
      heading: "A little closer to you.",
      description: "Understand the changes. Get curious about your own rhythm.",
    },
  },
  {
    path: "/insights",
    name: "Cycle insights",
    component: () => import("../views/InsightsView.vue"),
    meta: {
      heading: "Get to know your rhythm.",
      description: "Your body tells a story. Start listening to the patterns.",
    },
  },
  {
    path: "/journal",
    name: "My journal",
    component: () => import("../views/JournalView.vue"),
    meta: {
      heading: "A little space for you.",
      description: "The big feelings, the little things. They all belong here.",
    },
  },
  {
    path: "/partner",
    name: "Partner space",
    component: () => import("../views/PartnerView.vue"),
    meta: {
      heading: "A little closer, together.",
      description: "Preview the details you’d want your person to see.",
    },
  },
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
      { path: "/onboarding", name: "Onboarding", component: OnboardingPage },
      // App is the shared shell; each page renders inside its RouterView.
      {
        path: "/",
        component: App,
        redirect: { name: "Overview" },
        children: pages,
      },
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
