---
title: Dialog API
---

# Dialog API

Frappe gives you a few ways to show modals and messages from client code. For a quick message or a yes/no question, use `frappe.msgprint` and `frappe.confirm`. For a one-off form, use `frappe.prompt`. For a custom modal with several fields and your own buttons, build a `frappe.ui.Dialog`.

```javascript
frappe.confirm(__("Delete this task?"), () =>
  frappe.db.delete_doc("Task", "TASK-0001"),
);
```

## frappe.msgprint

`frappe.msgprint(message, title)` shows a message in a modal. Pass a string, or an object for more control.

```javascript
frappe.msgprint(__("Saved successfully"));

frappe.msgprint({
  title: __("Heads up"),
  message: __("This task is overdue."),
  indicator: "red",
});
```

For a brief non-blocking toast instead of a modal, use `frappe.show_alert(message, seconds)`:

```javascript
frappe.show_alert({ message: __("Copied"), indicator: "green" }, 5);
```

`frappe.throw(message)` shows an error message and stops execution by throwing. Use it in validation:

```javascript
if (!frm.doc.subject) {
  frappe.throw(__("Subject is required"));
}
```

## frappe.confirm

`frappe.confirm(message, on_yes, on_no)` asks a yes/no question and runs the matching callback.

```javascript
frappe.confirm(
  __("Submit this invoice?"),
  () => frm.save("Submit"),
  () => console.log("cancelled"),
);
```

`frappe.warn(title, message_html, on_proceed, primary_label, minimizable)` is similar but styled as a warning, with a red primary button. The message can be HTML. Set `minimizable` to let the user shrink the dialog instead of answering right away.

```javascript
frappe.warn(
  __("Are you sure you want to proceed?"),
  __("There are unsaved changes on this page."),
  () => frm.reload_doc(),
  __("Proceed"),
  true, // minimizable
);
```

## frappe.prompt

`frappe.prompt(fields, callback, title, primary_label)` opens a dialog of input fields and gives you the entered values. Pass a single field, an array of fields, or a string for one Data field.

```javascript
frappe.prompt(
  [
    {
      fieldname: "reason",
      fieldtype: "Small Text",
      label: __("Reason"),
      reqd: 1,
    },
    { fieldname: "notify", fieldtype: "Check", label: __("Notify owner") },
  ],
  (values) => {
    console.log(values.reason, values.notify);
  },
  __("Close Task"),
  __("Submit"),
);
```

Each field uses the same docfield shape as a DocType field: `fieldtype`, `fieldname`, `label`, `options`, `reqd`, and `default`.

## frappe.ui.Dialog

For full control, build a `frappe.ui.Dialog`. It holds its own set of fields (it extends `frappe.ui.FieldGroup`) and lets you define the primary and secondary buttons.

```javascript
let d = new frappe.ui.Dialog({
  title: __("Assign Task"),
  fields: [
    {
      label: __("Assign To"),
      fieldname: "user",
      fieldtype: "Link",
      options: "User",
      reqd: 1,
    },
    {
      label: __("Comment"),
      fieldname: "comment",
      fieldtype: "Small Text",
    },
  ],
  primary_action_label: __("Assign"),
  primary_action(values) {
    console.log(values.user, values.comment);
    d.hide();
  },
});

d.show();
```

The `primary_action` callback receives the dialog values. Useful methods on the dialog:

- `show()` and `hide()`: open and close it.
- `get_values()`: read all field values as an object (returns nothing if a required field is empty).
- `get_value(fieldname)` and `set_value(fieldname, value)`: read or write one field.
- `set_df_property(fieldname, property, value)`: change a field property at runtime, like `options` or `hidden`.
- `get_field(fieldname)`: get the control object for a field. See [Controls](/client-side/controls).
- `set_primary_action(label, fn)` and `set_secondary_action(fn)`: set the buttons after construction.

```javascript
// react to a field change inside the dialog
let user_field = d.get_field("user");
user_field.df.onchange = () => {
  let user = d.get_value("user");
  d.set_df_property("comment", "hidden", !user);
};
```

The `size` option accepts `"small"`, `"large"`, or `"extra-large"`. Set `static: true` to stop the dialog from closing when the backdrop is clicked.

## frappe.new_doc

`frappe.new_doc(doctype, route_options, init_callback)` opens a new document. If Quick Entry is enabled for the DocType, a Quick Entry dialog opens with the important fields. Otherwise it routes to the full form.

```javascript
frappe.new_doc("Task");
```

`route_options` is an object of field values to pre-fill. It sets any field on the new document, except fields marked `no_copy`.

```javascript
frappe.new_doc("Task", { subject: "New Task" });
```

`init_callback` runs once just before the user can edit the new document. For a Quick Entry form it receives the dialog object; for the full form it receives the new doc. Use it to set fields that `route_options` cannot, such as child table rows.

```javascript
frappe.new_doc("Task", { subject: "New Task" }, (doc) => {
  doc.description = "Do what's necessary";
});
```

`frappe.new_doc` returns a Promise that resolves once the form or dialog is ready.

## frappe.ui.form.MultiSelectDialog

A MultiSelectDialog shows filter fields above a checkbox list of documents. The user filters, selects rows, and your `action` runs with the selected names. It is handy for pulling records from one DocType into another.

```javascript
new frappe.ui.form.MultiSelectDialog({
  doctype: "Material Request",
  target: cur_frm,
  setters: {
    schedule_date: null,
    status: "Pending",
  },
  add_filters_group: 1,
  get_query() {
    return {
      filters: { docstatus: ["!=", 2] },
    };
  },
  action(selections) {
    console.log(selections); // array of selected document names
  },
});
```

Options:

- `doctype`: the source DocType to list. Use `"[Select]"` to list passed-in values instead of a DocType.
- `target`: the form or object the dialog acts on.
- `setters`: an object (or array of docfields) that becomes filter fields. The keys also show up as columns in the list. Values seed the initial filter.
- `add_filters_group`: set to `1` to add the same filter builder used in list view, below the setters.
- `get_query`: a function returning `{ query, filters }`. `filters` narrows the list. `query` is a dotted path to a server method that returns the rows.
- `primary_action_label`: label for the primary button. Defaults to "Get Items".
- `action(selections, args)`: runs on the primary button with the array of selected names.

To use a custom server method, pass it as `query` in `get_query`:

```javascript
new frappe.ui.form.MultiSelectDialog({
  doctype: "Material Request",
  target: cur_frm,
  setters: { status: null },
  get_query() {
    return {
      query: "dotted.path.to.method",
      filters: { docstatus: ["!=", 2], supplier: "John Doe" },
    };
  },
  action(selections) {
    console.log(selections);
  },
});
```

The secondary button is labelled "Make {DocType}" and routes to a new document of that DocType.

### Selecting child rows

Set `allow_child_item_selection: 1` with a `child_fieldname` to let the user pick individual child rows instead of whole parent documents. `child_columns` lists the child fields to show.

```javascript
new frappe.ui.form.MultiSelectDialog({
  doctype: "Material Request",
  target: cur_frm,
  setters: { status: null },
  add_filters_group: 1,
  allow_child_item_selection: 1,
  child_fieldname: "items", // child table fieldname
  child_columns: ["item_code", "qty"], // child fields to show
  get_query() {
    return {
      filters: { docstatus: ["!=", 2] },
    };
  },
  action(selections, args) {
    console.log(args.filtered_children); // selected child row names
  },
});
```

The dialog shows a "Select Individual Items" checkbox. When toggled on, it lists the child rows from the queried parents so the user can filter and pick them. The selected child names come back in `args.filtered_children` in the `action` callback.
