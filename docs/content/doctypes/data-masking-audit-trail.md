---
title: Data Masking Audit Trail
---

# Data Masking & Audit Trail

Two related concerns: hiding sensitive field values from users who should not see them (masking), and keeping a record of who changed what (the audit trail). Both are configured on the DocType, not in code.

## Field-level data masking

Masking replaces a field's value with placeholder characters in query results, while leaving the real value in the database. Turn it on per field, then grant a `mask` permission to the roles that are allowed to see the real value.

Set `mask` on the field (a checkbox in the DocField, available for value field types like Data, Link, Select, Date, Currency and so on):

```json
{
  "fieldname": "pan_number",
  "fieldtype": "Data",
  "label": "PAN Number",
  "mask": 1
}
```

Then, in the DocType's Role Permissions, the **Mask** permission decides who sees the real value. A role with `mask` access reads the field unmasked. A role without it gets the masked placeholder. The check goes through field permission levels, so it follows the same role-and-level logic as read/write access. See [Customization](/doctypes/customization) for permission levels.

The Administrator always sees real values and is never masked.

### How values are masked

When a query runs through `frappe.db.get_list` (the `DatabaseQuery`), Frappe looks up the DocType's masked fields for the current user and rewrites the matching values. The masking is done by `frappe.model.utils.mask.mask_field_value`, which picks a pattern based on the field type:

| Field | Masked as |
|-------|-----------|
| `Data` with option `Phone` | First 3 characters, then `XXXXXX` |
| `Data` with option `Email` | `XXXXXX@` plus the original domain |
| `Date` | `XX-XX-XXXX` |
| `Time` | `XX:XX` |
| Anything else | `XXXXXXXX` |

Empty values are left as-is. The per-user list of masked fields is cached, so the lookup stays cheap on repeated queries.

## Tracking changes with track_changes

Turn on `track_changes` on a DocType to record every edit as a new **Version** document. Each save compares the document against its previous state and stores the diff.

```json
{
  "doctype": "DocType",
  "name": "Sales Invoice",
  "track_changes": 1
}
```

On every update, `Document.save_version()` runs. It skips versioning when `track_changes` is off, during installs and patches, or when `flags.ignore_version` is set. Otherwise it compares the document to `_doc_before_save` and, if anything changed, inserts a Version record.

### The Version DocType

A Version stores `ref_doctype`, `docname` and a JSON `data` field holding the diff. The diff (built by `frappe.core.doctype.version.version.get_diff`) is a dict with these keys:

```json
{
  "changed": [["status", "Draft", "Submitted"]],
  "added": [["items", {"item_code": "A", "qty": 1}]],
  "removed": [["items", {"item_code": "B"}]],
  "row_changed": [["items", 0, "row-name", [["qty", 1, 2]]]]
}
```

- `changed`: top-level field values that changed, as `[fieldname, old, new]`.
- `added` and `removed`: child table rows added or deleted.
- `row_changed`: edits inside existing child rows.

Large text fields (Text Editor, Code, Markdown, HTML) are recorded but not value-diffed inline. When a Version is opened, multiline changes get an HTML side-by-side diff generated in `onload`.

You can read a document's history in code by querying Version:

```python
versions = frappe.get_all(
    "Version",
    filters={"ref_doctype": "Sales Invoice", "docname": invoice_name},
    fields=["name", "owner", "creation", "data"],
    order_by="creation desc",
)
```

Version also captures impersonation. If the session was impersonated, the diff records `impersonated_by` and `audit_user`.

## Activity Log

The **Activity Log** DocType records system events tied to documents and sessions, such as logins, logouts and impersonation. Each entry links back to a reference document (`reference_doctype` and `reference_name`) and holds a `subject`, `status` and the acting `user`, with the IP address captured for login and logout events.

Activity Log is written by the framework, so you read it rather than create entries by hand:

```python
logs = frappe.get_all(
    "Activity Log",
    filters={"reference_doctype": "User", "reference_name": "jane@example.com"},
    fields=["subject", "operation", "status", "ip_address", "creation"],
)
```

Use Version when you need the audit trail of field-level changes to a document, and Activity Log when you need a record of system and session events.
