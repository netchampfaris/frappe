---
title: Web Form Customization
---

# Web Form Customization

When the built-in Web Form options are not enough, you can add a client script for behavior and custom CSS for styling. Both are edited from the Web Form itself.

## Client Script

Open the Web Form and put JavaScript in the "Client Script" field. The form exposes itself as `frappe.web_form`, and your script runs after the form is built (`frappe.init_client_script` is called from `make()` in `web_form.js`). The form object extends `frappe.ui.FieldGroup`, so you get the usual field helpers.

```javascript
frappe.ready(() => {
    // react to a field change
    frappe.web_form.on("country", (field, value) => {
        frappe.web_form.set_df_property("state", "hidden", value !== "India");
    });
});
```

Common methods on `frappe.web_form`:

- `get_value(fieldname)` and `get_values()`: read field values.
- `set_value(fieldname, value)`: set a value.
- `set_df_property(fieldname, property, value)`: change a field at runtime, for example `"hidden"`, `"reqd"`, or `"read_only"`.
- `on(fieldname, handler)`: run a handler when a field changes. The handler receives the field and its value.

## Validation

Set `frappe.web_form.validate` to a function that returns a falsy value to block the save. It runs in `save()` before the record is sent.

```javascript
frappe.web_form.validate = () => {
    let data = frappe.web_form.get_values();
    if (data.end_date < data.start_date) {
        frappe.msgprint(__("End date cannot be before start date"));
        return false;
    }
    return true;
};
```

## Events and hooks

The form emits events you can subscribe to, and supports two lifecycle callbacks.

```javascript
// run after the form loads
frappe.web_form.events.on("after_load", () => {
    console.log("form ready");
});

// run after a successful save
frappe.web_form.after_save = () => {
    frappe.msgprint(__("Thanks!"));
};
```

`after_save` is called in `save()` once the record is stored, and the `after_save` event fires alongside it.

## Standard Web Form scripts

A standard Web Form (created in developer mode with "Is Standard" on) keeps its code on disk in the app, next to the exported JSON. Frappe writes a `.js` and `.py` file the first time you save it.

The `.py` file can define `get_context(context)` to add server-side context, which `add_custom_context_and_script()` merges in.

```python
# your_app/your_app/doctype/web_form/support_ticket/support_ticket.py
import frappe

def get_context(context):
    context.categories = frappe.get_all("Ticket Category", pluck="name")
```

The `.js` file is rendered as a template and injected as the page script, so the same `frappe.web_form` API applies there.

## Styling

Put CSS in the "Custom CSS" field on the Web Form. It is added to the page as a style block, scoped to that form's page. The form markup gives you classes to target, like `.web-form-wrapper`, `.web-form`, and `.web-form-footer`.

```css
.web-form-wrapper {
    max-width: 640px;
    margin: 0 auto;
}

.web-form .form-section {
    margin-bottom: 2rem;
}
```

For a standard Web Form, a `.css` file with the form's scrubbed name in its app folder is picked up the same way (`add_custom_context_and_script()` reads it).

## Including code app-wide

To inject JS or CSS into web forms across an app (not just one form), use the `webform_include_js` and `webform_include_css` hooks. They are keyed by DocType, with `*` matching every form. The files are rendered with the form context and appended to the form's own script and style.

```python
# your_app/hooks.py
webform_include_js = {"Support Ticket": "public/js/support_ticket_web_form.js"}
webform_include_css = {"Support Ticket": "public/css/support_ticket_web_form.css"}
```
