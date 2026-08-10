---
title: Child Tables
---

# Child Tables

A **child table** lets a document hold a list of rows: line items on an invoice, addresses on a customer, tasks in a project. It is made of two pieces: a **child DocType** that defines the columns of each row, and a **Table** field on the parent that embeds the rows.

## The child DocType

A child DocType is an ordinary DocType with the `istable` flag set to `1`. It has its own database table but never has a form or list view. Its rows always belong to a parent.

```json
{
  "doctype": "DocType",
  "name": "Invoice Item",
  "istable": 1,
  "fields": [
    {
      "fieldname": "item",
      "label": "Item",
      "fieldtype": "Link",
      "options": "Item"
    },
    { "fieldname": "qty", "label": "Qty", "fieldtype": "Float" },
    { "fieldname": "rate", "label": "Rate", "fieldtype": "Currency" }
  ]
}
```

Each child row carries three extra system fields linking it back to its parent:

| Field         | Meaning                                                |
| ------------- | ------------------------------------------------------ |
| `parent`      | `name` of the parent document.                         |
| `parenttype`  | DocType of the parent.                                 |
| `parentfield` | The Table fieldname on the parent that holds this row. |

These let the same child DocType be reused by multiple parents.

## The Table field

On the parent, add a field of type `Table` (or `Table MultiSelect`) whose `options` points at the child DocType.

```json
{
  "fieldname": "items",
  "label": "Items",
  "fieldtype": "Table",
  "options": "Invoice Item"
}
```

- **`Table`** renders a full editable grid, the usual line-items experience.
- **`Table MultiSelect`** renders a tag-style multi-select, useful when each row references one document.

## Working with child rows in Python

Child rows are a list of documents on the parent. Use `append` to add rows and save the parent. Frappe inserts, updates and deletes the child rows for you.

```python
invoice = frappe.new_doc("Invoice")
invoice.customer = "ACME"

# Append a row to the `items` child table
invoice.append("items", {
    "item": "Widget",
    "qty": 5,
    "rate": 100,
})

invoice.insert()

# Iterate over rows
for row in invoice.items:
    print(row.item, row.qty, row.idx)
```

`row.idx` is the 1-based position of the row. You never insert or delete child documents directly. They are synced when the parent is saved (`update_children` in the controller logic).

To remove rows, reassign or filter the list and save the parent:

```python
invoice.items = [r for r in invoice.items if r.qty > 0]
invoice.save()
```

## Validating child tables

Child rows are validated together with the parent. Common helpers on the parent controller:

```python
from frappe.model.document import Document

class Invoice(Document):
    def validate(self):
        # Throw if the table is empty
        self.validate_table_has_rows("items")

        total = 0
        for row in self.items:
            row.amount = row.qty * row.rate
            total += row.amount
        self.total = total
```

A child DocType can also have its own controller with field-level validation, but parent-level lifecycle hooks (`on_submit`, etc.) only fire on the parent. See [Controllers & Lifecycle](/doctypes/controllers-lifecycle).

## See also

- [Fields](/doctypes/fields): the Table and Table MultiSelect field types.
- [Controllers & Lifecycle](/doctypes/controllers-lifecycle): validating rows on save.
