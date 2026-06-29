---
title: Querying Data
---

# Querying Data

When you need many records (or just a few columns), don't load full documents in a loop. Query them directly. `frappe.get_all` and `frappe.get_list` return lists of rows efficiently, with a flexible filter and field syntax. For single values, use [`frappe.db.get_value`](#single-values); for full SQL control, use the [Query Builder](/server-side/query-builder).

## get_all vs get_list

Both take the same arguments and return the same shape. The difference is **permissions**:

- **`frappe.get_all`** ignores user permissions. It runs as if you were the Administrator, with no role checks and no [user permission](/server-side/permissions-in-code) restrictions. Use it in trusted server code where you've already decided the caller is allowed.
- **`frappe.get_list`** enforces the current user's permissions: it filters out doctypes/records the user can't read and applies `permission_query_conditions` hooks.

```python
# server-side, trusted: returns every Task
frappe.get_all("Task", filters={"status": "Open"})

# respects who is asking: only Tasks the current user may read
frappe.get_list("Task", filters={"status": "Open"})
```

> Rule of thumb: use `get_list` for anything driven by an end user (especially inside [whitelisted methods](/server-side/whitelisted-methods)); use `get_all` for internal logic, reports, and background jobs where you control access yourself.

Two other defaults differ: `get_all` returns **all** matching rows by default (no page limit), while `get_list` defaults to `limit_page_length=20`.

## Selecting fields

By default only `name` is returned. Pass `fields` to choose columns:

```python
frappe.get_all("Task", fields=["name", "subject", "status"])
# -> [{"name": "TASK-0001", "subject": "...", "status": "Open"}, ...]
```

Each row is a `frappe._dict`, so you can use attribute access: `rows[0].subject`.

You can also use SQL expressions and aliases in `fields`:

```python
frappe.get_all("Task", fields=["status", "count(name) as count"], group_by="status")
```

### pluck

To get a flat list of one column's values instead of a list of dicts:

```python
names = frappe.get_all("Task", filters={"status": "Open"}, pluck="name")
# -> ["TASK-0001", "TASK-0002", ...]
```

## Filters

Filters can be a **dict** or a **list of lists**.

### Dict filters

Keys are fieldnames; a plain value means equality:

```python
frappe.get_all("Task", filters={"status": "Open", "priority": "High"})
```

For operators, make the value a `(operator, value)` tuple:

```python
frappe.get_all("Task", filters={
    "status": ("!=", "Cancelled"),
    "subject": ("like", "%docs%"),
    "creation": (">", "2024-01-01"),
    "priority": ("in", ["High", "Urgent"]),
})
```

### List-of-lists filters

Use this form when you need the same field twice (e.g. a range) or want to filter across joined doctypes. Each inner list is `[fieldname, operator, value]`:

```python
frappe.get_all("Task", filters=[
    ["creation", ">=", "2024-01-01"],
    ["creation", "<", "2025-01-01"],
    ["status", "in", ["Open", "Working"]],
])
```

The optional 4-element form `[doctype, fieldname, operator, value]` lets you filter on a parent or child doctype explicitly.

### Supported operators

`=`, `!=`, `<`, `>`, `<=`, `>=`, `like`, `not like`, `ilike`, `in`, `not in`, `between`, `is`, `regex`, and `timespan`.

```python
# range
frappe.get_all("Task", filters={"creation": ("between", ["2024-01-01", "2024-12-31"])})

# set / not set (NULL or empty string)
frappe.get_all("Task", filters={"completed_on": ("is", "not set")})

# relative date ranges
frappe.get_all("Task", filters={"creation": ("timespan", "last month")})
```

## Ordering, limiting, and paging

```python
frappe.get_all(
    "Task",
    fields=["name", "subject"],
    order_by="creation desc",
    limit_start=0,        # offset
    limit_page_length=20, # page size (alias: limit)
)
```

`order_by` takes a SQL fragment, e.g. `"priority asc, creation desc"`.

## Counting and existence

For these, skip `get_all` and use the database helpers directly:

```python
frappe.db.count("Task", filters={"status": "Open"})

frappe.db.exists("Task", "TASK-0001")              # -> name or None
frappe.db.exists("Task", {"subject": "Write docs"}) # filters form
frappe.db.exists({"doctype": "Task", "status": "Open"})
```

`frappe.db.exists` returns the matching document name (truthy) or `None`.

## Single values

When you need one or a few fields from one record, `frappe.db.get_value` is faster than loading a document or a list:

```python
# one field
subject = frappe.db.get_value("Task", "TASK-0001", "subject")

# multiple fields -> list
subject, status = frappe.db.get_value("Task", "TASK-0001", ["subject", "status"])

# as a dict
row = frappe.db.get_value("Task", "TASK-0001", ["subject", "status"], as_dict=True)

# with filters instead of a name
name = frappe.db.get_value("Task", {"status": "Open"}, "name")
```

`frappe.get_value` is an alias for `frappe.db.get_value`. For cached, permission-free reads of stable records use `frappe.get_cached_value(doctype, name, fieldname)`, and for [Single doctypes](/doctypes/single-doctypes) use `frappe.db.get_single_value("System Settings", "fieldname")`.

Note that `get_value` and `get_all` do **not** decrypt password fields or fetch values the way a loaded `Document` does. Use [`frappe.get_doc`](/server-side/document-api) when you need the full record.

## See also

- [Query Builder](/server-side/query-builder): for joins, subqueries, and SQL functions.
- [Database API](/server-side/database-api): `get_value`, `set_value`, `sql`, and transactions.
- [Permissions in code](/server-side/permissions-in-code): how `get_list` decides what a user can see.
