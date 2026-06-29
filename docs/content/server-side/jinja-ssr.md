---
title: Jinja SSR
---

# Jinja SSR

Frappe renders HTML on the server with [Jinja](https://jinja.palletsprojects.com/). Web pages, email templates, print formats, and notifications all run through the same template engine. The main entry point from Python is `frappe.render_template`.

```python
html = frappe.render_template(
    "Hello {{ name }}, you have {{ count }} books on loan.",
    {"name": "Asha", "count": 3},
)
```

## frappe.render_template

It takes a template and a context dict. The template can be an inline string or a path to a `.html` file inside an app.

```python
# inline string
frappe.render_template("{{ doc.title }} ({{ doc.author }})", {"doc": book})

# path to a template file in an app
frappe.render_template(
    "library/templates/emails/due_reminder.html",
    {"loan": loan, "user": user},
)
```

Frappe guesses whether the first argument is a path or raw content. If it ends in `.html` or `.md` and is a single line, it is treated as a path. Pass `is_path=True` to be explicit.

```jinja
{# library/templates/emails/due_reminder.html #}
<p>Hi {{ user.first_name }},</p>
<p>"{{ loan.book_title }}" is due on {{ frappe.format_date(loan.due_date) }}.</p>
```

By default rendering is sandboxed (`safe_render=True`), so templates cannot reach into Python internals or call dangerous functions. This matters because print formats and notifications can be edited by users. Keep the sandbox on for any template that is not fully under your control.

## What is available in templates

Every template gets a set of globals, including `frappe` itself with a safe subset of methods. Useful ones:

```jinja
{{ frappe.format_date(doc.posting_date) }}
{{ frappe.utils.fmt_money(doc.total, currency="USD") }}
{{ frappe.get_doc("Library Member", doc.member).full_name }}
{{ frappe.db.get_value("Settings", None, "library_name") }}
{{ _("Translated label") }}
```

The `_()` function marks a string for translation.

### Whitelisted helpers

Templates run in a sandbox, so only a fixed set of `frappe` methods is exposed. The common ones:

| Helper                                                     | What it does                                                                              |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `frappe.format(value, df, doc)`                            | Format a stored value for display. `df` is a fieldtype dict like `{"fieldtype": "Date"}`. |
| `frappe.format_date(date)`                                 | Format a date in the long, human readable format (`January 8, 2026`).                     |
| `frappe.get_doc(doctype, name)`                            | Return a document as a dict. Read only inside templates.                                  |
| `frappe.get_all(doctype, filters, fields, order_by, ...)`  | List records. Ignores user permissions. Returns names only when `fields` is omitted.      |
| `frappe.get_list(doctype, filters, fields, order_by, ...)` | Same as `get_all` but filtered by the session user's permissions.                         |
| `frappe.db.get_value(doctype, filters, fieldname)`         | Return one field value, or a list of values if `fieldname` is a list.                     |
| `frappe.db.get_single_value(doctype, fieldname)`           | Return a field value from a Single doctype.                                               |
| `frappe.get_system_settings(fieldname)`                    | Return a field value from System Settings.                                                |
| `frappe.get_meta(doctype)`                                 | Return the doctype meta (fields, title field, and so on).                                 |
| `frappe.get_fullname(user)`                                | Full name of a user. Defaults to the current user when no email is passed.                |
| `frappe.render_template(template, context)`                | Render a nested template string or file.                                                  |
| `_(string)`                                                | Mark a string for translation.                                                            |
| `frappe.session.user`                                      | The current session user.                                                                 |
| `frappe.session.csrf_token`                                | CSRF token for the current session.                                                       |
| `frappe.form_dict`                                         | Query parameters when rendered in a web request.                                          |

```jinja
{% set tasks = frappe.get_all("Task", filters={"status": "Open"}, fields=["title", "due_date"], order_by="due_date asc") %}
{% for task in tasks %}
  <h3>{{ task.title }}</h3>
  <p>Due {{ frappe.format_date(task.due_date) }}</p>
{% endfor %}
```

The full list lives in `render_safe_globals` in `frappe/utils/safe_exec.py`.

## Adding methods and filters

To expose your own functions to every template, register them in `hooks.py` under the `jinja` key. `methods` are callables you can invoke; `filters` are used with the pipe syntax.

```python
# hooks.py
jinja = {
    "methods": ["library.utils.days_left"],
    "filters": ["library.utils.shout"],
}
```

```python
# library/utils.py
def days_left(due_date):
    from frappe.utils import date_diff, nowdate
    return date_diff(due_date, nowdate())

# a filter
def shout(value):
    return value.upper()
```

Each entry is a dotted path to either a module or a function. A module path exposes every function defined in that module (for example `"methods": ["library.utils"]`); a function path exposes just that function. After editing `hooks.py`, run `bench migrate` (or `bench clear-cache`) so the new entries are picked up. Then use them:

```jinja
{{ days_left(loan.due_date) }} days left
{{ book.title | shout }}
```

## Print formats and get_print

Print formats are Jinja templates too. To render a document's print format from Python, use `frappe.get_print`:

```python
html = frappe.get_print("Sales Invoice", "INV-0001")

# as a PDF
pdf = frappe.get_print("Sales Invoice", "INV-0001", as_pdf=True)
```

Useful parameters:

- `print_format`: the Print Format name. Defaults to the doctype's standard format.
- `as_pdf`: return PDF bytes instead of an HTML string.
- `letterhead` and `no_letterhead`: control the letterhead.
- `doc`: pass an already-loaded document instead of `doctype` and `name`.

To attach a printed PDF to an email, see `frappe.attach_print` in `frappe/utils/print_utils.py`.

## See also

- [Hooks](/server-side/hooks#jinja-queries-and-fixtures): registering Jinja methods and filters.
- [Utilities](/server-side/utilities): the formatting helpers you call inside templates.
