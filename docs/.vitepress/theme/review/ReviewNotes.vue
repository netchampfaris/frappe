<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useData, useRoute } from "vitepress";
import { allNotes, putNote, deleteNote, replaceAll, type ReviewNote } from "./db";

// Dev-only review panel. Read a page, quote text, jot notes. Notes persist in
// IndexedDB and are mirrored to docs/review-notes.json via the dev server, so
// they can be extracted, acted on, and marked resolved.

const route = useRoute();
const { page } = useData();

const mounted = ref(false);
const open = ref(false);
const hideResolved = ref(false);
const notes = ref<ReviewNote[]>([]);
const draftBody = ref("");
const draftQuote = ref("");
const savedFlash = ref(false);

const currentTitle = computed(() => page.value.title || route.path);
const pageNotes = computed(() => {
	let list = notes.value.filter((n) => n.page === route.path);
	if (hideResolved.value) list = list.filter((n) => !n.resolved);
	return list.reverse();
});
const pageUnresolved = computed(
	() => notes.value.filter((n) => n.page === route.path && !n.resolved).length
);
const totalCount = computed(() => notes.value.length);
const resolvedCount = computed(() => notes.value.filter((n) => n.resolved).length);

function sorted(list: ReviewNote[]) {
	return [...list].sort((a, b) => a.createdAt - b.createdAt);
}

async function load() {
	notes.value = sorted(await allNotes());
}

// Merge IndexedDB with review-notes.json. The file wins on id conflicts (it
// carries resolved flips made outside the browser); local-only notes are kept.
// Empty/failed fetch leaves the local store untouched.
async function hydrateFromFile() {
	let fileNotes: ReviewNote[] = [];
	try {
		const res = await fetch("/__review-notes");
		if (res.ok) fileNotes = await res.json();
	} catch {
		return; // dev server unreachable — keep whatever IndexedDB has
	}
	const byId = new Map<string, ReviewNote>();
	for (const n of await allNotes()) byId.set(n.id, n);
	for (const n of fileNotes) byId.set(n.id, { resolved: false, ...n });
	const merged = sorted([...byId.values()]);
	await replaceAll(merged);
	notes.value = merged;
	syncToFile(); // push back any local-only notes the file didn't have
}

// Best-effort mirror of every note to the repo file for later extraction.
async function syncToFile() {
	try {
		await fetch("/__review-notes", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(notes.value, null, 2),
		});
	} catch {
		// production preview / server down — IndexedDB still holds it
	}
}

function captureSelection() {
	const text = window.getSelection?.()?.toString().trim();
	if (text) draftQuote.value = text;
}

async function save() {
	const body = draftBody.value.trim();
	if (!body) return;
	const note: ReviewNote = {
		id: crypto.randomUUID(),
		page: route.path,
		title: currentTitle.value,
		quote: draftQuote.value.trim(),
		body,
		resolved: false,
		createdAt: Date.now(),
	};
	await putNote(note);
	draftBody.value = "";
	draftQuote.value = "";
	await load();
	syncToFile();
}

async function toggleResolved(n: ReviewNote) {
	await putNote({ ...n, resolved: !n.resolved });
	await load();
	syncToFile();
}

async function remove(id: string) {
	await deleteNote(id);
	await load();
	syncToFile();
}

function toMarkdown(): string {
	const byPage = new Map<string, ReviewNote[]>();
	for (const n of sorted(notes.value)) {
		if (!byPage.has(n.page)) byPage.set(n.page, []);
		byPage.get(n.page)!.push(n);
	}
	let out = "# Docs review notes\n";
	for (const [pagePath, list] of byPage) {
		out += `\n## ${pagePath} — ${list[0].title}\n\n`;
		for (const n of list) {
			out += `- [${n.resolved ? "x" : " "}] ${n.body}\n`;
			if (n.quote) {
				out += n.quote
					.split("\n")
					.map((l) => `  > ${l}`)
					.join("\n");
				out += "\n";
			}
		}
	}
	return out;
}

async function copyMarkdown() {
	await navigator.clipboard.writeText(toMarkdown());
	savedFlash.value = true;
	setTimeout(() => (savedFlash.value = false), 1500);
}

function onKeydown(e: KeyboardEvent) {
	// Cmd/Ctrl+Shift+N toggles the panel; Esc closes it.
	if (e.key.toLowerCase() === "n" && e.shiftKey && (e.metaKey || e.ctrlKey)) {
		e.preventDefault();
		open.value = !open.value;
	} else if (e.key === "Escape" && open.value) {
		open.value = false;
	}
}

watch(
	() => route.path,
	() => {
		draftBody.value = "";
		draftQuote.value = "";
	}
);

onMounted(async () => {
	mounted.value = true;
	open.value = localStorage.getItem("docs-review-open") === "1";
	hideResolved.value = localStorage.getItem("docs-review-hide-resolved") === "1";
	await load();
	await hydrateFromFile();
	window.addEventListener("keydown", onKeydown);
});
onUnmounted(() => window.removeEventListener("keydown", onKeydown));
watch(open, (v) => localStorage.setItem("docs-review-open", v ? "1" : "0"));
watch(hideResolved, (v) => localStorage.setItem("docs-review-hide-resolved", v ? "1" : "0"));

function fmtTime(ts: number) {
	return new Date(ts).toLocaleString(undefined, {
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}
</script>

<template>
	<div v-if="mounted" class="fixed bottom-4 right-4 z-[60] print:hidden bg-surface-base">
		<!-- Collapsed: floating button -->
		<button
			v-if="!open"
			type="button"
			class="flex items-center gap-2 rounded-full border border-outline-gray-2 bg-surface-white px-3.5 py-2.5 text-sm font-medium text-ink-gray-7 shadow-lg transition-colors hover:text-ink-gray-9"
			title="Review notes (⌘⇧N)"
			@click="open = true"
		>
			<svg
				viewBox="0 0 24 24"
				class="h-4 w-4"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
			>
				<path
					d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
					stroke-linejoin="round"
				/>
			</svg>
			Notes
			<span
				v-if="pageUnresolved"
				class="rounded-full bg-surface-gray-3 px-1.5 text-xs text-ink-gray-7"
				>{{ pageUnresolved }}</span
			>
		</button>

		<!-- Expanded: panel -->
		<div
			v-else
			class="flex max-h-[75vh] w-[380px] flex-col overflow-hidden rounded-xl border border-outline-gray-2 bg-surface-white shadow-2xl"
		>
			<header class="flex items-center gap-2 border-b border-outline-gray-2 px-3.5 py-2.5">
				<span class="text-sm font-semibold text-ink-gray-9">Review notes</span>
				<span class="min-w-0 flex-1 truncate text-xs text-ink-gray-5">{{
					route.path
				}}</span>
				<button
					type="button"
					class="rounded p-1 text-ink-gray-5 hover:bg-surface-gray-2 hover:text-ink-gray-8"
					title="Collapse (esc)"
					@click="open = false"
				>
					<svg
						viewBox="0 0 24 24"
						class="h-4 w-4"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
					>
						<path d="M6 9l6 6 6-6" stroke-linecap="round" stroke-linejoin="round" />
					</svg>
				</button>
			</header>

			<!-- New note -->
			<div class="border-b border-outline-gray-2 px-3.5 py-3">
				<div
					v-if="draftQuote"
					class="mb-2 flex items-start gap-2 rounded border-l-2 border-outline-gray-3 bg-surface-gray-1 px-2 py-1.5"
				>
					<p
						class="min-w-0 flex-1 whitespace-pre-wrap break-words text-xs italic text-ink-gray-6"
					>
						{{ draftQuote }}
					</p>
					<button
						type="button"
						class="shrink-0 text-ink-gray-4 hover:text-ink-gray-7"
						title="Remove quote"
						@click="draftQuote = ''"
					>
						<svg
							viewBox="0 0 24 24"
							class="h-3.5 w-3.5"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<path d="M18 6L6 18M6 6l12 12" stroke-linecap="round" />
						</svg>
					</button>
				</div>

				<textarea
					v-model="draftBody"
					rows="3"
					placeholder="Note for this page…"
					class="w-full resize-y rounded-md border border-outline-gray-2 bg-surface-base px-2.5 py-1.5 text-sm text-ink-gray-8 placeholder-ink-gray-4 focus:border-outline-gray-3 focus:outline-none focus:ring-0"
					@keydown.meta.enter="save"
					@keydown.ctrl.enter="save"
				/>

				<div class="mt-2 flex items-center gap-2">
					<button
						type="button"
						class="flex items-center gap-1.5 rounded-md border border-outline-gray-2 px-2 py-1 text-xs text-ink-gray-6 hover:text-ink-gray-9"
						title="Quote the current text selection"
						@click="captureSelection"
					>
						<svg viewBox="0 0 24 24" class="h-3.5 w-3.5" fill="currentColor">
							<path
								d="M7 7h4v4H7a3 3 0 0 0 0 6v2a5 5 0 0 1 0-10zm8 0h4v4h-4a3 3 0 0 0 0 6v2a5 5 0 0 1 0-10z"
							/>
						</svg>
						Quote selection
					</button>
					<div class="flex-1" />
					<button
						type="button"
						class="rounded-md bg-surface-gray-7 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-40"
						:disabled="!draftBody.trim()"
						@click="save"
					>
						Add note
					</button>
				</div>
			</div>

			<!-- List -->
			<div class="min-h-0 flex-1 overflow-y-auto px-3.5 py-2">
				<p v-if="!pageNotes.length" class="py-6 text-center text-xs text-ink-gray-4">
					{{
						hideResolved ? "No open notes on this page." : "No notes on this page yet."
					}}
				</p>
				<ul v-else class="flex flex-col gap-2.5">
					<li
						v-for="n in pageNotes"
						:key="n.id"
						class="rounded-md border border-outline-gray-2 px-2.5 py-2"
						:class="n.resolved ? 'opacity-55' : ''"
					>
						<blockquote
							v-if="n.quote"
							class="mb-1.5 whitespace-pre-wrap break-words border-l-2 border-outline-gray-3 pl-2 text-xs italic text-ink-gray-5"
						>
							{{ n.quote }}
						</blockquote>
						<p
							class="whitespace-pre-wrap break-words text-sm text-ink-gray-8"
							:class="n.resolved ? 'line-through' : ''"
						>
							{{ n.body }}
						</p>
						<div class="mt-1.5 flex items-center justify-between">
							<span class="text-[11px] text-ink-gray-4">{{
								fmtTime(n.createdAt)
							}}</span>
							<div class="flex items-center gap-2.5">
								<button
									type="button"
									class="text-[11px]"
									:class="
										n.resolved
											? 'text-ink-green-6 hover:text-ink-green-8'
											: 'text-ink-gray-5 hover:text-ink-gray-8'
									"
									@click="toggleResolved(n)"
								>
									{{ n.resolved ? "✓ Resolved" : "Mark resolved" }}
								</button>
								<button
									type="button"
									class="text-[11px] text-ink-gray-4 hover:text-ink-red-4"
									@click="remove(n.id)"
								>
									Delete
								</button>
							</div>
						</div>
					</li>
				</ul>
			</div>

			<!-- Footer -->
			<footer
				class="flex items-center gap-2 border-t border-outline-gray-2 px-3.5 py-2 text-xs text-ink-gray-5"
			>
				<label
					class="flex items-center gap-1.5 cursor-pointer select-none"
					title="Hide resolved notes"
				>
					<input
						v-model="hideResolved"
						type="checkbox"
						class="rounded border-outline-gray-3"
					/>
					Hide resolved
				</label>
				<div class="flex-1" />
				<span class="text-ink-gray-4">{{ resolvedCount }}/{{ totalCount }} done</span>
				<button
					type="button"
					class="rounded px-2 py-1 hover:bg-surface-gray-2 hover:text-ink-gray-8"
					@click="copyMarkdown"
				>
					{{ savedFlash ? "Copied!" : "Copy (md)" }}
				</button>
			</footer>
		</div>
	</div>
</template>
