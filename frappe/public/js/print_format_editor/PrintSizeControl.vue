<template>
	<div class="sidebar-menu">
		<div class="sidebar-label">{{ __("Print Size") }}</div>

		<div class="frappe-control" data-fieldtype="Select">
			<div class="flex control-input align-center">
				<select
					class="input-with-feedback form-control btn btn-default btn-sm ellipsis"
					@change="$emit('change', $event.target.value)"
				>
					<option
						v-for="option in [
							{ label: __('A4'), value: 'A4' },
							{ label: __('Letter'), value: 'Letter' }
						]"
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
    props: ['value']
};
</script>
