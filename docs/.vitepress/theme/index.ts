import type { Theme } from 'vitepress'
import { theme as DefaultTheme } from 'frappe-ui/vitepress'

import Layout from './Layout.vue'
import { Navbar } from 'frappe-ui/vitepress'
import Home from './Home.vue'

// Reuse the shared prose theme; swap in a Frappe Layout that renders the
// landing page for `layout: home` and registers Frappe-specific chrome.
export default {
  ...DefaultTheme,
  Layout,
  enhanceApp(ctx) {
    DefaultTheme.enhanceApp?.(ctx)
    ctx.app.component('Navbar', Navbar)
    ctx.app.component('Home', Home)
  },
} satisfies Theme
