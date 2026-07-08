---
title: Audit Trail
---

# Audit Trail

Frappe records who changed what and when. There are three layers: per-document change tracking with the Version DocType, login and session events in the Activity Log, and the timeline you see on every form.

## track_changes

Change tracking is off by default. Turn on "Track Changes" on a DocType (in the DocType form, or by setting `track_changes` to 1) and Frappe starts saving a record of every edit to its documents.

When a tracked document is saved, Frappe compares the new version against the version before the save. If anything changed, it writes a `Version` record holding the diff. Documents are not duplicated: only the changed fields are stored, which keeps the table small.

## The Version DocType

Each `Version` record stores:

- `ref_doctype` and `docname`: which document this version belongs to.
- `data`: a JSON diff of what changed.

The diff captures more than simple field edits. Its structure is:

```json
{
  "changed": [["status", "Draft", "Submitted"]],
  "added": [["items", { "item_code": "BOOK-1" }]],
  "removed": [["items", { "item_code": "BOOK-2" }]],
  "row_changed": [["items", 0, "row-name", [["qty", 1, 2]]]]
}
```

- `changed`: top-level fields, as `[fieldname, old, new]`.
- `added` and `removed`: child table rows added or deleted.
- `row_changed`: fields edited inside an existing child row.

Read a version's diff in code with:

```python
versions = frappe.get_all(
    "Version",
    filters={"ref_doctype": "Book", "docname": "LIB-BOOK-0001"},
    fields=["name", "owner", "creation"],
    order_by="creation desc",
)

diff = frappe.get_doc("Version", versions[0].name).get_data()
```

Every `Version` carries the standard `owner` and `creation` fields, so you know who made the change and when. If the change was made while one user was impersonating another, the diff also records `impersonated_by`. Versions are created with `ignore_permissions`, so the trail is written even for changes made by background jobs.

On the form, this history shows up under the document's timeline as a list of changes you can expand.

## Activity Log

While Version tracks document edits, the Activity Log tracks account and session events: logins, logouts, and impersonation. Each `Activity Log` record holds the `user`, the `operation` (`Login`, `Logout`, or `Impersonate`), a `status` (`Success` or `Failed`), the `ip_address`, and a timestamp.

Use it to answer questions like "when did this user last sign in" or "where did failed logins come from":

```python
frappe.get_all(
    "Activity Log",
    filters={"user": "jane@example.com", "operation": "Login"},
    fields=["status", "ip_address", "creation"],
    order_by="creation desc",
    limit=10,
)
```

The timeline entries you see for comments, assignments, and shares on a document are not Activity Log records. They are `Comment` records, filtered by `comment_type` (`Comment`, `Assigned`, `Shared`, and so on) and linked through `reference_doctype` and `reference_name`. `doc.add_comment()` creates the plain comments, and sharing a document adds a `Shared`/`Unshared` comment alongside the `DocShare` record. See [Document Sharing](/security/document-sharing) for how sharing works.

## Related logs

Two more DocTypes round out the audit trail:

- `Deleted Document` archives the full JSON of a document when it is deleted, so you can inspect or restore data that no longer exists in its original table.
- `Permission Log` (`frappe.core.doctype.permission_log`) records changes to permission-sensitive documents, such as edits to roles and permission rules.
