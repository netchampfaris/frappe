---
title: Database API
---

# Database API

`frappe.db` is the low-level database interface. It reads and writes columns directly, **without** running the controller lifecycle (no `validate`, no document events). That makes it fast and precise, and it means you take responsibility for data integrity. For normal record changes, prefer the [Document API](/server-side/document-api). Reach for `frappe.db` for value lookups, bulk updates, and transaction control.

## Reading values

`frappe.db.get_value` returns one or more fields of a single record:

```python
# one field
status = frappe.db.get_value("Task", "TASK-0001", "status")

# multiple fields -> list (in order)
subject, status = frappe.db.get_value("Task", "TASK-0001", ["subject", "status"])

# as a dict
row = frappe.db.get_value("Task", "TASK-0001", ["subject", "status"], as_dict=True)

# filters instead of a name
name = frappe.db.get_value("Task", {"status": "Open"}, "name")
```

`frappe.db.get_values` is the same but returns all matching rows (a list), not just the first.

`frappe.db.get_single_value` reads a field from a [Single DocType](/doctypes/single-doctypes), with local caching by default:

```python
country = frappe.db.get_single_value("System Settings", "country")
```

For counting and existence checks, see [Querying Data](/server-side/querying-data#counting-and-existence): `frappe.db.count(...)` and `frappe.db.exists(...)`.

## Writing values

`frappe.db.set_value` updates one or more columns directly. It updates the `modified` timestamp but does **not** run document events or validations:

```python
# single field on one record
frappe.db.set_value("Task", "TASK-0001", "status", "Completed")

# multiple fields at once
frappe.db.set_value("Task", "TASK-0001", {
    "status": "Completed",
    "progress": 100,
})

# update many records by filter
frappe.db.set_value("Task", {"project": "PROJ-0001"}, "status", "Cancelled")
```

For a single DocType, use `frappe.db.set_single_value`:

```python
frappe.db.set_single_value("System Settings", "country", "India")
```

> Because `set_value` skips controller logic, use it deliberately, for things like syncing a denormalized field or a status flag. Don't use it as a shortcut around validation you actually want to run. When in doubt, load the document and `save()`.

To delete rows by filter (also skipping the lifecycle):

```python
frappe.db.delete("Task", {"status": "Cancelled"})
```

## Raw SQL

Raw SQL is the last resort. Most of the time the [Document API](/server-side/document-api), the value helpers above, and the [Query Builder](/server-side/query-builder) cover what you need. Reach for `frappe.db.sql` only for the rare advanced cases the query builder can't express, such as hand-tuned query optimization.

When you do need it, `frappe.db.sql` runs a raw query. **Always parameterize** your values to avoid SQL injection. Never interpolate values into the string:

```python
# positional parameters with %s
frappe.db.sql("select name from tabTask where status = %s", "Open")

# named parameters
frappe.db.sql(
    "select name from tabTask where status = %(status)s and owner = %(owner)s",
    {"status": "Open", "owner": frappe.session.user},
)

# return dicts
rows = frappe.db.sql("select name, subject from tabTask", as_dict=True)
```

Useful options: `as_dict=True` (rows as dicts), `pluck=True` (flat list of the first column), `debug=True` (log the query), and `run=False` (return the SQL string without executing).

Table names are `tab<DocType>` (e.g. `tabTask`, `` `tabSales Invoice` `` for names with spaces). Prefer the query builder, which handles this for you.

## Transactions

Every HTTP request and background job runs inside **one transaction**. Frappe commits it automatically when the request completes successfully and rolls it back if an unhandled exception propagates. In the vast majority of cases you should **not** call commit or rollback yourself.

```python
frappe.db.commit()    # COMMIT and start a new transaction
frappe.db.rollback()  # ROLLBACK and start a new transaction
```

Why avoid manual commits: a mid-request `commit()` makes earlier changes permanent even if a later step fails, leaving partial, inconsistent data. Let the request boundary handle it. Legitimate uses are rare, such as a long-running background job that intentionally checkpoints progress.

### Savepoints

For "try this, and undo just this part on failure" semantics within the current transaction, use savepoints. Rolling back to a savepoint undoes only the database changes since the savepoint. It does **not** trigger rollback watchers, so don't pair it with filesystem changes.

```python
frappe.db.savepoint("before_risky_step")
try:
    do_something_risky()
except SomeError:
    frappe.db.rollback(save_point="before_risky_step")
```

You can release a savepoint explicitly with `frappe.db.release_savepoint("before_risky_step")`.

The `savepoint` context manager wraps a block in a savepoint and rolls back to it if a matching exception is raised. It handles the naming, rollback, and release for you:

```python
from frappe.database import savepoint

for doc in docs:
    with savepoint(catch=frappe.DuplicateEntryError):
        doc.insert()
```

It also works as a decorator that wraps the whole function:

```python
from frappe.database import savepoint

@savepoint(catch=frappe.DuplicateEntryError)
def process(doc):
    doc.insert()
```

## See also

- [Document API](/server-side/document-api): the lifecycle-aware way to write records.
- [Query Builder](/server-side/query-builder): safe, composable queries instead of raw SQL.
- [Querying Data](/server-side/querying-data): `get_all`/`get_list`, `count`, and `exists`.
