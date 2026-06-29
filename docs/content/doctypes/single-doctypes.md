---
title: Single DocTypes
---

# Single DocTypes

A **Single DocType** has exactly one record. It is the right choice for settings and configuration pages. "System Settings", "Website Settings", "Selling Settings" are all singles. There is no list view; opening the DocType always opens the one document.

Set the `issingle` flag to `1` to make a DocType single.

```json
{
  "doctype": "DocType",
  "name": "Shop Settings",
  "issingle": 1,
  "fields": [
    {
      "fieldname": "currency",
      "label": "Default Currency",
      "fieldtype": "Link",
      "options": "Currency"
    },
    { "fieldname": "tax_rate", "label": "Tax Rate", "fieldtype": "Percent" }
  ]
}
```

## How singles are stored

A single does **not** get its own `tab<DocType>` table. Instead its values are stored as field/value rows in the shared `tabSingles` table. The document's `name` is always the DocType name (`"Shop Settings"` in the example above).

## Reading a single

Use `frappe.get_single` to load the document, or the cached helpers for read-only access (settings are read far more often than written, so prefer the cached versions in hot paths).

```python
import frappe

# Full document object (use when you need to modify it)
settings = frappe.get_single("Shop Settings")
print(settings.currency)

# Cached document, returns from cache if available
settings = frappe.get_cached_doc("Shop Settings")

# One cached field, the fastest way to read a setting
rate = frappe.get_single_value("Shop Settings", "tax_rate")
```

`frappe.get_single(doctype)` is equivalent to `frappe.get_doc(doctype, doctype)`. `frappe.get_single_value(doctype, fieldname)` returns a single cached field value.

## Writing a single

Load it, set fields and save like any other document. Saving rewrites the rows in `tabSingles`.

```python
settings = frappe.get_single("Shop Settings")
settings.tax_rate = 18
settings.save()
```

For a quick one-field update you can use `frappe.db.set_single_value`:

```python
frappe.db.set_single_value("Shop Settings", "tax_rate", 18)
```

## Controllers

Single DocTypes use the same `Document` controller and lifecycle hooks as any other DocType (`validate`, `on_update`, …). A common pattern is to clear caches in `on_update` so changed settings take effect immediately. See [Controllers & Lifecycle](/doctypes/controllers-lifecycle).

## See also

- [Overview](/doctypes/overview): how standard DocTypes map to tables.
- [Caching](/server-side/caching): why `get_cached_doc` and `get_single_value` are preferred for settings.
