---
title: List View
---

# List View

You customize a DocType's list view by setting `frappe.listview_settings[doctype]` to an object of hooks. Put this in the DocType's list view script file, named `{doctype}_list.js` (for example `task_list.js`). This is a separate file from the [form script](/client-side/form-api), which is named `{doctype}.js`. Frappe reads these settings when it builds the list.

```javascript
frappe.listview_settings["Task"] = {
  add_fields: ["status", "priority"],
  get_indicator(doc) {
    if (doc.status === "Completed") {
      return [__("Completed"), "green", "status,=,Completed"];
    }
    return [__("Open"), "orange", "status,=,Open"];
  },
};
```

## get_indicator

`get_indicator(doc)` sets the colored status dot for each row. Return an array of `[label, color, filter]`. The `filter` string is applied when the user clicks the indicator. Colors are indicator names like `green`, `orange`, `red`, `blue`, and `gray`.

```javascript
get_indicator(doc) {
    let map = {
        Open: "orange",
        "In Progress": "blue",
        Completed: "green",
        Cancelled: "red",
    };
    return [__(doc.status), map[doc.status], "status,=," + doc.status];
}
```

## add_fields

The list only loads the fields it shows. If your `get_indicator` or `formatters` read a field that is not a list column, add it to `add_fields` so the value is available on `doc`.

```javascript
add_fields: ["status", "priority", "due_date"],
```

## onload and before_render

`onload(listview)` runs once when the list is set up. Use it to add buttons or set defaults. `before_render()` runs before each render pass.

```javascript
onload(listview) {
    listview.page.add_inner_button(__("Bulk Close"), () => {
        // do something with listview.get_checked_items()
    });
},
```

`listview` is the list view object. `listview.get_checked_items()` returns the rows the user selected, and `listview.refresh()` reloads the list.

## formatters

`formatters` is a map of fieldname to a function `(value, df, doc)` that returns the HTML shown in that column.

```javascript
formatters: {
    priority(value, df, doc) {
        let color = value === "High" ? "red" : "gray";
        return `<span class="indicator-pill ${color}">${value}</span>`;
    },
},
```

## button

`button` adds an action button to every row. Provide `show`, `get_label`, `get_description`, and `action`, each receiving the row `doc`.

```javascript
button: {
    show(doc) {
        return doc.status !== "Completed";
    },
    get_label() {
        return __("Mark Done");
    },
    get_description(doc) {
        return __("Complete {0}", [doc.name]);
    },
    action(doc) {
        frappe.db.set_value("Task", doc.name, "status", "Completed");
    },
},
```

For several actions per row, use `dropdown_button`, which takes a `get_label` and a `buttons` array, each entry shaped like the single `button`.

## get_form_link

`get_form_link(doc)` overrides where a row links to when clicked. Return a route string.

```javascript
get_form_link(doc) {
    return `/desk/task/${doc.name}`;
}
```

## Other settings

- `hide_name_column`: set true to hide the name column.
- `filters`: default filters applied when the list opens, as an array of `[fieldname, operator, value]`.
- `primary_action`: a function called by the list's primary button.

```javascript
filters: [["status", "=", "Open"]],
```
