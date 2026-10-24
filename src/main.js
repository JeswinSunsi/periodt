import { createApp } from "vue";
import { createWebHistory } from "vue-router";

import AppRoot from "./AppRoot.vue";
import { createAppRouter } from "./router/index.js";
import "./style.css";
import "./styles/cycle-detail.css";
import "./styles/ux.css";
import "./styles/themes.css";
import { initializeTheme } from "./composables/useTheme.js";
import { useCycle } from "./composables/useCycle.js";

initializeTheme();
const { state } = useCycle();
const router = createAppRouter(createWebHistory(import.meta.env.BASE_URL), {
  needsOnboarding: () => state.onboarding.status === "pending",
});
const app = createApp(AppRoot);

app.use(router);
router.isReady().then(() => app.mount("#app"));
