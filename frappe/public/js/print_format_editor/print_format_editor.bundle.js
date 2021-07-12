import PrintFormatEditorComponent from "./PrintFormatEditor.vue";

frappe.ui.PrintFormatEditor = class PrintFormatEditor {
	constructor({ wrapper, print_format, page }) {
		this.page = page;
		this.page.set_title(__("Editing {0}", [print_format]));
		this.page.set_primary_action(__("Save changes"), () => {
			this.$editor.save_changes();
		});
		this.page.add_button(__("Reset changes"), () => {
			this.$editor.fetch();
		});

		let $component = new Vue({
			el: wrapper,
			render: h =>
				h(PrintFormatEditorComponent, {
					props: {
						print_format_name: print_format
					}
				})
		});
		this.$editor = $component.$children[0];
	}
};
