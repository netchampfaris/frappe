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

To ship these customizations with your app (so they're created on install/migrate), export them as fixtures. See [Shipping customizations with fixtures](#shipping-customizations-with-fixtures) below.

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

## Shipping customizations with fixtures

Customize Form changes live as data in one site. To carry them into other sites, export the underlying records as **fixtures**: data dumped to JSON files in your app that Frappe re-imports on install and migrate.

List the DocTypes to export in your app's `hooks.py`:

```python
# customizations as fixtures
fixtures = ["Custom Field", "Property Setter"]
```

Export them from a site that has the customizations:

```bash
bench --site mysite export-fixtures
```

This writes one JSON file per DocType into a `fixtures/` folder in your app (for example `fixtures/custom_field.json`). Commit these files. When the app is installed on a new site, or when you run `bench migrate`, the fixtures are imported automatically, overwriting existing records with the same name.

To export only some records, use a dict with `filters` (or `or_filters`) instead of a plain DocType name:

```python
fixtures = [
    "Property Setter",
    {"doctype": "Custom Field", "filters": [["dt", "in", ["Customer", "Sales Order"]]]},
]
```

You can also ship single DocTypes (like `Website Settings`) as fixtures to carry their saved values across sites.

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
