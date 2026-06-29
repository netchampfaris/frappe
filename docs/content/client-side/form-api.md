---
title: Form API
---

# Form API

Form scripts run in the browser when a user opens a record in Desk. The entry point is `frappe.ui.form.on`, which registers handlers against a DocType. Every handler receives the form object, `frm`, which holds the current document and methods to read and change it.

```javascript
frappe.ui.form.on("Task", {
    refresh(frm) {
        frm.add_custom_button("Mark Done", () => {
            frm.set_value("status", "Completed");
            frm.save();
        });
    },
});
```

## frappe.ui.form.on

`frappe.ui.form.on(doctype, eventname, handler)` attaches a handler. The handler is called with `(frm)` for form-level events, and with `(frm, cdt, cdn)` for child table events, where `cdt` is the child DocType and `cdn` is the child row name.

You can register many events at once by passing a dict:

```javascript
frappe.ui.form.on("Task", {
    refresh(frm) {
        // form is loaded or refreshed
    },
    status(frm) {
        // the "status" field changed
    },
    validate(frm) {
        // runs before save, throw to stop the save
        if (!frm.doc.subject) {
            frappe.throw(__("Subject is required"));
        }
    },
});
```

Common form events are `setup` (once, before the form is first drawn), `onload` (each time a record is loaded), `refresh` (after the form renders), `validate` and `before_save` (before save), `after_save`, and any `fieldname` (when that field's value changes). For a child table, register against the child DocType:

```javascript
frappe.ui.form.on("Task Item", {
    qty(frm, cdt, cdn) {
        let row = frappe.get_doc(cdt, cdn);
        frappe.model.set_value(cdt, cdn, "amount", row.qty * row.rate);
    },
    items_add(frm, cdt, cdn) {
        // a new row was added to the "items" table
    },
});
```

The child table add and remove events are named `<fieldname>_add` and `<fieldname>_remove`, registered on the parent DocType.

## The frm object

`frm.doc` is the current document, a plain object with the field values. Child tables are arrays on `frm.doc`. `frm.doctype` and `frm.docname` identify the record. `frm.is_new()` is true for an unsaved record, and `frm.is_dirty()` is true when there are unsaved changes.

### set_value

`frm.set_value(fieldname, value)` updates a field, runs its change handler, and marks the form dirty. It returns a promise. Pass an object to set several fields at once:

```javascript
frm.set_value("status", "Completed");

frm.set_value({
    status: "Completed",
    completed_on: frappe.datetime.now_date(),
});
```

To set a value on a child row, use `frappe.model.set_value(cdt, cdn, fieldname, value)`.

### add_child

`frm.add_child(fieldname, values)` adds a row to a child table and returns the new row object. Call `frm.refresh_field` afterwards to redraw the grid:

```javascript
let row = frm.add_child("items", {
    item_code: "Pen",
    qty: 2,
});
frm.refresh_field("items");
```

`frm.clear_table(fieldname)` empties a child table.

### refresh_field

`frm.refresh_field(fieldname)` redraws a single field from the current document value. Use it after changing data directly on `frm.doc` or after adding child rows, since those changes do not redraw the field on their own.

### set_df_property

`frm.set_df_property(fieldname, property, value)` changes a property of a field's docfield at runtime, such as its label, options, or read-only state, then refreshes the field.

```javascript
frm.set_df_property("priority", "options", "Low\nMedium\nHigh");
frm.set_df_property("description", "reqd", 1);
frm.set_df_property("amount", "read_only", 1);
```

For a field in a child table, pass the grid field name, the child fieldname, and the row name:

```javascript
frm.set_df_property("items", "read_only", 1, frm.doc.name, "rate", row.name);
```

There are shortcuts for the most common toggles. Each accepts one fieldname or an array:

```javascript
frm.toggle_display("completed_on", frm.doc.status === "Completed");
frm.toggle_enable(["status", "priority"], !frm.is_new());
frm.toggle_reqd("description", frm.doc.status === "Cancelled");
```

### Buttons and messages

`frm.add_custom_button(label, action, group)` adds a button to the form toolbar. Pass a `group` name to nest buttons under a dropdown. `frm.clear_custom_buttons()` removes them, and `frm.remove_custom_button(label, group)` removes one.

```javascript
frm.add_custom_button(__("Create Invoice"), () => {
    frappe.new_doc("Sales Invoice", { customer: frm.doc.customer });
}, __("Create"));
```

`frm.set_intro(text, color)` shows a message banner at the top of the form. Colors are indicator names like `"blue"`, `"orange"`, or `"red"`.

```javascript
if (frm.doc.status === "Overdue") {
    frm.set_intro(__("This task is overdue"), "red");
}
```

### Link field queries

`frm.set_query(fieldname, query)` filters the options shown in a Link field. The query function returns a `filters` object (or a `query` plus `filters`). It is usually set in `setup` or `onload`.

```javascript
frm.set_query("project", () => {
    return {
        filters: { status: "Open" },
    };
});
```

For a Link field inside a child table, pass the child table fieldname first:

```javascript
frm.set_query("item_code", "items", (doc, cdt, cdn) => {
    return { filters: { is_sales_item: 1 } };
});
```

### Saving and reloading

`frm.save()` saves the document. Pass an action to submit or cancel: `frm.save("Submit")`, `frm.save("Cancel")`, or `frm.save("Update")` for a submitted document. `frm.reload_doc()` reloads the record from the server and discards unsaved changes.

### Calling server methods

`frm.call(method, args, callback)` calls a whitelisted method on the document's controller and refreshes the form when it returns.

```javascript
frm.call("recalculate_totals").then((r) => {
    // frm is already refreshed with the server's changes
});
```

For general server calls that are not tied to the document, see [Server Calls](/client-side/server-calls).

## fields_dict

`frm.fields_dict` maps each fieldname to its control object. This is how you reach the rendered control, for example to read a child table's grid or set focus. See [Controls](/client-side/controls) for what these control objects expose.

```javascript
let grid = frm.fields_dict.items.grid;
frm.fields_dict.subject.$input.focus();
```
