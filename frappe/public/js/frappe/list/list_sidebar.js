// Copyright (c) 2015, Frappe Technologies Pvt. Ltd. and Contributors
// MIT License. See license.txt

frappe.provide('frappe.views');

// opts:
// stats = list of fields
// doctype
// parent
// set_filter = function called on click

frappe.views.ListSidebar = Class.extend({
    init: function(opts) {
        $.extend(this, opts);
        this.make();
        this.get_stats();
        this.cat_tags = [];
    },
    make: function() {
        var sidebar_content = frappe.render_template("list_sidebar", { doctype: this.doctype });

        this.sidebar = $('<div class="list-sidebar overlay-sidebar hidden-xs hidden-sm"></div>')
            .html(sidebar_content)
            .appendTo(this.page.sidebar.empty());

        this.setup_reports();
        this.setup_stored_filters();
        this.setup_assigned_to_me();
        this.setup_views();
        this.setup_kanban_boards();
        this.setup_calendar_view();
        this.setup_email_inbox();

        let limits = frappe.boot.limits;

        if (limits.upgrade_url && limits.expiry && !frappe.flags.upgrade_dismissed) {
            this.setup_upgrade_box();
        }
    },
    setup_views: function() {
        var show_list_link = false;

        if (frappe.views.calendar[this.doctype]) {
            this.sidebar.find('.list-link[data-view="Calendar"]').removeClass("hide");
            this.sidebar.find('.list-link[data-view="Gantt"]').removeClass('hide');
            show_list_link = true;
        }
        //show link for kanban view
        this.sidebar.find('.list-link[data-view="Kanban"]').removeClass('hide');
        if (this.doctype === "Communication" && frappe.boot.email_accounts.length) {
            this.sidebar.find('.list-link[data-view="Inbox"]').removeClass('hide');
            show_list_link = true;
        }

        if (frappe.treeview_settings[this.doctype]) {
            this.sidebar.find(".tree-link").removeClass("hide");
        }

        this.current_view = 'List';
        var route = frappe.get_route();
        if (route.length > 2 && frappe.views.view_modes.includes(route[2])) {
            this.current_view = route[2];

            if (this.current_view === 'Kanban') {
                this.kanban_board = route[3];
            } else if (this.current_view === 'Inbox') {
                this.email_account = route[3];
            }
        }

        // disable link for current view
        this.sidebar.find('.list-link[data-view="' + this.current_view + '"] a')
            .attr('disabled', 'disabled').addClass('disabled');

        //enable link for Kanban view
        this.sidebar.find('.list-link[data-view="Kanban"] a, .list-link[data-view="Inbox"] a')
            .attr('disabled', null).removeClass('disabled');

        // show image link if image_view
        if (this.list_view.meta.image_field) {
            this.sidebar.find('.list-link[data-view="Image"]').removeClass('hide');
            show_list_link = true;
        }

        if (show_list_link) {
            this.sidebar.find('.list-link[data-view="List"]').removeClass('hide');
        }
    },
    setup_reports: function() {
        // add reports linked to this doctype to the dropdown
        var me = this;
        var added = [];
        var dropdown = this.page.sidebar.find('.reports-dropdown');
        var divider = false;

        var add_reports = function(reports) {
            $.each(reports, function(name, r) {
                if (!r.ref_doctype || r.ref_doctype == me.doctype) {
                    var report_type = r.report_type === 'Report Builder' ?
                        `List/${r.ref_doctype}/Report` : 'query-report';

                    var route = r.route || report_type + '/' + (r.title || r.name);

                    if (added.indexOf(route) === -1) {
                        // don't repeat
                        added.push(route);

                        if (!divider) {
                            me.get_divider().appendTo(dropdown);
                            divider = true;
                        }

                        $('<li><a href="#' + route + '">' +
                            __(r.title || r.name) + '</a></li>').appendTo(dropdown);
                    }
                }
            });
        };

        // from reference doctype
        if (this.list_view.settings.reports) {
            add_reports(this.list_view.settings.reports);
        }

        // from specially tagged reports
        add_reports(frappe.boot.user.all_reports || []);
    },

    setup_stored_filters: function() {
        var me = this;
        var $stored_filters = this.page.sidebar.find('.stored-filters');

        var refresh_filter_tools = function(freeze) {
            if (freeze === undefined) {
                freeze = 0;
            }

            frappe.call({
                method: "frappe.desk.stored_filters.get_filters",
                args: { dt: me.doctype },
                freeze: freeze,
                callback: function(r) {
                    var filters = []
                    if (r.message == "Success") {
                        filters = r.docs;
                    }

                    // enable global filters by roles
                    var can_add_global = frappe.user.has_role("System Manager") || frappe.user.has_role("Administrator");

                    // cache filters by name to quickly find them
                    var filter_cache = {}
                    filters.forEach(function(filter, i) {
                        filter_cache[filter.name] = filter;

                        // set li class and icon
                        if (filter.user_id) {
                            filter.li_css = "is_user";
                            filter.icon = "glyphicon-user";
                            filter.title = __("User Filter");
                        } else {
                            filter.li_css = "is_global";
                            filter.icon = "glyphicon-globe";
                            filter.title = __("Global Filter");
                        }
                    });

                    // inject our widget template
                    $stored_filters.empty().append(frappe.render_template("list_stored_filters", {
                        can_add_global: can_add_global,
                        filters: filters
                    }));

                    // hide options by default
                    var $options = $stored_filters.find('.options').hide();

                    // only show options when the filter name is entered
                    $stored_filters.find('.filter-name')
                        .keyup(function() {
                            if ($(this).val()) {
                                $options.slideDown('fast');
                            } else {
                                $options.slideUp('fast');
                            }
                        }).change(function() {
                            if ($(this).val()) {
                                $options.slideDown('fast');
                            } else {
                                $options.slideUp('fast');
                            }
                        });

                    // handle stored filter click
                    $stored_filters.find('.filter-link').click(function() {
                        var $filter_container = $(this).parent();
                        var name = $filter_container.attr('data-name');
                        var filter = filter_cache[name];

                        if (filter) {
                            cur_list.filter_area.filter_list.clear_filters();
                            filter.filter_list.forEach(function(f, i) {
                                var value = f.filter_value;
                                // handle "Between" condition type
                                if (f.is_date && f.filter_condition == "Between") {
                                    value = [f.filter_value, f.filter_value2];
                                }
                                var dt = f.filter_dt || doctype;
                                cur_list.filter_area.filter_list.add_filter(dt, f.filter_fieldname, f.filter_condition, value);
                            });
                        }

                        cur_list.refresh(true);
                    });

                    // handle remove button
                    $stored_filters.find('.filter-remove').click(function() {
                        var $filter_container = $(this).parent();
                        var name = $filter_container.attr('data-name');
                        var filter = filter_cache[name];

                        if (filter) {
                            frappe.call({
                                method: "frappe.desk.stored_filters.remove",
                                args: { name: name },
                                freeze: 1,
                                callback: function() {
                                    // re-render filter list now with new item
                                    refresh_filter_tools(1);
                                }
                            });
                        }
                    });

                    // handle save button click
                    $stored_filters.find('a.save-filter').click(function() {
                        var label = $stored_filters.find('.filter-name').val();
                        var filters = cur_list.filter_area.filter_list.get_filters();

                        if (filters.length == 0) {
                            frappe.msgprint("There are no filters to store");
                            return;
                        }

                        var data = [];

                        $.each(filters, function(i, filter) {
                            var filter_dt = filter[0];
                            var fieldname = filter[1];
                            var condition = filter[2];
                            var value1 = filter[3];
                            var value2 = null;
                            var is_date = false;

                            if (value1) {
                                // lets figure out if we have a valid date instance
                                if (typeof value1.getMonth === 'function') {
                                    try {
                                        value1 = moment(value1).format('YYYY-MM-DD');
                                        is_date = true;
                                    } catch (ex) {
                                        frappe.msgprint("Invalid Date Value: " + value1);
                                        return;
                                    }
                                } else if (value1.constructor == Array) {
                                    // date range
                                    is_date = true;

                                    // is there a better way to do this?
                                    try {
                                        value2 = moment(value1[1]).format('YYYY-MM-DD');
                                    } catch (ex) {
                                        frappe.msgprint("Invalid Date Value: " + value[1]);
                                        return;
                                    }

                                    try {
                                        value1 = moment(value1[0]).format('YYYY-MM-DD');
                                    } catch (ex) {
                                        frappe.msgprint("Invalid Date Value: " + value1[0]);
                                        return;
                                    }

                                }
                            }

                            var filter_data = {
                                filter_dt: filter_dt,
                                filter_condition: condition,
                                filter_fieldname: fieldname,
                                filter_value: value1,
                                is_date: is_date
                            }

                            if (value2) {
                                filter_data["filter_value2"] = value2
                            }

                            data.push(filter_data);
                        });

                        // get is global option if checked
                        var is_global = $stored_filters.find('.options input[name="is_global"]').is(':checked');

                        var args = {
                            label: label,
                            filter_doctype: me.doctype,
                            filter_list: data
                        }

                        // assign the owning user of this filter
                        if (!is_global) {
                            args.user = frappe.user.name;
                        }

                        frappe.call({
                            method: "frappe.desk.stored_filters.add",
                            args: args,
                            freeze: 1,
                            callback: function() {
                                // re-render filter list now with new item
                                refresh_filter_tools(1);
                            }
                        })

                    });

                }
            })
        };

        // kick off fetching filters
        refresh_filter_tools();

    },

    setup_kanban_boards: function() {
        // add kanban boards linked to this doctype to the dropdown
        var me = this;
        var $dropdown = this.page.sidebar.find('.kanban-dropdown');
        var divider = false;

        var meta = frappe.get_meta(this.doctype);
        var boards = meta && meta.__kanban_boards;
        if (!boards) return;

        boards.forEach(function(board) {
            var route = ["List", board.reference_doctype, "Kanban", board.name].join('/');
            if (!divider) {
                me.get_divider().appendTo($dropdown);
                divider = true;
            }
            $(`<li><a href="#${route}">
				<span>${__(board.name)}</span>
				${board.private ? '<i class="fa fa-lock fa-fw text-warning"></i>' : ''}
			</a></li>`).appendTo($dropdown);
        });

        $dropdown.find('.new-kanban-board').click(function() {
            // frappe.new_doc('Kanban Board', {reference_doctype: me.doctype});
            var select_fields = frappe.get_meta(me.doctype)
                .fields.filter(function(df) {
                    return df.fieldtype === 'Select' &&
                        df.fieldname !== 'kanban_column';
                });

            var fields = [{
                fieldtype: 'Data',
                fieldname: 'board_name',
                label: __('Kanban Board Name'),
                reqd: 1
            }];

            if (select_fields.length > 0) {
                fields = fields.concat([{
                        fieldtype: 'Select',
                        fieldname: 'field_name',
                        label: __('Columns based on'),
                        options: select_fields.map(df => df.label).join('\n'),
                        default: select_fields[0]
                    },
                    {
                        fieldtype: 'Check',
                        fieldname: 'custom_column',
                        label: __('Custom Column'),
                        default: 0,
                        onchange: function() {
                            var checked = d.get_value('custom_column');
                            if (checked) {
                                $(d.body).find('.frappe-control[data-fieldname="field_name"]').hide();
                            } else {
                                $(d.body).find('.frappe-control[data-fieldname="field_name"]').show();
                            }
                        }
                    }
                ]);
            }

            if (me.doctype === 'Task') {
                fields[0].description = __('A new Project with this name will be created');
            }

            if (['Note', 'ToDo'].includes(me.doctype)) {
                fields[0].description = __('This Kanban Board will be private');
            }

            var d = new frappe.ui.Dialog({
                title: __('New Kanban Board'),
                fields: fields,
                primary_action_label: __('Save'),
                primary_action: function(values) {

                    var custom_column = values.custom_column !== undefined ?
                        values.custom_column : 1;
                    var field_name;
                    if (custom_column) {
                        field_name = 'kanban_column';
                    } else {
                        field_name =
                            select_fields
                            .find(df => df.label === values.field_name)
                            .fieldname;
                    }

                    me.add_custom_column_field(custom_column)
                        .then(function() {
                            return me.make_kanban_board(values.board_name, field_name);
                        })
                        .then(function() {
                            d.hide();
                        }, function(err) {
                            frappe.msgprint(err);
                        });
                }
            });
            d.show();
        });
    },
    add_custom_column_field: function(flag) {
        var me = this;
        return new Promise(function(resolve, reject) {
            if (!flag) resolve(false);
            frappe.call({
                method: 'frappe.custom.doctype.custom_field.custom_field.add_custom_field',
                args: {
                    doctype: me.doctype,
                    df: {
                        label: 'Kanban Column',
                        fieldname: 'kanban_column',
                        fieldtype: 'Select',
                        hidden: 1
                    }
                }
            }).success(function() {
                resolve(true);
            }).error(function(err) {
                reject(err);
            });
        });
    },
    make_kanban_board: function(board_name, field_name) {
        var me = this;
        return frappe.call({
            method: 'frappe.desk.doctype.kanban_board.kanban_board.quick_kanban_board',
            args: {
                doctype: me.doctype,
                board_name: board_name,
                field_name: field_name
            },
            callback: function(r) {
                var kb = r.message;
                if (kb.filters) {
                    frappe.provide('frappe.kanban_filters');
                    frappe.kanban_filters[kb.kanban_board_name] = kb.filters;
                }
                frappe.set_route(
                    'List',
                    me.doctype,
                    'Kanban',
                    kb.kanban_board_name
                );
            }
        });
    },
    setup_calendar_view: function() {
        const doctype = this.doctype;

        frappe.db.get_list('Calendar View', {
            filters: {
                reference_doctype: doctype
            }
        }).then(result => {
            if (!result) return;
            const calendar_views = result;
            const $link_calendar = this.sidebar.find('.list-link[data-view="Calendar"]');

            let default_link = '';
            if (frappe.views.calendar[this.doctype]) {
                // has standard calendar view
                default_link = `<li><a href="#List/${doctype}/Calendar/Default">
					${ __("Default") }</a></li>`;
            }
            const other_links = calendar_views.map(
                calendar_view => `<li><a href="#List/${doctype}/Calendar/${calendar_view.name}">
					${ __(calendar_view.name) }</a>
				</li>`
            ).join('');

            const dropdown_html = `
				<div class="btn-group">
					<a class="dropdown-toggle" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
						${ __("Calendar") } <span class="caret"></span>
					</a>
					<ul class="dropdown-menu calendar-dropdown" style="max-height: 300px; overflow-y: auto;">
						${default_link}
						${other_links}
					</ul>
				</div>
			`;
            $link_calendar.removeClass('hide');
            $link_calendar.html(dropdown_html);
        });
    },
    setup_email_inbox: function() {
        // get active email account for the user and add in dropdown
        if (this.doctype != "Communication")
            return;

        let $dropdown = this.page.sidebar.find('.email-account-dropdown');
        let divider = false;

        if (has_common(frappe.user_roles, ["System Manager", "Administrator"])) {
            $(`<li class="new-email-account"><a>${__("New Email Account")}</a></li>`)
                .appendTo($dropdown);
        }

        let accounts = frappe.boot.email_accounts;
        accounts.forEach((account) => {
            let email_account = (account.email_id == "All Accounts") ? "All Accounts" : account.email_account;
            let route = ["List", "Communication", "Inbox", email_account].join('/');
            if (!divider) {
                this.get_divider().appendTo($dropdown);
                divider = true;
            }
            $(`<li><a href="#${route}">${account.email_id}</a></li>`).appendTo($dropdown);
            if (account.email_id === "Sent Mail")
                divider = false;
        });

        $dropdown.find('.new-email-account').click(function() {
            frappe.new_doc("Email Account");
        });
    },
    setup_assigned_to_me: function() {
        this.page.sidebar.find(".assigned-to-me a").on("click", () => {
            this.list_view.filter_area.add(this.list_view.doctype, "_assign", "like", `%${frappe.session.user}%`);
        });
    },
    setup_upgrade_box: function() {
        let upgrade_list = $(`<ul class="list-unstyled sidebar-menu"></ul>`).appendTo(this.sidebar);

        // Show Renew/Upgrade button,
        // if account is holding one user free plan or
        // if account's expiry date within range of 30 days from today's date

        let upgrade_date = frappe.datetime.add_days(frappe.datetime.get_today(), 30);
        if (frappe.boot.limits.users === 1 || upgrade_date >= frappe.boot.limits.expiry) {
            let upgrade_box = $(`<div class="border" style="
					padding: 0px 10px;
					border-radius: 3px;
				">
				<a><i class="octicon octicon-x pull-right close" style="margin-top: 10px;"></i></a>
				<h5>Go Premium</h5>
				<p>Upgrade to a premium plan with more users, storage and priority support.</p>
				<button class="btn btn-xs btn-default" style="margin-bottom: 10px;"> Renew / Upgrade </button>
				</div>`).appendTo(upgrade_list);

            upgrade_box.find('.btn-primary').on('click', () => {
                frappe.set_route('usage-info');
            });

            upgrade_box.find('.close').on('click', () => {
                upgrade_list.remove();
                frappe.flags.upgrade_dismissed = 1;
            });
        }
    },
    get_cat_tags: function() {
        return this.cat_tags;
    },
    get_stats: function() {
        var me = this;
        frappe.call({
            method: 'frappe.desk.reportview.get_sidebar_stats',
            args: {
                stats: me.stats,
                doctype: me.doctype,
                filters: me.default_filters || []
            },
            callback: function(r) {
                me.defined_category = r.message;
                if (r.message.defined_cat) {
                    me.defined_category = r.message.defined_cat;
                    me.cats = {};
                    //structure the tag categories
                    for (var i in me.defined_category) {
                        if (me.cats[me.defined_category[i].category] === undefined) {
                            me.cats[me.defined_category[i].category] = [me.defined_category[i].tag];
                        } else {
                            me.cats[me.defined_category[i].category].push(me.defined_category[i].tag);
                        }
                        me.cat_tags[i] = me.defined_category[i].tag;
                    }
                    me.tempstats = r.message.stats;

                    $.each(me.cats, function(i, v) {
                        me.render_stat(i, (me.tempstats || {})["_user_tags"], v);
                    });
                    me.render_stat("_user_tags", (me.tempstats || {})["_user_tags"]);
                } else {
                    //render normal stats
                    me.render_stat("_user_tags", (r.message.stats || {})["_user_tags"]);
                }
            }
        });
    },
    render_stat: function(field, stat, tags) {
        var me = this;
        var sum = 0;
        var stats = [];
        var label = frappe.meta.docfield_map[this.doctype][field] ?
            frappe.meta.docfield_map[this.doctype][field].label : field;

        stat = (stat || []).sort(function(a, b) { return b[1] - a[1]; });
        $.each(stat, function(i, v) { sum = sum + v[1]; });

        if (tags) {
            for (var t in tags) {
                var nfound = -1;
                for (var i in stat) {
                    if (tags[t] === stat[i][0]) {
                        stats.push(stat[i]);
                        nfound = i;
                        break;
                    }
                }
                if (nfound < 0) {
                    stats.push([tags[t], 0]);
                } else {
                    me.tempstats["_user_tags"].splice(nfound, 1);
                }
            }
            field = "_user_tags";
        } else {
            stats = stat;
        }
        var context = {
            field: field,
            stat: stats,
            sum: sum,
            label: field === '_user_tags' ? (tags ? __(label) : __("Tags")) : __(label),
        };
        $(frappe.render_template("list_sidebar_stat", context))
            .on("click", ".stat-link", function() {
                var fieldname = $(this).attr('data-field');
                var label = $(this).attr('data-label');
                if (label == "No Tags") {
                    me.list_view.filter_list.add_filter(me.list_view.doctype, fieldname, 'not like', '%,%');
                    me.list_view.run();
                } else {
                    me.set_filter(fieldname, label);
                }
            })
            .insertBefore(this.sidebar.find(".close-sidebar-button"));
    },
    set_fieldtype: function(df) {

        // scrub
        if (df.fieldname == "docstatus") {
            df.fieldtype = "Select",
                df.options = [
                    { value: 0, label: "Draft" },
                    { value: 1, label: "Submitted" },
                    { value: 2, label: "Cancelled" },
                ];
        } else if (df.fieldtype == 'Check') {
            df.fieldtype = 'Select';
            df.options = [{ value: 0, label: 'No' },
                { value: 1, label: 'Yes' }
            ];
        } else if (['Text', 'Small Text', 'Text Editor', 'Code', 'Tag', 'Comments',
                'Dynamic Link', 'Read Only', 'Assign'
            ].indexOf(df.fieldtype) != -1) {
            df.fieldtype = 'Data';
        } else if (df.fieldtype == 'Link' && this.$w.find('.condition').val() != "=") {
            df.fieldtype = 'Data';
        }
        if (df.fieldtype === "Data" && (df.options || "").toLowerCase() === "email") {
            df.options = null;
        }
    },
    reload_stats: function() {
        this.sidebar.find(".sidebar-stat").remove();
        this.get_stats();
    },
    get_divider: function() {
        return $('<li role="separator" class="divider"></li>');
    }
});