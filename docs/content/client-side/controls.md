---
title: Controls
---

# Controls

A control is the rendered input for one field. On a form, every field has a control object, and they all live in `frm.fields_dict`, keyed by fieldname. You reach a control when you need to do something the `frm` helpers do not cover, like focusing an input, reading the raw DOM, or working with a child table's grid.

```javascript
frappe.ui.form.on("Task", {
  refresh(frm) {
    // focus the subject input
    frm.fields_dict.subject.$input.focus();
  },
});
```

## fields_dict

`frm.fields_dict[fieldname]` is the control. `frm.get_field(fieldname)` returns the same object. The control type matches the field's fieldtype, for example a Data field gives a `ControlData` and a Link field gives a `ControlLink`. Useful properties on a control:

- `df`: the docfield definition (label, fieldtype, options, reqd, and so on).
- `value`: the current value.
- `$wrapper`: the jQuery element wrapping the whole control.
- `$input`: the jQuery `<input>` element, for text-like controls.

Useful methods:

- `get_value()`: read the current value from the control.
- `set_value(value)`: set the value (validates and writes to the model). Returns a promise.
- `refresh()`: redraw the control from the model value.
- `set_focus()`: move focus into the control.
- `get_status()`: returns `"Write"`, `"Read"`, or `"None"` based on permissions and field state.

```javascript
let field = frm.get_field("priority");
field.df.label; // "Priority"
field.get_value(); // "High"
field.set_focus();
```

Prefer the `frm` methods when they exist. Use `frm.set_value` over `field.set_value`, and `frm.set_df_property` over writing to `field.df` directly, because the `frm` methods also run change handlers and refresh dependent fields. See [Form API](/client-side/form-api).

## Child table grids

For a Table field, the control has a `grid` object. The grid manages the rows shown in the form.

```javascript
let grid = frm.fields_dict.items.grid;
grid.get_selected_children(); // selected row docs
grid.add_new_row(); // append an empty row
grid.refresh(); // redraw the grid

// get the control for a field inside a grid row
let row = grid.grid_rows[0];
let qty_control = row.get_field("qty");
```

`frm.get_selected()` returns the selected child rows across all tables, grouped by table fieldname.

## Creating controls outside a form

On a custom Desk page or anywhere you control the DOM, build a standalone control with `frappe.ui.form.make_control`. Pass a docfield-like `df` and a `parent` element, then call `refresh()`.

```javascript
let control = frappe.ui.form.make_control({
  df: {
    fieldtype: "Link",
    fieldname: "customer",
    label: __("Customer"),
    options: "Customer",
  },
  parent: $("#my-container").get(0),
  render_input: true,
});
control.refresh();

control.get_value(); // read what the user entered
control.set_value("ACME"); // set it
```

The `df` accepts the same properties as a field in a DocType, so you can use `options`, `reqd`, `default`, `get_query` for Link filters, and `change` for a callback when the value changes.

```javascript
let control = frappe.ui.form.make_control({
  df: {
    fieldtype: "Select",
    fieldname: "status",
    options: ["Open", "Closed"],
    change() {
      console.log(control.get_value());
    },
  },
  parent: wrapper,
  render_input: true,
});
control.refresh();
```

To group several controls together (for example to read them as one set of values), use `frappe.ui.FieldGroup`, which is the same base that powers dialogs. See [Dialog API](/client-side/dialog-api).

## Field type properties

The `df` you pass to `make_control` takes the same properties as a docfield. Some field types read extra properties:

```javascript
// Code: syntax highlight and sizing
{
  fieldtype: "Code",
  fieldname: "script",
  // valid options: Javascript, JS, Python, Py, PythonExpression,
  // HTML, CSS, Markdown, SCSS, JSON, Golang, Go, Jinja, SQL
  options: "Javascript",
  wrap: true, // wrap long lines
  min_lines: 5, // editor min height in lines
  max_lines: 20, // editor max height in lines
}

// Currency: options is a currency code or the fieldname holding the currency
{
  fieldtype: "Currency",
  fieldname: "amount",
  options: "USD",
}

// Data: options picks a validated input format
{
  fieldtype: "Data",
  fieldname: "contact",
  // Email, Phone, URL, Name, Barcode, IBAN
  options: "Email",
}

// Dynamic Link: options is the fieldname holding the linked DocType
{
  fieldtype: "Dynamic Link",
  fieldname: "party",
  options: "party_type",
}

// MultiCheck: columns is a fixed number, or "min-width max-columns"
{
  fieldtype: "MultiCheck",
  fieldname: "tags",
  options: ["Open", "Closed", "Cancelled"],
  columns: 2,
}

// Rating: options sets the number of stars (default 5)
{
  fieldtype: "Rating",
  fieldname: "rating",
  options: 5,
}

// Icon: set options to "Emojis" to include emojis in the picker
{
  fieldtype: "Icon",
  fieldname: "page_icon",
  options: "Emojis",
}

// Button: btn_size is xs, sm, or lg (default xs)
{
  fieldtype: "Button",
  fieldname: "fetch",
  btn_size: "sm",
}
```

## Link field formatters

A Link field shows the linked record's `name`. To show more, like a code plus a descriptive name, register a formatter under `frappe.form.link_formatters` keyed by the DocType. It runs wherever that Link value is displayed.

```javascript
frappe.form.link_formatters["Employee"] = function (value, doc, docfield) {
  // value is the linked name; doc is the row holding the link
  if (doc.employee_name && doc.employee_name !== value) {
    return value + ": " + doc.employee_name;
  }
  return value;
};
```

The descriptive field (here `employee_name`) must be present on the document for the formatter to use it; it can be a hidden field. Frappe ships a built-in formatter for `User` that shows the full name. Load your formatter once, for example from an app's bundle, and it applies to every form.
