frappe.ui.form.ControlTable = class ControlTable extends frappe.ui.form
	.Control {
	make() {
		super.make();
		this.setup_meta();
		this.make_table();
	}

	make_table() {
		this.$wrapper.html(`
			<div class="form-group">
				<label class="control-label">${this.df.label}</label>
				<div class="control-table-wrapper">
					<div class="control-table-header"></div>
					<div class="control-table-body"></div>
				</div>
			</div>
		`);
		this.$header = this.$wrapper.find(".control-table-header");
		this.$body = this.$wrapper.find(".control-table-body");
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
				if (df.columns) return;
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
			<div class="table-cell d-flex align-items-center">
				<input type="checkbox" class="control-table-checkbox" />
			</div>
			${columns
				.map(
					column =>
						`
							<div
								class="table-cell"
								data-fieldname="${column.fieldname}"
							>
								${__(column.label)}
							</div>
						`
				)
				.join("")}
		`);
	}

	render_body() {
		let rows = this.get_value();
		this.$body.html("");

		let row_html = row => `
			<div
				class="control-table-row"
				data-idx="${row.idx}"
				data-doctype="${row.doctype}"
				data-name="${row.name}"
			></div>
		`;
		let rows_html = rows.map(row_html).join("");
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

	refresh_input() {
		let columns = this.get_columns();
		let grid_template_columns = `2rem ${columns
			.map(col => `${col.columns}fr`)
			.join(" ")}`;
		this.$wrapper
			.find(".control-table-wrapper")
			.css("--grid-template-columns", grid_template_columns);

		this.render_header();
		this.render_body();
	}

	get_value() {
		return this.get_model_value();
	}
};

class TableRow {
	constructor({ frm, table, wrapper, doc }) {
		this.frm = frm;
		this.table = table;
		this.$wrapper = wrapper;
		this.doc = doc;
		this.render();
	}

	render() {
		let columns = this.table.get_columns();

		this.$wrapper.html(`
			<div class="table-cell d-flex align-items-center">
				<input type="checkbox" class="control-table-checkbox" />
				<div>${this.doc.idx || ''}</div>
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
		`);

		this.cells = {};
		for (let column of columns) {
			this.cells[column.fieldname] = new TableCell({
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
}

frappe.provide("frappe.ui.form");
frappe.ui.form.close_grid_form = function() {};
