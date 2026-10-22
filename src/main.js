import { createApp } from "vue";
import { createWebHistory, RouterView } from "vue-router";

import { createAppRouter } from "./router/index.js";
import "./style.css";
import "./styles/cycle-detail.css";
import "./styles/ux.css";
import "./styles/themes.css";
import { initializeTheme } from "./composables/useTheme.js";

initializeTheme();
const router = createAppRouter(createWebHistory(import.meta.env.BASE_URL));
const app = createApp(RouterView);

app.use(router);
router.isReady().then(() => app.mount("#app"));
