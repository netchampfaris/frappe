<template>
	<div class="layout-side-section">
		<div class="form-sidebar">
			<PrintSizeControl
				:value="layout.size"
				@change="size => update_size(size)"
			/>
			<PageNumberControl
				:value="layout.page_number_position"
				@change="val => update('page_number_position', val)"
			/>
			<PageMarginControl :layout="layout" @change="val => update(val[0], val[1])" />

			<div class="sidebar-menu">
				<div class="sidebar-label">{{ __("Fields") }}</div>

				<div class="element-controls">
					<draggable
						:list="elements"
						:group="{ name: 'fields', pull: 'clone', put: false }"
					>
						<button
							class="element"
							v-for="element in elements"
							:key="element.fieldname"
						>
							{{ element.label }}
						</button>
					</draggable>
				</div>
			</div>
		</div>
	</div>
</template>
<script>
import draggable from "vuedraggable";
import PageMarginControl from './PageMarginControl.vue';
import PageNumberControl from "./PageNumberControl.vue";
import PrintSizeControl from "./PrintSizeControl.vue";

export default {
	name: "PrintFormatEditorControls",
	props: ["layout", "fields"],
	components: {
		draggable,
		PrintSizeControl,
		PageNumberControl,
PageMarginControl
	},
	methods: {
		onChange(key, value) {
			let updatedLayout = Object.assign({}, this.layout);
			updatedLayout[key] = value;
			this.$emit("update:layout", updatedLayout);
		},
		update(key, value) {
			this.$emit("update:layout", {
				...this.layout,
				[key]: value
			});
		},
		update_size(value) {
			this.$emit("update:layout", {
				...this.layout,
				size: value
			});
		},
		update_margin(direction, value) {
			value = parseFloat(value);
			if (value < 0) {
				value = 0;
			}
			let layout = Object.assign({}, this.layout);
			layout["margin_" + direction] = value;
			this.$emit("update:layout", layout);
		}
	},
	computed: {
		elements() {
			let fields = this.fields
				.filter(df => {
					if (frappe.model.table_fields.includes(df.fieldtype)) {
						return true;
					}
					if (frappe.model.no_value_type.includes(df.fieldtype)) {
						return false;
					}
					return true;
				})
				.map(df => {
					let out = {
						fieldtype: df.fieldtype,
						label: df.label,
						fieldname: df.fieldname,
						options: df.options
					};

					if (df.fieldtype === "Table") {
						out.table_fields = frappe.meta
							.get_docfields(df.options)
							.filter(tf => tf.in_list_view)
							.map(tf => ({
								fieldtype: tf.fieldtype,
								label: tf.label,
								fieldname: tf.fieldname,
								options: tf.options
							}));
					}
					return out;
				});
			return [
				{
					label: "Custom HTML"
				},
				...fields
			];
		}
	}
};
</script>
<style scoped>
details > summary {
	list-style-type: none;
}

details > summary::-webkit-details-marker {
	display: none;
}

details > summary::after {
	content: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M4.25 9.5L7.75 6L4.25 2.5' stroke='%231F272E' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
	height: 18px;
}

details[open] > summary::after {
	content: url("data:image/svg+xml,%3Csvg width='12' height='12' viewBox='0 0 12 12' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M2.5 4.25L6 7.75L9.5 4.25' stroke='%231F272E' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E%0A");
}

details[open] {
	padding-bottom: 0.5rem;
}

.control-wrapper:not(:last-child) {
	border-bottom: 1px solid var(--gray-300);
}

.control-wrapper summary {
	display: flex;
	padding: 0.5rem 0;
}

.control-title {
	font-weight: 500;
	color: var(--text-muted);
	letter-spacing: 0.04rem;
	font-size: var(--text-sm);
}


.element {
	display: block;
	width: 100%;
	border: 1px dashed var(--dark-border-color);
	padding: 0.5rem 0.5rem 0.5rem 0.75rem;
	border-radius: var(--border-radius);
	text-align: left;
	font-size: var(--text-md);
	color: var(--text-color);
	background-color: white;
}

.element + .element {
	margin-top: 0.5rem;
}

.element-field {
	background: var(--bg-light-gray);
}
</style>
