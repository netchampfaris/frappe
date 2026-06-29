import type { Theme } from "vitepress";
import { theme as DefaultTheme } from "frappe-ui/vitepress";

import Layout from "./Layout.vue";
import { Navbar } from "frappe-ui/vitepress";
import "./custom.css";

// Reuse the shared prose theme; swap in a Frappe Layout that registers
// Frappe-specific chrome.
export default {
  ...DefaultTheme,
  Layout,
  enhanceApp(ctx) {
    DefaultTheme.enhanceApp?.(ctx);
    ctx.app.component("Navbar", Navbar);
  },
} satisfies Theme;
