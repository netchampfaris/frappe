---
title: Document API
---

# Document API

A `Document` is the in-memory representation of one record, including its child tables. The Document API is how you create, read, update, submit, and delete records while running the full controller lifecycle of validations, events, and hooks. For raw column access that skips the controller, see the [Database API](/server-side/database-api).

## Reading a document

`frappe.get_doc(doctype, name)` loads a record (with its child tables) from the database:

```python
doc = frappe.get_doc("Task", "TASK-0001")
doc.subject          # field access as attributes
doc.get("status")    # or via .get()
```

Pass `for_update=True` to take a row lock on the record, for code paths that read and then write back under concurrent access: `frappe.get_doc("Task", name, for_update=True)`.

For a [Single DocType](/doctypes/single-doctypes) (one global record, e.g. settings), pass only the doctype:

```python
settings = frappe.get_doc("System Settings")
```

### Cached reads

`frappe.get_cached_doc` has the same signature but returns a cached copy when available. Use it for read-only lookups of rarely-changing records like settings or masters. Do not mutate and save a cached doc you did not load fresh.

```python
doc = frappe.get_cached_doc("Task", "TASK-0001")
```

### get_last_doc

Fetch the most recently created document matching optional filters:

```python
last = frappe.get_last_doc("Task", filters={"status": "Open"})
# order_by defaults to "creation desc"
```

## Creating a document

`frappe.new_doc(doctype, field=value, ...)` returns a new document with defaults applied and the given fields set. Call `insert()` to save it. `insert` checks `create` permission and validates links and mandatory fields, then runs, in order: `before_insert`, `validate`, `before_save`, the database insert itself, `after_insert`, and finally `on_update`.

```python
doc = frappe.new_doc("Task", subject="Write docs", status="Open")
doc.insert()
doc.name  # autoname is assigned after insert
```

You can also set fields one at a time after creating the document:

```python
doc = frappe.new_doc("Task")
doc.subject = "Write docs"
doc.insert()
```

`frappe.get_doc` accepts a dict with the `doctype` key too, which is useful when you already have the field values as a dict:

```python
doc = frappe.get_doc({
    "doctype": "Task",
    "subject": "Write docs",
    "status": "Open",
})
doc.insert()
```

Useful `insert()` options:

```python
doc.insert(ignore_permissions=True)    # skip permission checks
doc.insert(ignore_mandatory=True)      # skip required-field validation
doc.insert(ignore_if_duplicate=True)   # no error if a duplicate exists
```

`ignore_permissions=True` bypasses all permission checks, so only use it in trusted server code. See [Permissions in code](/server-side/permissions-in-code).

## Updating a document

Load, change fields, and `save()`. `save` runs `validate`, `before_save`, `on_update`, and checks `write` permission.

```python
doc = frappe.get_doc("Task", "TASK-0001")
doc.status = "Completed"
doc.save()
```

To update a single field without running the full save cycle, use `db_set` (it updates the column and the `modified` timestamp but does **not** re-run `validate`):

```python
doc.db_set("status", "Completed")
```

For bulk column updates that skip the controller entirely, use [`frappe.db.set_value`](/server-side/database-api#writing-values).

## Submitting and cancelling

Submittable doctypes (those with `is_submittable` set) move through `docstatus` 0 → 1 → 2. See [Docstatus](/doctypes/docstatus).

```python
doc.submit()   # docstatus 0 -> 1, runs before_submit / on_submit
doc.cancel()   # docstatus 1 -> 2, runs before_cancel / on_cancel
```

`submit()` and `cancel()` are themselves whitelisted controller methods, so they can be invoked from the client too.

## Deleting a document

```python
doc = frappe.get_doc("Task", "TASK-0001")
doc.delete()
```

`doc.delete()` is a thin wrapper over `frappe.delete_doc`, which you can call without loading the document first:

```python
frappe.delete_doc("Task", "TASK-0001")

# common options
frappe.delete_doc("Task", "TASK-0001", ignore_permissions=True)
frappe.delete_doc("Task", "TASK-0001", force=True)  # ignore link validations
```

Deleting runs the `on_trash` and `after_delete` events.

## Renaming a document

If a DocType allows renaming, change its primary key and update all linked references in one call:

```python
frappe.rename_doc("Task", "TASK-0001", "TASK-0001-A")

# merge into an existing record instead of just renaming
frappe.rename_doc("Task", "TASK-0001", "TASK-0002", merge=True)
```

## Copying a document

`frappe.copy_doc(doc)` returns a new, unsaved document cloned from an existing one. It clears `name` (and `owner`, `creation`, `modified`, `modified_by`, `amended_from`), so the clone gets its own identity on `insert()`. Child table rows are copied too, minus the same identity fields, and treated as new rows.

```python
doc = frappe.get_doc("Quotation", "QTN-0001")
new_doc = frappe.copy_doc(doc)
new_doc.insert()
```

By default, fields marked `no_copy` in the DocType are still copied over (despite the name). Pass `ignore_no_copy=False` to actually drop them:

```python
new_doc = frappe.copy_doc(doc, ignore_no_copy=False)
```

`docstatus` is cleared too, so a clone of a submitted or cancelled document comes back as a Draft (the exception is inside test code, where `docstatus` is left as-is so tests can clone already-submitted documents).

## Working with child tables

Child table rows are documents too. Read them as a list off the parent:

```python
doc = frappe.get_doc("Quotation", "QTN-0001")
for item in doc.items:        # "items" is the child table fieldname
    print(item.item_code, item.qty)
```

### Appending rows

`doc.append(fieldname, values)` adds a child row and returns it:

```python
doc = frappe.get_doc("Quotation", "QTN-0001")
doc.append("items", {
    "item_code": "Widget",
    "qty": 5,
})
doc.save()
```

### Replacing all rows

Set the whole table at once with a list of dicts:

```python
doc.set("items", [
    {"item_code": "Widget", "qty": 5},
    {"item_code": "Gadget", "qty": 2},
])
doc.save()
```

### Removing a row

```python
doc.items = [row for row in doc.items if row.item_code != "Widget"]
doc.save()
```

Child rows are persisted when you `save()` the parent. You never insert or save them individually.

## See also

- [Controllers & Lifecycle](/doctypes/controllers-lifecycle): the `validate`/`on_update`/`on_submit` methods these calls trigger.
- [Querying Data](/server-side/querying-data): fetch many records efficiently without loading full documents.
- [Database API](/server-side/database-api): direct, controller-free reads and writes.
- [Permissions in code](/server-side/permissions-in-code): `ignore_permissions`, `check_permission`, and related helpers.
