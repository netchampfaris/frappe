<template>
	<div class="row" v-if="print_format && layout && meta">
		<div class="col-md-3">
			<PrintFormatEditorControls :layout.sync="layout" :fields="meta.fields" />
		</div>
		<div class="col-md-9">
			<PrintFormatPaper :layout.sync="layout" />
		</div>
	</div>
</template>
<script>
import PrintFormatEditorControls from "./PrintFormatEditorControls.vue";
import PrintFormatPaper from "./PrintFormatPaper.vue";

export default {
	name: "PrintFormatEditor",
	props: ["print_format_name"],
	components: {
		PrintFormatEditorControls,
		PrintFormatPaper
	},
	data() {
		return {
			print_format: null,
			layout: null,
			meta: null
		};
	},
	mounted() {
		this.fetch();
	},
	methods: {
		fetch() {
			frappe.model.clear_doc("Print Format", this.print_format_name);
			frappe.model
				.with_doc("Print Format", this.print_format_name)
				.then(doc => {
					this.print_format = doc;
					this.layout = JSON.parse(this.print_format.format_data);

					frappe.model.with_doctype(doc.doc_type, () => {
						this.meta = frappe.get_meta(doc.doc_type);
					});
				});
		},
		save_changes() {
			frappe.dom.freeze(__('Saving...'));
			frappe.db
				.set_value(
					"Print Format",
					this.print_format_name,
					"format_data",
					JSON.stringify(this.layout)
				)
				.then(() => {
					this.fetch();
					frappe.dom.unfreeze();
				});
		}
	}
};
</script>
<style>
.layout-main {
	padding-bottom: 4rem;
}

.section {
	padding: 0.75rem 1rem;
	border: 1px solid var(--gray-300);
	border-radius: 0.5rem;
	margin-bottom: 1rem;
}

.section-title {
	margin-bottom: 1rem;
}

.section-content {
	display: grid;
	gap: 0.5rem;
	grid-template-columns: repeat(var(--columns), 1fr);
}

.section-content .element + .element {
	margin-top: 0.5rem;
}

.element {
	font-size: var(--text-sm);
	background-color: var(--bg-color);
	padding: 0.25rem;
	border-radius: 0.5rem;
	border: 1px dashed var(--gray-300);
}
</style>
