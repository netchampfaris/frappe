---
title: Customization
---

# Customization

Frappe lets you extend and tweak DocTypes **without editing their source JSON**. This matters when the DocType belongs to another app (like Frappe or ERPNext) and you want your changes to survive upgrades. There are three tools: **Custom Fields**, **Customize Form**, and **Property Setters**. All of them are stored as data in your site and applied on top of the standard schema at runtime.

## Custom Fields

A **Custom Field** adds a new field to an existing DocType. It's a record of the `Custom Field` DocType.

```python
import frappe

frappe.get_doc({
    "doctype": "Custom Field",
    "dt": "Customer",              # the DocType to extend
    "fieldname": "loyalty_tier",
    "label": "Loyalty Tier",
    "fieldtype": "Select",
    "options": "Bronze\nSilver\nGold",
    "insert_after": "customer_name"
}).insert()
```

`insert_after` controls where the field appears in the form. The new column is added to the DocType's table, and the field behaves exactly like a standard one.

To ship custom fields with your app (so they're created on install/migrate), declare them in `hooks.py` via `fixtures`, or create them in a patch. See [Hooks](/server-side/hooks).

## Customize Form

**Customize Form** is the UI for overriding properties of an existing DocType's standard fields and adding custom fields, all in one screen (Settings, then Customize Form, or the `Customize Form` DocType). Use it to:

- Make a field mandatory, hidden, read-only, or change its label.
- Reorder fields and add Custom Fields.
- Change DocType-level options like the title field, search fields, sort order, and whether it's submittable or allows rename.

Behind the scenes Customize Form writes **Property Setters** (for property overrides) and **Custom Fields** (for new fields). It never modifies the original DocType JSON.

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

| Goal | Use |
|------|-----|
| Add a field to an existing DocType | Custom Field |
| Change a property of a standard field (reqd, hidden, label…) | Property Setter (via Customize Form) |
| Do both interactively | Customize Form |
| Add validation / business logic to another app's DocType | `doc_events` in [Hooks](/server-side/hooks), not customization |

Customization changes **schema and properties**. To add **behaviour**, hook the lifecycle instead. See [Controllers & Lifecycle](/doctypes/controllers-lifecycle) and [Hooks](/server-side/hooks).

## See also

- [Fields](/doctypes/fields): properties you can override.
- [Hooks](/server-side/hooks): fixtures to ship customizations, and `doc_events` for behaviour.
