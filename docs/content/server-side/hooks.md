---
title: Hooks
---

# Hooks

`hooks.py` is the control panel of a Frappe app. It's a flat Python file of module-level variables that the framework reads to wire your app into the system. You use it to react to document events, schedule jobs, override classes, and inject assets. Every app has one at `<app>/<app>/hooks.py`.

Hooks are **additive across apps**: when multiple installed apps define the same hook, Frappe merges them. Read the merged result for any hook with `frappe.get_hooks("hook_name")`.

After changing `hooks.py`, run `bench migrate` (or at least `bench clear-cache`) so the new configuration is picked up.

## App metadata

The top of the file identifies the app:

```python
app_name = "library"
app_title = "Library"
app_publisher = "Acme Inc."
app_description = "Manage books and loans"
app_license = "MIT"
```

## Document events

`doc_events` is the most-used hook. It binds functions to lifecycle events of a doctype, exactly like [controller methods](/doctypes/controllers-lifecycle), but without modifying that doctype's controller. This is how you react to **another app's** doctypes.

```python
doc_events = {
    "Library Loan": {
        "on_submit": "library.events.loan.on_submit",
        "on_cancel": "library.events.loan.on_cancel",
    },
    # apply to every doctype with "*"
    "*": {
        "validate": "library.events.audit.log_change",
    },
}
```

The handler receives the document and the event name:

```python
# library/events/loan.py
def on_submit(doc, method):
    frappe.msgprint(f"Loan {doc.name} issued")
```

Supported events mirror the lifecycle: `before_insert`, `after_insert`, `validate`, `before_save`, `on_update`, `before_submit`, `on_submit`, `before_cancel`, `on_cancel`, `on_update_after_submit`, `before_rename`, `after_rename`, `on_trash`, `after_delete`, and `on_change`.

## Scheduler events

`scheduler_events` registers functions to run on a schedule (the scheduler must be enabled for the site). Use the named frequencies or a cron expression:

```python
scheduler_events = {
    "daily": [
        "library.tasks.send_due_reminders",
    ],
    "hourly": [
        "library.tasks.sync_catalog",
    ],
    "cron": {
        "0/15 * * * *": [
            "library.tasks.poll_returns",
        ],
    },
}
```

Available frequencies include `all` (every scheduler tick), `hourly`, `daily`, `weekly`, `monthly`, their `_long` variants (run on the long-running worker), the `_maintenance` variants, and `cron` for arbitrary expressions. See [Background Jobs](/server-side/background-jobs) for how these execute.

## Overriding classes and methods

### override_doctype_class

Replace a DocType's controller class with your own subclass. This is useful for changing behavior of a DocType you don't own:

```python
override_doctype_class = {
    "ToDo": "library.overrides.todo.CustomToDo",
}
```

```python
# library/overrides/todo.py
from frappe.desk.doctype.todo.todo import ToDo

class CustomToDo(ToDo):
    def validate(self):
        super().validate()
        # extra logic
```

### override_whitelisted_methods

Redirect calls to a whitelisted method to a replacement of yours:

```python
override_whitelisted_methods = {
    "frappe.client.get_count": "library.overrides.get_count",
}
```

See [Whitelisted Methods](/server-side/whitelisted-methods#overriding-a-method).

## Permission hooks

These extend access control. See [Permissions in code](/server-side/permissions-in-code) for how they're applied.

```python
# add SQL conditions to list queries (row-level filtering)
permission_query_conditions = {
    "Library Loan": "library.permissions.loan_query_conditions",
}

# custom per-document permission check
has_permission = {
    "Library Loan": "library.permissions.has_loan_permission",
}
```

```python
# library/permissions.py
def loan_query_conditions(user=None, doctype=None):
    user = user or frappe.session.user
    return f"`tabLibrary Loan`.owner = {frappe.db.escape(user)}"

def has_loan_permission(doc, ptype, user, debug=False):
    return doc.owner == user
```

## Request and job hooks

Run code at the boundaries of every request and background job:

```python
before_request = ["library.startup.before_request"]
after_request = ["library.startup.after_request"]

before_job = ["library.startup.before_job"]
after_job = ["library.startup.after_job"]
```

## Login and session hooks

```python
on_session_creation = ["library.auth.on_session_creation"]
on_login = ["library.auth.on_login"]
on_logout = ["library.auth.on_logout"]

# add data to the JS bootinfo sent to the desk on load
extend_bootinfo = ["library.boot.boot_session"]
```

## Assets

Inject JavaScript and CSS into the Desk, the website, or specific DocType forms:

```python
app_include_js = ["library.bundle.js"]   # desk
app_include_css = ["library.bundle.css"]
web_include_js = ["library_web.js"]      # website pages

doctype_js = {"Library Loan": "public/js/library_loan.js"}
```

## Jinja, queries, and fixtures

```python
# expose methods/filters to Jinja templates and print formats
jinja = {
    "methods": ["library.utils.jinja_methods"],
    "filters": ["library.utils.jinja_filters"],
}

# replace the default link-field search query for a doctype
standard_queries = {"Library Book": "library.queries.book_query"}

# export records as part of the app (synced on migrate)
fixtures = ["Custom Field", {"dt": "Role", "filters": [["name", "in", ["Librarian"]]]}]
```

## Install and migrate hooks

```python
before_install = "library.install.before_install"
after_install = "library.install.after_install"

before_migrate = "library.migrate.before_migrate"
after_migrate = "library.migrate.after_migrate"
```

## Discovering hooks

The framework's own `hooks.py` is the most complete reference for what each hook expects, so read `frappe/hooks.py` in the source. To see the merged value across all installed apps for any hook:

```python
frappe.get_hooks("doc_events")
frappe.get_hooks("scheduler_events")
```

## See also

- [Controllers & Lifecycle](/doctypes/controllers-lifecycle): the events `doc_events` hooks into.
- [Permissions in code](/server-side/permissions-in-code): `permission_query_conditions` and `has_permission`.
- [Whitelisted Methods](/server-side/whitelisted-methods): overriding endpoints.
- [Background Jobs](/server-side/background-jobs): how scheduler events run.
