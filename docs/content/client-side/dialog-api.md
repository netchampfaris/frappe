---
title: Dialog API
---

# Dialog API

Frappe gives you a few ways to show modals and messages from client code. For a quick message or a yes/no question, use `frappe.msgprint` and `frappe.confirm`. For a one-off form, use `frappe.prompt`. For a custom modal with several fields and your own buttons, build a `frappe.ui.Dialog`.

```javascript
frappe.confirm(
    __("Delete this task?"),
    () => frappe.db.delete_doc("Task", "TASK-0001"),
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

`frappe.warn(title, message, on_proceed, primary_label, minimizable)` is similar but styled as a warning, with a red primary button.

## frappe.prompt

`frappe.prompt(fields, callback, title, primary_label)` opens a dialog of input fields and gives you the entered values. Pass a single field, an array of fields, or a string for one Data field.

```javascript
frappe.prompt(
    [
        { fieldname: "reason", fieldtype: "Small Text", label: __("Reason"), reqd: 1 },
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
