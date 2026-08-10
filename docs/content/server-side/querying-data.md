---
title: Querying Data
---

# Querying Data

When you need many records (or just a few columns), don't load full documents in a loop. Query them directly. `frappe.get_all` and `frappe.get_list` return lists of rows efficiently, with a flexible filter and field syntax. For one or a few fields, use [`frappe.db.get_value`](#reading-specific-field-values); for full SQL control, use the [Query Builder](/server-side/query-builder).

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

Both return **all** matching rows by default. Neither applies a page limit unless you pass one; see [Ordering, limiting, and paging](#ordering-limiting-and-paging).

## Selecting fields

By default only `name` is returned. Pass `fields` to choose columns:

```python
frappe.get_all("Task", fields=["name", "subject", "status"])
# -> [{"name": "TASK-0001", "subject": "...", "status": "Open"}, ...]
```

Each row is a `frappe._dict`, so you can use attribute access: `rows[0].subject`.

You can alias a column with `as`:

```python
frappe.get_all("Task", fields=["name as task_id", "subject"])
```

Raw SQL function strings like `"count(name)"` are rejected. For aggregates and a few other functions, pass a dict instead. The key is the uppercase function name and `as` sets the alias:

```python
frappe.get_all("Task", fields=["status", {"COUNT": "name", "as": "count"}], group_by="status")
frappe.get_all("Task", fields=[{"COUNT": "*", "as": "total"}])
```

Only a fixed set of functions is allowed, including `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`, `ABS`, `IFNULL`, `CONCAT`, and the date parts `YEAR`, `MONTH`, and `QUARTER`. Arbitrary SQL is not. For anything beyond this, use the [Query Builder](/server-side/query-builder).

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

### Filtering across a Link field

If a field is a Link, you can filter on a field of the linked doctype with dot notation: `link_field.target_field`. The query joins the linked table for you. For example, if `Invoice` has a `customer` Link field, filter on the customer's territory like this:

```python
# dict form
frappe.get_all("Invoice", filters={"customer.territory": "Australia"})

# list form
frappe.get_all("Invoice", filters=[["customer.territory", "=", "Australia"]])
```

The same dot notation works in `fields` to pull a value from the linked record:

```python
frappe.get_all("Invoice", fields=["name", "customer.territory"])
```

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

By default there's no limit: `get_all`/`get_list` return every matching row. Pass `limit` to cap the page size and `offset` to skip rows for paging:

```python
frappe.get_all(
    "Task",
    fields=["name", "subject"],
    order_by="creation desc",
    limit=20,
    offset=0,
)
```

`order_by` takes a SQL fragment, e.g. `"priority asc, creation desc"`.

The older `limit_page_length` and `limit_start` kwargs still work as aliases for `limit` and `offset`, but they're deprecated and log a warning; use `limit`/`offset` in new code.

## Counting and existence

For these, skip `get_all` and use the database helpers directly:

```python
frappe.db.count("Task", filters={"status": "Open"})

frappe.db.exists("Task", "TASK-0001")              # -> name or None
frappe.db.exists("Task", {"subject": "Write docs"}) # filters form
frappe.db.exists({"doctype": "Task", "status": "Open"})
```

`frappe.db.exists` returns the matching document name (truthy) or `None`.

## Reading specific field values

When you need one or a few fields from one record, `frappe.db.get_value` is faster than loading a document or a list:

```python
subject = frappe.db.get_value("Task", "TASK-0001", "subject")
```

See [Database API: Reading values](/server-side/database-api#reading-values) for the multi-field, dict, and filter forms, plus `get_single_value` and caching.

## See also

- [Query Builder](/server-side/query-builder): for joins, subqueries, and SQL functions.
- [Database API](/server-side/database-api): `get_value`, `set_value`, `sql`, and transactions.
- [Permissions in code](/server-side/permissions-in-code): how `get_list` decides what a user can see.
