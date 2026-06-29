---
title: Query Builder
---

# Query Builder

When [`frappe.get_all`](/server-side/querying-data) isn't expressive enough, reach for the query builder, `frappe.qb`. Use it when you need joins, subqueries, SQL functions, or unions. It's a thin wrapper around [PyPika](https://github.com/kayak/pypika) that produces safe, parameterized SQL across MariaDB, PostgreSQL, and SQLite, and runs it for you.

It's the recommended alternative to writing raw [`frappe.db.sql`](/server-side/database-api#raw-sql) strings: queries are composable Python objects, values are automatically parameterized, and the same code works across supported databases.

## A first query

```python
task = frappe.qb.DocType("Task")

result = (
    frappe.qb.from_(task)
    .select(task.name, task.subject)
    .where(task.status == "Open")
    .run(as_dict=True)
)
```

- `frappe.qb.DocType("Task")` gives you a table object for `tabTask`. Its columns are attributes (`task.subject`).
- `.from_()`, `.select()`, `.where()`, `.orderby()`, `.limit()` build the query.
- `.run()` executes it and returns the rows. Without `.run()` you have a query object, and `str(query)` shows the SQL.

`.run()` accepts the familiar options: `as_dict=True` for dicts, `as_list=True`, `pluck="name"`, and `debug=True` to print the generated SQL.

## Filtering

Conditions use normal Python operators on column objects:

```python
task = frappe.qb.DocType("Task")

(
    frappe.qb.from_(task)
    .select(task.name)
    .where(task.status == "Open")
    .where(task.priority != "Low")   # chained .where() = AND
)
```

Combine conditions with `&` (AND) and `|` (OR), and wrap each operand in parentheses:

```python
.where((task.status == "Open") & (task.priority == "High"))
.where((task.status == "Open") | (task.status == "Working"))
```

Other useful conditions:

```python
task.subject.like("%docs%")
task.priority.isin(["High", "Urgent"])
task.priority.notin(["Low"])
task.completed_on.isnull()
task.creation[start:end]          # BETWEEN
```

## Selecting, ordering, limiting

```python
task = frappe.qb.DocType("Task")

(
    frappe.qb.from_(task)
    .select(task.name, task.subject)
    .orderby(task.creation, order=frappe.qb.desc)
    .limit(10)
    .offset(20)
)
```

Use `frappe.qb.asc` / `frappe.qb.desc` for ordering direction.

## Joins

Create one table object per DocType and join on matching columns:

```python
task = frappe.qb.DocType("Task")
project = frappe.qb.DocType("Project")

result = (
    frappe.qb.from_(task)
    .left_join(project)
    .on(task.project == project.name)
    .select(task.name, task.subject, project.project_name)
    .where(project.status == "Open")
    .run(as_dict=True)
)
```

`.inner_join()`, `.left_join()`, and `.right_join()` are all available, each followed by `.on(<condition>)`.

## Functions and aggregates

SQL functions live in `frappe.query_builder.functions`. They emit the correct dialect-specific SQL automatically:

```python
from frappe.query_builder.functions import Count, Sum, Max

task = frappe.qb.DocType("Task")

# count grouped by status
(
    frappe.qb.from_(task)
    .select(task.status, Count(task.name).as_("count"))
    .groupby(task.status)
    .run(as_dict=True)
)

# aggregate
total = (
    frappe.qb.from_(task)
    .select(Sum(task.actual_time))
    .where(task.status == "Completed")
    .run()
)[0][0]
```

Other commonly used helpers: `Min`, `Avg`, `Coalesce`, `IfNull`, `Concat`, `Date`, `Now`, and `Round`.

## Writing data

`frappe.qb` can also build `UPDATE` and `DELETE` statements. These bypass the controller lifecycle and will not run `validate` or document events, so prefer the [Document API](/server-side/document-api) for normal writes.

```python
task = frappe.qb.DocType("Task")

# update
(
    frappe.qb.update(task)
    .set(task.status, "Cancelled")
    .where(task.project == "PROJ-0001")
    .run()
)

# delete
frappe.qb.from_(task).delete().where(task.status == "Cancelled").run()
```

## Permissions

The query builder has **no concept of permissions**. It runs exactly the SQL you write, like `frappe.get_all`. If a query is driven by an end user, either use [`frappe.get_list`](/server-side/querying-data) instead or enforce access yourself before running it. See [Permissions in code](/server-side/permissions-in-code).

## See also

- [Querying Data](/server-side/querying-data): the simpler `get_all`/`get_list` API; use it unless you need joins or functions.
- [Database API](/server-side/database-api): `frappe.db.sql` and transaction control.
- [PyPika docs](https://pypika.readthedocs.io/): the underlying builder's full API.
