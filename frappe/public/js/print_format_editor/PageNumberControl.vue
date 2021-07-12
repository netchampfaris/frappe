<template>
	<div class="sidebar-menu">
		<div class="sidebar-label">{{ __("Page Number Position") }}</div>

		<div class="frappe-control" data-fieldtype="Select">
			<div class="flex control-input align-center">
				<select
					class="input-with-feedback form-control btn btn-default btn-sm ellipsis"
					@change="$emit('change', $event.target.value)"
				>
					<option
						v-for="option in options"
						:value="option.value"
						:selected="value === option.value"
					>
						{{ option.label }}
					</option>
				</select>
				<div class="select-icon">
					<svg class="icon icon-sm">
						<use href="#icon-select"></use>
					</svg>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
export default {
	name: "PrintSizeControl",
	props: ["value"],
	computed: {
		options() {
			return [
				{ label: __("Hide"), value: "Hide" },
				{ label: __("Top Left"), value: "Top Left" },
				{ label: __("Top Center"), value: "Top Center" },
				{ label: __("Top Right"), value: "Top Right" },
				{ label: __("Bottom Left"), value: "Bottom Left" },
				{ label: __("Bottom Center"), value: "Bottom Center" },
				{ label: __("Bottom Right"), value: "Bottom Right" }
			];
		}
	}
};
</script>
