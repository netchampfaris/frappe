---
title: Customization
---

# Customization

Frappe lets you extend and tweak DocTypes **without editing their source JSON**. This matters when the DocType belongs to another app (like Frappe or ERPNext) and you want your changes to survive upgrades. The main tool is **Customize Form**, which stores your changes as data in your site and applies them on top of the standard schema at runtime.

## Customize Form

**Customize Form** is the UI for adding new fields to an existing DocType and overriding properties of its standard fields, all in one screen (Settings, then Customize Form, or the `Customize Form` DocType). Use it to:

- Add new fields and reorder fields.
- Make a field mandatory, hidden, read-only, or change its label.
- Change DocType-level options like the title field, search fields, sort order, and whether it's submittable or allows rename.

Behind the scenes Customize Form writes **Property Setters** (for property overrides) and **Custom Fields** (for new fields). It never modifies the original DocType JSON.

To ship these customizations with your app (so they're created on install/migrate), declare the `Custom Field` and `Property Setter` records in `hooks.py` via `fixtures`. See [Hooks](/server-side/hooks).

## Property Setters

A **Property Setter** overrides a single property of a DocType or one of its fields. This is the low-level mechanism Customize Form uses, and you can create them directly.

```python
import frappe

# Make the Customer's `customer_name` field mandatory
frappe.make_property_setter({
    "doctype": "Customer",
    "fieldname": "customer_name",
    "property": "reqd",
    "value": 1,
    "property_type": "Check",
})
```

Without a `fieldname`, the property applies to the DocType itself:

```python
# Override a DocType-level property (no fieldname)
frappe.make_property_setter({
    "doctype": "Customer",
    "doctype_or_field": "DocType",
    "property": "search_fields",
    "value": "customer_name,customer_group",
    "property_type": "Data",
})
```

Each Property Setter targets exactly one property; create one per override.

## Which tool to use

| Goal                                                         | Use                                                            |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| Add a field to an existing DocType                           | Customize Form                                                 |
| Change a property of a standard field (reqd, hidden, label…) | Customize Form, or a Property Setter directly                  |
| Add validation / business logic to another app's DocType     | `doc_events` in [Hooks](/server-side/hooks), not customization |

Customization changes **schema and properties**. To add **behaviour**, hook the lifecycle instead. See [Controllers & Lifecycle](/doctypes/controllers-lifecycle) and [Hooks](/server-side/hooks).

## See also

- [Fields](/doctypes/fields): properties you can override.
- [Hooks](/server-side/hooks): fixtures to ship customizations, and `doc_events` for behaviour.
