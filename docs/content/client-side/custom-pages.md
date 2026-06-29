---
title: Custom Pages
---

# Custom Pages

Every screen in the Desk is rendered inside a `frappe.ui.Page` object. When you create a Page doctype, Frappe loads its JavaScript file and calls `on_page_load` with the page wrapper. Inside that handler you build a `frappe.ui.Page` and add your own content, buttons, and form fields.

```javascript
frappe.pages["my-page"].on_page_load = function (wrapper) {
  let page = frappe.ui.make_app_page({
    parent: wrapper,
    title: "My Page",
    single_column: true,
  });

  page.set_primary_action(__("New"), () => create_new());
};
```

## frappe.ui.make_app_page

Creates a Page and attaches it to a parent element.

```javascript
let page = frappe.ui.make_app_page({
  parent: wrapper, // DOM element or jQuery object
  title: "My Page",
  single_column: true, // create a page without the sidebar column
});
```

The instance returned is your handle for everything below.

## Title and subtitle

Use `set_title` to set the page heading. This also updates the browser tab title.

```javascript
page.set_title("My Page");
```

Use `set_title_sub` to show secondary text next to the heading.

```javascript
page.set_title_sub("Subtitle");
```

## Indicator

`set_indicator` shows a colored status dot with a label.

```javascript
page.set_indicator(__("Pending"), "orange");
```

`clear_indicator` removes it.

```javascript
page.clear_indicator();
```

## Primary and secondary actions

`set_primary_action(label, click, icon, working_label)` adds the main button at
the top right. The `icon` shows in mobile view, and `working_label` is the text
shown while the click handler runs. It returns the button element.

```javascript
let btn = page.set_primary_action(__("New"), () => create_new(), "add");
```

`set_secondary_action` takes the same arguments and adds a second button beside it.

```javascript
page.set_secondary_action(__("Refresh"), () => refresh(), "refresh");
```

Clear either one with `clear_primary_action()` or `clear_secondary_action()`.

## Menu and action items

`add_menu_item(label, click, standard)` adds an item to the Menu dropdown. Pass
`true` for `standard` to keep the item across page reloads in developer mode.

```javascript
page.add_menu_item(__("Send Email"), () => open_email_dialog());
```

`add_action_item(label, click, standard)` adds an item to the Actions dropdown.

```javascript
page.add_action_item(__("Delete"), () => delete_items());
```

Remove the dropdowns with `clear_menu()` and `clear_actions_menu()`.

## Inner buttons

`add_inner_button(label, action, group, type, align_right)` adds a button to the
inner toolbar. Pass a `group` to place it inside a dropdown group, and `type` to
set the button style.

```javascript
// standalone button
page.add_inner_button(__("Update Posts"), () => update_posts());

// button inside a "Make" group
page.add_inner_button(__("New Post"), () => new_post(), "Make");
```

`change_inner_button_type(label, group, type)` restyles an existing button. Pass
`null` for the group of an ungrouped button.

```javascript
page.change_inner_button_type("Update Posts", null, "primary");
page.change_inner_button_type("Delete Posts", "Actions", "danger");
```

`remove_inner_button(label, group)` removes a single button, and
`clear_inner_toolbar()` removes the whole toolbar.

```javascript
page.remove_inner_button("Update Posts");
page.remove_inner_button("New Post", "Make");
```

## Page form fields

`add_field(df)` adds a form control to the page form area. It takes a fieldtype
definition, the same shape used elsewhere in Frappe, and returns the control.

```javascript
let field = page.add_field({
  label: "Status",
  fieldtype: "Select",
  fieldname: "status",
  options: ["Open", "Closed", "Cancelled"],
  change() {
    console.log(field.get_value());
  },
});
```

`get_form_values()` returns all field values as an object keyed by fieldname.

```javascript
let values = page.get_form_values();
// { status: "Open", priority: "Low" }
```

`clear_fields()` removes all fields from the form area.

```javascript
page.clear_fields();
```
