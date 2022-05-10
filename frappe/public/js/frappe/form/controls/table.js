frappe.ui.form.ControlTable = class ControlTable extends frappe.ui.form
	.Control {
	make() {
		super.make();
		this.setup_meta();
		this.make_table();
		frappe.utils.bind_actions_with_object(this.$wrapper, this);
	}

	make_table() {
		this.$wrapper.html(`
			<div class="form-group">
				<label class="control-label">${this.df.label}</label>
				<div class="control-table-wrapper">
					<div class="control-table-header"></div>
					<div class="control-table-body"></div>
					<div class="control-table-footer"></div>
				</div>
			</div>
		`);
		this.$header = this.$wrapper.find(".control-table-header");
		this.$body = this.$wrapper.find(".control-table-body");
		this.$footer = this.$wrapper.find(".control-table-footer");
	}

	setup_meta() {
		this.doctype = this.df.options;
		if (!this.doctype) {
			throw `Doctype not specified in Options field for ${this.df.fieldname}`;
		}
		this.meta = frappe.get_meta(this.doctype);
	}

	get_columns() {
		if (this.columns) {
			return this.columns;
		}
		this.columns = this.meta.fields
			.filter(df => {
				return (
					df &&
					!df.hidden &&
					df.in_list_view &&
					((this.frm && this.frm.get_perm(df.permlevel, "read")) ||
						!this.frm) &&
					!in_list(frappe.model.layout_fields, df.fieldtype)
				);
			})
			.map(df => {
				if (df.columns) return df;
				let default_column_size = {
					Check: 1,
					"Small Text": 3,
					Text: 3,
					"Text Editor": 3
				};
				df.columns = default_column_size[df.fieldtype] || 1;
				return df;
			});

		return this.columns;
	}

	render_header() {
		let columns = this.get_columns();
		this.$header.html(`
			<div class="table-cell table-cell-checkbox">
				<input type="checkbox" class="control-table-checkbox" />
			</div>
			${columns
				.map(
					column => `
						<div
							class="table-cell"
							data-fieldname="${column.fieldname}"
						>
							${__(column.label)}
						</div>
					`
				)
				.join("")}
			<div class="table-cell"></div>
		`);
	}

	render_body() {
		let rows = this.get_value();
		this.$body.html("");

		let rows_html = rows.map(row => this.row_html(row)).join("");
		this.$body.html(rows_html);

		this.table_rows = {};
		for (let row of rows) {
			this.table_rows[row.name] = new TableRow({
				frm: this.frm,
				table: this,
				doc: row,
				wrapper: this.$body.find(
					`.control-table-row[data-name=${row.name}]`
				)
			});
		}
	}

	render_footer() {
		this.$footer.html(`
			<div class="flex">
				<button
					class="btn btn-default btn-xs mr-2"
					data-action="add_row"
				>
					${__("Add Row")}
				</button>
			</div>
		`);
	}

	refresh_input() {
		let columns = this.get_columns();

		// grid template
		let grid_template_columns = [
			"2.5rem",
			...columns.map(col => `${col.columns}fr`),
			"2.5rem"
		].join(" ");
		this.$wrapper.css("--grid-template-columns", grid_template_columns);

		this.render_header();
		this.render_body();
		this.render_footer();
	}

	get_value() {
		return this.get_model_value();
	}

	get_model_value() {
		this.value = this.value || [];
		if (this.doc) {
			this.value = this.doc[this.df.fieldname];
		}
		return this.value;
	}

	set_model_value(value) {
		this.value = value || [];
		if (this.doc) {
			this.doc[this.df.fieldname] = this.value;
		}
		return Promise.resolve();
	}

	set_table_value(row_name, fieldname, value) {
		let rows = this.get_value();
		let row = rows.find(row => row.name === row_name);
		if (row) {
			row[fieldname] = value;
			this.set_model_value(rows);
			this.refresh_table_cell(row.name, fieldname);
		}
	}

	add_row() {
		// update model
		let rows = this.get_value();
		let new_row;
		if (this.doc) {
			new_row = {
				doctype: this.doctype,
				name: frappe.model.get_new_name(this.doctype),
				__islocal: 1,
				__unsaved: 1
			};
		} else {
			new_row = {};
		}
		new_row.idx = rows.length + 1;
		rows.push(new_row);
		this.set_model_value(rows);

		// update ui
		let $row = $(this.row_html(new_row));
		this.$body.append($row);
		this.table_rows[new_row.name] = new TableRow({
			frm: this.frm,
			table: this,
			doc: new_row,
			wrapper: $row
		});
	}

	refresh_table_cell(row_name, cell_fieldname) {
		let table_row = this.table_rows[row_name];
		if (table_row) {
			let table_cell = table_row.table_cells[cell_fieldname];
			if (table_cell) {
				table_cell.refresh();
			}
		}
	}

	row_html(row) {
		return `
			<div
				class="control-table-row"
				data-idx="${row.idx}"
				data-doctype="${row.doctype}"
				data-name="${row.name}"
			></div>
		`;
	}
};
class TableRow {
	constructor({ frm, table, wrapper, doc }) {
		this.frm = frm;
		this.table = table;
		this.$wrapper = wrapper;
		this.doc = doc;
		this.render();
		frappe.utils.bind_actions_with_object(this.$wrapper, this);
	}

	render() {
		let columns = this.table.get_columns();

		this.$wrapper.html(`
			<div class="table-cell table-cell-checkbox">
				<input type="checkbox" class="control-table-checkbox" />
				<div>${this.doc.idx || ""}</div>
			</div>
			${columns
				.map(
					column => `
						<div
							class="table-cell"
							data-fieldname="${column.fieldname}"
						></div>
					`
				)
				.join("")}
			<div class="table-cell table-cell-actions">
				<button class="btn btn-xs btn-secondary" data-action="edit_row">${__(
					"Edit"
				)}</button>
			</div>
		`);

		this.table_cells = {};
		for (let column of columns) {
			this.table_cells[column.fieldname] = new TableCell({
				frm: this.frm,
				table: this.table,
				doc: this.doc,
				df: column,
				wrapper: this.$wrapper.find(
					`.table-cell[data-fieldname=${column.fieldname}]`
				)
			});
		}
	}

	refresh() {
		for (let cell of Object.values(this.table_cells)) {
			cell.refresh();
		}
	}

	edit_row() {
		TableRowEditDialog.edit({
			row: this,
			on_change: (fieldname, value) => {
				this.table.set_table_value(this.doc.name, fieldname, value);
			}
		});
	}
}

class TableCell {
	constructor({ frm, table, wrapper, doc, df }) {
		this.frm = frm;
		this.table = table;
		this.$wrapper = wrapper;
		this.doc = doc;
		this.df = df;
		this.render();
	}

	render() {
		if (!this.control) {
			this.control = frappe.ui.form.make_control({
				frm: this.frm,
				df: this.df,
				parent: this.$wrapper,
				only_input: true,
				with_link_btn: true,
				doc: this.doc,
				doctype: this.doc.doctype,
				docname: this.doc.name,
				value: this.doc[this.df.fieldname],
				render_input: true
			});
		}
		this.control.refresh();
	}

	refresh() {
		this.control.refresh();
	}
}

class TableRowEditDialog {
	static edit({ row, on_change }) {
		this.row = row;
		this.on_change = on_change;

		let dialog = this.get_dialog(row.doc.doctype);
		if (dialog) {
			dialog.set_title(__("Edit Row #{0}", [row.doc.idx || ""]));
			dialog.clear();
			dialog.set_values(row.doc);
			dialog.show();
			return;
		}
	}

	static get_dialog(doctype) {
		TableRowEditDialog.dialogs = TableRowEditDialog.dialogs || {};
		if (TableRowEditDialog.dialogs[doctype]) {
			return TableRowEditDialog.dialogs[doctype];
		}

		let meta = frappe.get_meta(doctype);
		let fields = meta.fields.map(df => {
			return {
				...df,
				onchange: () => {
					this.on_change(df.fieldname, d.get_value(df.fieldname));
				}
			};
		});
		let d = new frappe.ui.Dialog({
			title: __("Edit Row"),
			fields
		});
		let $buttons = $(`
				<div class="ml-2 btn-group" role="group">
					<button type="button" class="btn btn-default btn-xs btn-row-up">
						${frappe.utils.icon("up-line")}
					</button>
					<button type="button" class="btn btn-default btn-xs btn-row-down">
						${frappe.utils.icon("down")}
					</button>
				</div>
			`)
			.on("click", ".btn-row-up", () => {
				let table = this.row.table;
				let rows = table.get_value();
				let previous_row = rows[this.row.doc.idx - 2];
				if (previous_row) {
					let table_row = table.table_rows[previous_row.name];
					table_row.edit_row();
				}
			})
			.on("click", ".btn-row-down", () => {
				let table = this.row.table;
				let rows = table.get_value();
				let next_row = rows[this.row.doc.idx];
				if (next_row) {
					let table_row = table.table_rows[next_row.name];
					table_row.edit_row();
				}
			});
		d.header
			.find(".title-section")
			.addClass("align-items-center")
			.append($buttons);

		TableRowEditDialog.dialogs[doctype] = d;
		return d;
	}
}

frappe.provide("frappe.ui.form");
frappe.ui.form.close_grid_form = function() {};
