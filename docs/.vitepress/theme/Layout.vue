<script setup lang="ts">
import { defineAsyncComponent } from "vue";
import { theme as DefaultTheme } from "frappe-ui/vitepress";

const SharedLayout = DefaultTheme.Layout;

// Per-page review notes panel, dev server only. The dynamic import sits in a
// dead branch in production (import.meta.env.DEV is statically false), so the
// whole panel is tree-shaken out of the prod bundle.
const ReviewNotes = import.meta.env.DEV
	? defineAsyncComponent(() => import("./review/ReviewNotes.vue"))
	: null;
</script>

<template>
	<!-- Doc pages use the theme's default Navbar (rendered by the shared Layout). -->
	<component :is="SharedLayout" />
	<component :is="ReviewNotes" v-if="ReviewNotes" />
</template>
