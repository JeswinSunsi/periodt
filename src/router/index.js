import { createRouter } from "vue-router";

const App = () => import("../App.vue");

const pages = [
  { path: "/overview", name: "Overview" },
  { path: "/cycle", name: "My cycle" },
  { path: "/insights", name: "Cycle insights" },
  { path: "/journal", name: "My journal" },
  { path: "/partner", name: "Partner space" },
];

export function createAppRouter(history) {
  const router = createRouter({
    history,
    routes: [
      { path: "/", redirect: { name: "Overview" } },
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

  return router;
}
