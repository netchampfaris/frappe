<template>
	<div class="sidebar-menu">
		<div class="sidebar-label">{{ __("Page Margins") }}</div>

		<div class="margin-controls">
			<label>
				<div class="control-label">Top</div>
				<input
					class="bg-white form-control form-control-sm"
					type="number"
					:value="layout.margin_top"
					placeholder="Top"
					@change="$emit('change', ['margin_top', $event.target.value])"
				/>
			</label>
			<label>
				<div class="control-label">Right</div>
				<input
					class="bg-white form-control form-control-sm"
					type="number"
					:value="layout.margin_right"
					placeholder="Right"
					@change="$emit('change', ['margin_right', $event.target.value])"
				/>
			</label>
			<label>
				<div class="control-label">Bottom</div>
				<input
					class="bg-white form-control form-control-sm"
					type="number"
					:value="layout.margin_bottom"
					placeholder="Bottom"
					@change="$emit('change', ['margin_bottom', $event.target.value])"
				/>
			</label>
			<label>
				<div class="control-label">Left</div>
				<input
					class="bg-white form-control form-control-sm"
					type="number"
					:value="layout.margin_left"
					placeholder="Left"
					@change="$emit('change', ['margin_left', $event.target.value])"
				/>
			</label>
		</div>
	</div>
</template>
<script>
export default {
	name: "PageMarginControl",
	props: ["layout"]
};
</script>
<style>
.margin-controls {
	display: flex;
}
.margin-controls > * + * {
	margin-left: 0.5rem;
}
</style>
