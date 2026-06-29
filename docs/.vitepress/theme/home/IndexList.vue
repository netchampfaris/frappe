<script setup lang="ts">
import { withBase } from "vitepress";

defineProps<{
	name: string;
	tagline: string;
	subtitle: string;
	sections: { text: string; link: string; count: number }[];
}>();

const pad = (n: number) => String(n + 1).padStart(2, "0");
</script>

<template>
	<section class="mx-auto max-w-3xl px-6 py-20">
		<header class="mb-10">
			<p class="text-xs font-medium leading-relaxed text-ink-gray-5">
				{{ name }}
			</p>
			<h1 class="mt-2 text-2xl font-bold leading-snug tracking-tight sm:text-3xl">
				{{ tagline }}
			</h1>
			<p class="mt-3 max-w-xl text-sm leading-relaxed text-ink-gray-6">
				{{ subtitle }}
			</p>
		</header>

		<ul class="border-t border-outline-gray-2">
			<li
				v-for="(section, i) in sections"
				:key="section.text"
				class="border-b border-outline-gray-2"
			>
				<a
					:href="withBase(section.link)"
					class="group flex items-baseline gap-5 py-3 leading-relaxed transition-colors hover:bg-surface-gray-1"
				>
					<span
						class="w-6 shrink-0 font-mono text-[11px] text-ink-gray-4 group-hover:text-ink-gray-6"
					>
						{{ pad(i) }}
					</span>
					<span
						class="flex-1 text-sm font-semibold leading-relaxed tracking-tight text-ink-gray-8 transition-colors group-hover:text-ink-gray-9 sm:text-base"
					>
						{{ section.text }}
					</span>
					<span class="shrink-0 self-center text-[11px] text-ink-gray-4">
						{{ section.count }} {{ section.count === 1 ? "topic" : "topics" }}
					</span>
					<span
						class="shrink-0 self-center text-ink-gray-4 transition-transform group-hover:translate-x-1 group-hover:text-ink-gray-7"
					>
						→
					</span>
				</a>
			</li>
		</ul>
	</section>
</template>
