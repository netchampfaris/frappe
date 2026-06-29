---
title: Links & Actions
tableFirstCol: 13rem
---

# Links & Actions

DocTypes connect to each other through **Link fields**. On top of that, the DocType form can surface related documents and custom buttons through **DocType Links** (connections) and **DocType Actions**. This page covers all three.

## Link fields

A `Link` field stores a reference to a document of a fixed DocType. Its `options` names the target.

```json
{
  "fieldname": "customer",
  "label": "Customer",
  "fieldtype": "Link",
  "options": "Customer"
}
```

The field stores the linked document's `name`. In the UI it becomes a searchable dropdown; in code it's the name string:

```python
doc.customer            # "CUST-0001"
customer = frappe.get_doc("Customer", doc.customer)
```

Link values are validated on save. If the referenced document doesn't exist, the save throws a `LinkValidationError`.

### Pulling data from a link

Combine a Link field with `fetch_from` to copy values off the linked document automatically. See [Fields](/doctypes/fields#fetch-from).

### Filtering link options

Use `link_filters` (or set filters in client script) to restrict which documents appear in the dropdown, for example only active customers.

## Dynamic Link fields

A **Dynamic Link** references a document whose DocType is decided at runtime by another field. You need two fields: one `Link` to "DocType" (or a Select of doctype names) that holds the target type, and the `Dynamic Link` whose `options` points at that field.

```json
[
  {
    "fieldname": "reference_doctype",
    "label": "Reference Type",
    "fieldtype": "Link",
    "options": "DocType"
  },
  {
    "fieldname": "reference_name",
    "label": "Reference Name",
    "fieldtype": "Dynamic Link",
    "options": "reference_doctype"
  }
]
```

Here `reference_name` links to a document of whatever DocType is in `reference_doctype`. This is how generic references like comments, ToDos and attachments point at any document.

## DocType Links (connections)

**DocType Links** populate the "Connections" tab on a form. They show counts of, and let you create, related documents that link back to the current one. They are stored in the `links` child table of the DocType.

A link entry has:

| Field | Meaning |
|-------|---------|
| `link_doctype` | The related DocType to show. |
| `link_fieldname` | The Link field on that DocType pointing back here. |
| `group` | Optional heading to group connections under. |
| `is_child_table` / `table_fieldname` | For relations that go through a child table. |

For example, on a Customer form a connection to "Sales Order" via its `customer` field lets you see and create that customer's orders without leaving the form.

## DocType Actions

**DocType Actions** add custom buttons to the form's Actions menu without writing client script. They live in the `actions` child table of the DocType. Each action has:

| Field | Meaning |
|-------|---------|
| `label` | Button text. |
| `group` | Optional submenu grouping. |
| `action_type` | `Server Action` or `Route`. |
| `action` | The dotted path of a server method, or a route to navigate to. |
| `hidden` | Hide the action. |

- **Server Action** calls a whitelisted server-side method with the current document.
- **Route** navigates the user to another page or report.

For conditional buttons (visible only in certain states, with confirmation dialogs, etc.) use a client script instead. See [Form API](/client-side/form-api).

## See also

- [Fields](/doctypes/fields): Link, Dynamic Link and `fetch_from`.
- [Docstatus](/doctypes/docstatus): link validation against cancelled documents.
- [Form API](/client-side/form-api): custom buttons and behaviour in client script.
