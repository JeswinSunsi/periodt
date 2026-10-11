import { createApp } from "vue";

import App from "./App.vue";
import "./style.css";
import "./styles/cycle-detail.css";
import "./styles/ux.css";
import "./styles/themes.css";
import { initializeTheme } from "./composables/useTheme.js";

initializeTheme();
const app = createApp(App);

app.mount("#app");
