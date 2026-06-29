<script setup lang="ts">
import { computed } from "vue";
import { useData } from "vitepress";
import { FrappeUIProvider } from "frappe-ui";
import { Navbar } from "frappe-ui/vitepress";
import IndexList from "./home/IndexList.vue";

const { theme } = useData();

const name = computed(() => theme.value.name ?? "");
const tagline = "Build full-stack apps, fast.";
const subtitle =
	"Learn how to build apps on Frappe Framework, from your first DocType to production deployment.";

// Section list is derived from the IA so the landing page stays in sync.
const sections = computed(() =>
	(theme.value.sidebar ?? []).map((s: any) => ({
		text: s.text,
		link: s.items[0]?.link ?? "/",
		count: s.items.length,
	}))
);
</script>

<template>
	<FrappeUIProvider>
		<div class="min-h-screen bg-surface-white text-ink-gray-9">
			<Navbar />
			<IndexList :name="name" :tagline="tagline" :subtitle="subtitle" :sections="sections" />
		</div>
	</FrappeUIProvider>
</template>
