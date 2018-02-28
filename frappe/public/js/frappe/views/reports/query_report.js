// Copyright (c) 2018, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt
import DataTable from 'frappe-datatable';

frappe.provide("frappe.views");
frappe.provide("frappe.query_reports");

frappe.standard_pages["query-report"] = function() {
	var wrapper = frappe.container.add_page('query-report');

	frappe.ui.make_app_page({
		parent: wrapper,
		title: __('Query Report'),
		single_column: true,
	});

	frappe.query_report = new frappe.views.QueryReport({
		parent: wrapper,
	});

	$(wrapper).bind("show", function() {
		frappe.query_report.show();
	});
};

frappe.views.QueryReport = class QueryReport extends frappe.views.BaseList {
	show() {
		this.init().then(() => this.load());
	}

	init() {
		if (this.init_promise) {
			return this.init_promise;
		}

		let tasks = [
			this.setup_defaults,
			this.setup_page,
			this.setup_report_wrapper
		].map(fn => fn.bind(this));

		this.init_promise = frappe.run_serially(tasks);
		return this.init_promise;
	}

	setup_defaults() {
		this.route = frappe.get_route();
		this.page_name = frappe.get_route_str();

		// Setup buttons
		this.primary_action = null;
		this.secondary_action = {
			label: __('Refresh'),
			action: () => this.refresh()
		};

		// throttle refresh for 300ms
		this.refresh = frappe.utils.throttle(this.refresh, 300);

		this.menu_items = [];
	}

	load() {
		this.toggle_freeze(true);
		if (this.report_name !== frappe.get_route()[1]) {
			// different report
			this.load_report();
		} else {
			// same report
			this.refresh_report();
		}
	}

	load_report() {
		this.route = frappe.get_route();
		this.page_name = frappe.get_route_str();
		this.report_name = this.route[1];
		this.page_title = __(this.report_name);
		this.user_settings = frappe.get_user_settings(this.report_name);
		this.menu_items = this.get_menu_items();
		this.datatable = null;

		frappe.run_serially([
			() => this.get_report_doc(),
			() => this.get_report_settings(),
			() => this.report_settings.onload && this.report_settings.onload(this),
			() => this.setup_page_head(),
			() => this.refresh_report()
		]);
	}

	refresh_report() {
		return frappe.run_serially([
			() => this.setup_filters(),
			() => this.set_route_filters(),
			() => this.refresh()
		]);
	}

	get_report_doc() {
		return frappe.model.with_doc('Report', this.report_name)
			.then(doc => {
				this.report_doc = doc;
			})
			.then(() => frappe.model.with_doc('DocType', this.report_doc.ref_doctype));
	}

	get_report_settings() {
		if (frappe.query_reports[this.report_name]) {
			this.report_settings = frappe.query_reports[this.report_name];
			return this._load_script;
		}

		this._load_script = (new Promise(resolve => frappe.call({
			method: 'frappe.desk.query_report.get_script',
			args: { report_name: this.report_name },
			callback: resolve
		}))).then(r => {
			frappe.dom.eval(r.message.script || '');
			return r;
		}).then(r => {
			return frappe.after_ajax(() => {
				this.report_settings = frappe.query_reports[this.report_name];
				this.html_format = r.message.html_format;
				this.report_settings.html_format = r.message.html_format;
			});
		});

		return this._load_script;
	}

	setup_filters() {
		this.clear_filters();
		const { filters = [] } = this.report_settings;

		this.filters = filters.map(df => {
			if (df.fieldtype === 'Break') return;

			const f = this.page.add_field(df);

			if (df.default) {
				f.set_input(df.default);
			}

			if (df.get_query) f.get_query = df.get_query;
			if (df.on_change) f.on_change = df.on_change;
			df.onchange = () => {
				// if(!this.flags.filters_set) {
				// 	// don't trigger change while setting filters
				// 	return;
				// }
				if (f.on_change) {
					f.on_change(this);
				} else {
					this.refresh();
				}
			};

			return f;
		}).filter(Boolean);

		if (this.filters.length === 0) {
			// hide page form if no filters
			this.page.hide_form();
		} else {
			this.page.show_form();
		}

		// set the field 'query_report_filters_by_name' first
		// as they can be used in
		// setting/triggering the filters
		this.set_filters_by_name();
	}

	set_filters_by_name() {
		frappe.query_report_filters_by_name = {};
		for (var i in this.filters) {
			frappe.query_report_filters_by_name[this.filters[i].df.fieldname] = this.filters[i];
		}
	}

	set_route_filters() {
		if(frappe.route_options) {
			const fields = Object.keys(frappe.route_options);
			const filters_to_set = this.filters.filter(f => fields.includes(f.df.fieldname));

			const promises = filters_to_set.map(f => {
				return () => {
					const value = frappe.route_options[f.df.fieldname];
					return f.set_value(value);
				};
			});
			promises.push(() => {
				frappe.route_options = null;
			});

			return frappe.run_serially(promises);
		}
	}

	clear_filters() {
		this.page.clear_fields();
	}

	refresh() {
		const filters = this.get_filter_values(true);
		return new Promise(resolve => frappe.call({
			method: "frappe.desk.query_report.run",
			type: "GET",
			args: {
				report_name: this.report_name,
				filters: filters
			},
			callback: resolve
		})).then(r => {
			this.render_report(r.message);
		});
	}

	render_report(data) {
		this.toggle_freeze(false);
		this._data = data.result;
		this._columns = data.columns;
		if (this.datatable) {
			this.datatable.refresh(data.result);
			return;
		}
		this.datatable = new DataTable(this.$report[0], {
			columns: this.prepare_columns(data.columns),
			data: data.result,
			enableInlineFilters: true,
			// layout: 'fluid'
		});
	}

	prepare_columns(columns) {
		columns = columns.map(column => {
			if (typeof column === 'string') {
				if (column.includes(':')) {
					let [label, fieldtype, width] = column.split(':');
					let options;

					if (fieldtype.includes('/')) {
						[fieldtype, options] = fieldtype.split('/');
					}

					return {
						label,
						fieldtype,
						width,
						options
					};
				}

				return {
					label: column,
					fieldtype: 'Data'
				};
			}

			return column;
		});

		return columns.map(column => {
			return {
				id: column.fieldname,
				content: column.label,
				width: column.width || null,
				editable: false,
				format: (value) => {
					// const original_data = this._data[cell.rowIndex];//get_original_data(cell.rowIndex);
					let out = frappe.format(value, column);
					// if (original_data.indent !== undefined && cell.colIndex === 1) {
					// 	const next_row = get_original_data(cell.rowIndex + 1);
					// 	const is_parent = next_row && next_row.indent > original_data.indent;
					// 	const margin = 21 * original_data.indent;
					// 	out = `<span class="report-tree-node" style="margin-left: ${margin}px">
					// 		${is_parent ? '<span class="octicon octicon-triangle-down text-muted toggle"></span>': ''}
					// 		${out}
					// 	</span>`;
					// }
					return out;
				}
			};
		});
	}

	get_data() {

	}

	get_filter_values(raise) {
		const mandatory = this.filters.filter(f => f.df.reqd);
		const missing_mandatory = mandatory.filter(f => !f.get_value());

		if (raise && missing_mandatory.length > 0) {
			// this.chart_area.hide();
			// this.wrapper.find(".waiting-area").empty().toggle(false);
			// this.$no_result.html(__("Please set filters")).show();
			if (raise) {
				frappe.throw(__('Filter missing: {0}', [missing_mandatory.map(f => f.df.label).join(', ')]));
			}
		}

		const filters = this.filters
			.filter(f => f.get_value())
			.map(f => {
				var v = f.get_value();
				// hidden fields dont have $input
				if(f.df.hidden) v = f.value;
				if(v === '%') v = null;
				return {
					[f.df.fieldname]: v
				};
			})
			.reduce((acc, f) => {
				Object.assign(acc, f);
				return acc;
			}, {});

		return filters;
	}

	set_breadcrumbs() {
		if (!this.report_doc || !this.report_doc.ref_doctype) return;
		const ref_doctype = frappe.get_meta(this.report_doc.ref_doctype);
		frappe.breadcrumbs.add(ref_doctype.module);
	}

	print_report(print_settings) {
		frappe.render_grid({
			template: this.html_format || null,
			title: __(this.report_name),
			print_settings: print_settings,
			filters: this.get_filter_values(),
			data: this.get_data_for_print(),
			columns: this.get_columns_for_print(),
			report: this
		});
	}

	pdf_report(print_settings) {
		const base_url = frappe.urllib.get_base_url();
		const print_css = frappe.boot.print_css;
		const landscape = print_settings.orientation == "Landscape";
		const columns = this.columns;

		let html;
		if (this.html_format) {
			const content = frappe.render(this.html_format, {
				data: this.get_data_for_print(),
				filters: this.get_filter_values(),
				report: this,
			});

			//Render Report in HTML
			html = frappe.render_template("print_template", {
				title:__(this.report_name),
				content: content,
				base_url: base_url,
				print_css: print_css,
				print_settings: print_settings,
				landscape: landscape,
				columns: columns
			});
		} else {
			const content = frappe.render_template("print_grid", {
				title: __(this.report_name),
				data: this.get_data_for_print(),
				columns: columns
			})

			//Render Report in HTML
			html = frappe.render_template("print_template", {
				content: content,
				title: __(this.report_name),
				base_url: base_url,
				print_css: print_css,
				print_settings: print_settings,
				landscape: landscape,
				columns: columns
			});
		}

		frappe.render_pdf(html, print_settings);
	}

	get_data_for_print() {
		const indices = this.datatable.datamanager.getFilteredRowIndices();
		return indices.map(i => this._data[i]);
	}

	get_columns_for_print() {
		return this._columns || [];
	}

	get_menu_items() {
		return [
			{
				label: __('Refresh'),
				action: () => this.refresh(),
				class: 'visible-xs'
			},
			{
				label: __('Edit'),
				action: () => frappe.set_route("Form", "Report", this.report_name),
				condition: () => frappe.user.is_report_manager(),
				standard: true
			},
			{
				label: __('Print'),
				action: () => {
					frappe.ui.get_print_settings(
						false,
						print_settings => this.print_report(print_settings),
						this.report_doc.letter_head
					);
				},
				condition: () => frappe.model.can_print(this.report_doc.ref_doctype),
				standard: true
			},
			{
				label: __('PDF'),
				action: () => {
					frappe.ui.get_print_settings(
						false,
						print_settings => this.pdf_report(print_settings),
						this.report_doc.letter_head
					);
				},
				condition: () => frappe.model.can_print(this.report_doc.ref_doctype),
				standard: true
			},
			{
				label: __('Export'),
				action: () => this.make_export(),
				standard: true
			},
			{
				label: __('Setup Auto Email'),
				action: () => frappe.set_route('List', 'Auto Email Report', {'report' : this.report_name}),
				standard: true
			},
			{
				label: __('User Permissions'),
				action: () => frappe.set_route('List', 'User Permission', {
					doctype: "Report",
					name: this.report_name
				}),
				condition: () => frappe.model.can_set_user_permissions('Report'),
				standard: true
			},
			{
				label: __('Add to Desktop'),
				action: () => frappe.add_to_desktop(this.report_name, null, this.report_name),
				standard: true
			},
		];
	}

	setup_page_head() {
		super.setup_page_head();
		this.page.set_title_sub(`<label class="label label-warning text-color">${__('Beta')}</label>`);
	}

	setup_report_wrapper() {
		if (this.$report) return;
		this.$report = $('<div class="report-wrapper">').appendTo(this.page.main);
		this.$freeze =
			$(`<div class="report-loading-area flex justify-center align-center text-muted" style="height: 50vh;">
				<div>${__('Loading')}...</div>
			</div>`).hide().appendTo(this.page.main);
	}

	toggle_freeze(flag) {
		this.$freeze.toggle(flag);
		this.$report.toggle(!flag);
	}

	get data() {
		return this._data;
	}

	get columns() {
		return this._columns;
	}
};