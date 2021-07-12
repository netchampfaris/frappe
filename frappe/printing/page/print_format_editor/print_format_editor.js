frappe.pages["print-format-editor"].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "Print Format Editor",
		single_column: true
	});

	let route = frappe.get_route();

	if (route.length == 1) {
		let d = new frappe.ui.Dialog({
			title: __("New Print Format"),
			fields: [
				{
					label: __("Document Type"),
					fieldname: "doctype",
					fieldtype: "Link",
					options: "DocType"
				},
				{
					label: __("Print Format Name"),
					fieldname: "print_format_name",
					fieldtype: "Data"
				}
			],
			primary_action({ doctype, print_format_name }) {
				frappe
					.call(
						"frappe.printing.page.print_format_editor.print_format_editor.new",
						{
							doctype,
							print_format_name
						}
					)
					.then(r => {
						if (r.message && r.message.name) {
							frappe.set_route(
								"print-format-editor",
								r.message.name
							);
						}
					});
			}
		});
		d.show();
	} else {
		frappe
			.require([
				"print_format_editor.bundle.js"
			])
			.then(() => {
				let element = $(wrapper)
					.find(".layout-main-section")
					.get(0);

				frappe.pf_editor = new frappe.ui.PrintFormatEditor({
					wrapper: element,
					page,
					print_format: route[1]
				});
			});
	}

};
