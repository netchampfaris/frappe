---
title: Overview
---

# Overview

The server side of a Frappe app is plain Python. Everything you do (read and write documents, run queries, expose APIs, react to events) goes through the `frappe` namespace, a global module that is set up per request (or per background job) with the current user, site, database connection, and request context already wired in.

This section covers the APIs you will use most. Start here for the big picture, then read the individual pages.

## The `frappe` namespace

You almost never construct objects directly. Instead you `import frappe` and call functions on it:

```python
import frappe

# read a document
doc = frappe.get_doc("Task", "TASK-0001")

# query many rows
open_tasks = frappe.get_all("Task", filters={"status": "Open"}, pluck="name")

# read a single value
subject = frappe.db.get_value("Task", "TASK-0001", "subject")

# the current user and site
frappe.session.user   # e.g. "jane@example.com"
frappe.local.site     # e.g. "mysite.localhost"
```

`frappe` is request-scoped. The same import works inside a controller method, a whitelisted API, a scheduled job, or `bench console`. The framework binds the right context for each.

### Things you reach for constantly

| What you want | Use |
| --- | --- |
| A full document object (with child tables) | [`frappe.get_doc`](/server-side/document-api) |
| A list of rows | [`frappe.get_all` / `frappe.get_list`](/server-side/querying-data) |
| One or a few field values | [`frappe.db.get_value`](/server-side/database-api) |
| A complex SQL-like query | [`frappe.qb`](/server-side/query-builder) |
| Translate a string | `frappe._("Some text")` |
| Raise a user-facing error | `frappe.throw(frappe._("Not allowed"))` |
| Show a non-blocking message | `frappe.msgprint(frappe._("Done"))` |
| Current user / roles | `frappe.session.user`, `frappe.get_roles()` |

`frappe.throw` raises a `frappe.ValidationError` by default; pass `exc=` to raise a different exception class. The raised exception, if unhandled, rolls back the transaction at the request boundary.

## Anatomy of an app on the server

A Frappe app is an installable Python package. The server-relevant pieces of a typical app named `library`:

```text
library/
├── library/
│   ├── hooks.py            # app config: events, scheduler, overrides
│   ├── __init__.py         # __version__ lives here
│   ├── api.py              # your @frappe.whitelist() endpoints (by convention)
│   ├── library_management/ # a "module" (group of doctypes)
│   │   └── doctype/
│   │       └── member/
│   │           ├── member.py    # the controller (Document subclass)
│   │           ├── member.json  # the schema
│   │           └── member.js    # client-side form script
│   └── patches/            # data migration scripts
├── pyproject.toml
└── ...
```

The two files that define server behavior for an app are:

- **`hooks.py`**: declarative configuration. It registers document event handlers, scheduled jobs, class overrides, and dozens of other extension points. See [Hooks](/server-side/hooks).
- **Controllers** (`<doctype>.py`): one Python class per DocType, subclassing `frappe.model.document.Document`. Lifecycle methods like `validate`, `before_save`, and `on_submit` live here. See [Controllers & Lifecycle](/doctypes/controllers-lifecycle).

## Where server code runs

The same APIs are available everywhere, but the entry points differ:

- **Controller methods**: run automatically during a document's lifecycle.
- **[Whitelisted methods](/server-side/whitelisted-methods)**: called over HTTP from the browser or REST clients.
- **[Background jobs](/server-side/background-jobs)**: enqueued work that runs outside the request.
- **[Scheduler events](/server-side/hooks#scheduler-events)**: cron-like jobs.
- **`bench console`**: an interactive Python shell with `frappe` already initialized for a site:

```bash
bench --site mysite.localhost console
```

## Transactions

Each HTTP request and background job runs inside a single database transaction. Frappe commits automatically when the request finishes successfully and rolls back on an unhandled exception, so you rarely call `frappe.db.commit()` yourself. Doing so mid-request can leave partial data if a later step fails. See [Database API](/server-side/database-api#transactions) for the details.

## Next steps

- [Document API](/server-side/document-api): create, read, update, submit, and delete records.
- [Querying Data](/server-side/querying-data): `get_all`, `get_list`, filters, and field selection.
- [Database API](/server-side/database-api): direct value access, raw SQL, and transactions.
- [Hooks](/server-side/hooks): extend the framework from `hooks.py`.
