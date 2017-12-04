frappe.ui.FilterGroup = class {
	constructor(opts) {
		$.extend(this, opts);
		this.wrapper = this.parent;
		this.filters = [];
		this.make();
	}

	make() {
		this.wrapper.append(this.get_container_template());
		this.set_events();
	}

	set_events() {
		this.wrapper.find('.add-filter').on('click', () => {
			this.add_filter(this.doctype, 'name');
		});
	}

	add_filters(filters) {
		let promises = [];

		for (const filter of filters) {
			promises.push(this.add_filter(...filter));
		}

		return Promise.all(promises);
	}

	add_filter(doctype, fieldname, condition, value, hidden) {
		if (!fieldname) return Promise.resolve();
		// adds a new filter, returns true if filter has been added

		// {}: Add in page filter by fieldname if exists ('=' => 'like')

		if(!this.validate_args(doctype, fieldname)) return false;

		const is_new_filter = arguments.length < 2;
		if (is_new_filter && this.wrapper.find(".new-filter:visible").length) {
			// only allow 1 new filter at a time!
			return Promise.resolve();
		} else {
			let args = [doctype, fieldname, condition, value];
			const promise = this.push_new_filter(args, is_new_filter, hidden);
			return (promise && promise.then) ? promise : Promise.resolve();
		}
	}

	validate_args(doctype, fieldname) {
		if(doctype && fieldname
			&& !frappe.meta.has_field(doctype, fieldname)
			&& !frappe.model.std_fields_list.includes(fieldname)) {

				frappe.throw(__(`Invalid filter: "${[fieldname.bold()]}"`));
				return false;
		}
		return true;
	}

	push_new_filter(args, is_new_filter=false, hidden=false) {
		// args: [doctype, fieldname, condition, value]
		if(this.filter_exists(args)) return;

		// {}: Clear page filter fieldname field

		let filter = this._push_new_filter(...args);

		if (filter && filter.value) {
			filter.setup_state(is_new_filter, hidden);
			return filter._filter_value_set; // internal promise
		}
	}

	_push_new_filter(doctype, fieldname, condition, value) {
		let args = {
			parent: this.wrapper,
			doctype: this.doctype,
			fieldname: fieldname,
			condition: condition,
			value: value,
			on_change: (update) => {
				if(update) this.update_filters();
				this.on_change();
			}
		};
		let filter = new frappe.ui.Filter(args);
		this.filters.push(filter);
		return filter;
	}

	filter_exists(filter_value) {
		// filter_value of form: [doctype, fieldname, condition, value]
		let exists = false;
		this.filters.filter(f => f.field).map(f => {
			let f_value = f.get_value();
			let value = filter_value[3];
			let equal = frappe.utils.arrays_equal;

			if(equal(f_value, filter_value) ||
				(Array.isArray(value) &&
				equal(value, f_value[3]))) {
					exists = true;
				}
		});
		return exists;
	}

	get_filters() {
		return this.filters.filter(f => f.field).map(f => {
			f.freeze();
			return f.get_value();
		});
		// {}: this.list.update_standard_filters(values);
	}

	update_filters() {
		this.filters = this.filters.filter(f => f.field); // remove hidden filters
	}

	clear_filters() {
		this.filters.map(f => { f.remove(true); });
		// {}: Clear page filters, .date-range-picker (called list run())
		this.filters = [];
	}

	get_filter(fieldname) {
		return this.filters.filter(f => {
			return (f.field && f.field.df.fieldname==fieldname);
		})[0];
	}

	get_container_template() {
		return $(`<div class="tag-filters-area">
			<div class="active-tag-filters">
				<button class="btn btn-default btn-xs add-filter text-muted">
						${__("Add Filter")}
				</button>
			</div>
		</div>
		<div class="filter-edit-area"></div>`);
	}
};
