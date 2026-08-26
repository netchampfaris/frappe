---
title: Hooks
---

# Hooks

`hooks.py` is the control panel of a Frappe app. It's a flat Python file of module-level variables that the framework reads to wire your app into the system. You use it to react to document events, schedule jobs, override classes, and inject assets. Every app has one at `<app>/<app>/hooks.py`.

## Defining hooks in your app

Frappe imports `hooks.py` and reads its module-level variables, so a hook is just a top-level assignment. There is no registration function to call.

A hook value is one of three shapes:

- a string dotted path to a function, like `"library.install.after_install"`
- a list of dotted paths
- a dict that maps a key (often a doctype) to one or more dotted paths

```python
# single function
after_install = "library.install.after_install"

# list of functions
before_request = ["library.startup.before_request"]

# dict keyed by doctype
doc_events = {
    "Library Loan": {
        "on_submit": "library.events.loan.on_submit",
    },
}
```

Hooks are **additive across apps**: when multiple installed apps define the same hook, Frappe merges them. So you never edit another app's `hooks.py` to extend it. Define the same hook in your own app and Frappe combines the values. Read the merged result for any hook with `frappe.get_hooks("hook_name")`.

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

Supported events mirror the lifecycle: `before_insert`, `after_insert`, `before_validate`, `validate`, `before_save`, `on_update`, `before_submit`, `on_submit`, `before_cancel`, `on_cancel`, `before_update_after_submit`, `on_update_after_submit`, `before_rename`, `after_rename`, `on_trash`, `after_delete`, and `on_change`.

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

This is an advanced hook. Reach for `doc_events` first, and only override the class when you need to change methods those hooks can't reach.

Replace a DocType's controller class with your own subclass. Always extend the base controller class and call `super()` so the original behavior still runs. This is useful for changing behavior of a DocType you don't own:

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

`on_login`, `on_session_creation`, and `on_logout` are each called with the `login_manager`. `extend_bootinfo` is called with the `bootinfo` dict, which you mutate in place; the result is available client-side as `frappe.boot`.

```python
# library/boot.py
def boot_session(bootinfo):
    bootinfo.my_global_key = "my_global_value"
```

### Authentication hooks

`auth_hooks` run during request authentication, before the request is handled. Use them to read a custom header or token, verify it, and map the request to a user with `frappe.set_user()`. They take no arguments.

```python
auth_hooks = ["library.auth.validate_custom_jwt"]
```

Do not raise if verification fails. Return without setting a user and the request stays a Guest request, so other auth hooks still get a chance to run.

## Assets

Inject JavaScript and CSS into the Desk, the website, or specific DocType forms:

```python
app_include_js = ["library.bundle.js"]    # desk
app_include_css = ["library.bundle.css"]
web_include_js = ["library_web.js"]        # website pages
web_include_css = ["library_web.css"]

doctype_js = {"Library Loan": "public/js/library_loan.js"}     # form view
page_js = {"background_jobs": "public/js/custom_background_jobs.js"}  # desk page
webform_include_js = {"ToDo": "public/js/custom_todo.js"}      # standard web form
```

## Jinja and queries

```python
# expose methods/filters to Jinja templates and print formats
jinja = {
    "methods": ["library.utils.jinja_methods"],
    "filters": ["library.utils.jinja_filters"],
}

# replace the default link-field search query for a doctype
standard_queries = {"Library Book": "library.queries.book_query"}
```

## Website hooks

These hooks control how portal (website) pages render and route.

### Context

When a portal page renders, Frappe builds a `context` dict of values the template can use. `website_context` is a flat dict of static overrides. `update_website_context` points to a function for dynamic changes; it gets the `context` dict and can mutate it or return a dict to merge.

```python
website_context = {"favicon": "/assets/library/img/favicon.png"}
update_website_context = "library.website.update_context"
```

```python
# library/website.py
def update_context(context):
    context.my_key = "my_value"
```

### Redirects and route rules

`website_redirects` maps source routes to targets. The source can be a plain path or a regex, and the target can reference capture groups.

```python
website_redirects = [
    {"source": "/compare", "target": "/comparison"},
    {"source": r"/docs(/.*)?", "target": r"https://docs.example.com/\1"},
]
```

`website_route_rules` maps a URL pattern to a controller path. Use it for clean, dynamic URLs.

```python
website_route_rules = [
    {"from_route": "/projects/<name>", "to_route": "library/projects/project"},
]
```

The controller reads the matched parameter from `frappe.form_dict`:

```python
# library/projects/project.py
def get_context(context):
    context.project = frappe.get_doc("Project", frappe.form_dict.name)
```

### Home page

The root URL (`/`) renders `www/index` by default. Override it, top to bottom in increasing priority:

```python
# static override
home_page = "homepage"

# per-role override
role_home_page = {"Customer": "orders", "Supplier": "bills"}

# full control: function receives the user, returns a route
get_website_user_home_page = "library.website.get_home_page"
```

If more than one is set, `get_website_user_home_page` wins over `role_home_page`, which wins over `home_page`.

### Portal sidebar

Some portal views show a sidebar of links. `portal_menu_items` are defined in code and fixed. `standard_portal_menu_items` sync to Portal Settings, where a System User can edit them later.

```python
standard_portal_menu_items = [
    {"title": "Orders", "route": "/orders", "role": "Customer"},
]
```

### Clearing website cache

Frappe caches rendered web pages. `website_clear_cache` runs when that cache is cleared. The function gets a `path`: a route when one page is cleared, or `None` when all pages are cleared.

```python
website_clear_cache = "library.website.clear_cache"
```

## User data privacy

Frappe ships personal data download and deletion. `user_data_fields` declares which doctypes hold personal data so those flows can find and redact it. Each entry is a dict:

```python
user_data_fields = [
    {"doctype": "Access Log", "strict": True},
    {"doctype": "Contact", "filter_by": "email_id", "rename": True},
    {"doctype": "File", "filter_by": "attached_to_name", "redact_fields": ["file_name", "file_url"]},
    {"doctype": "Email Unsubscribe", "filter_by": "email", "partial": True},
]
```

| Key             | Meaning                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| `doctype`       | The doctype that holds user data.                                          |
| `filter_by`     | Field used to find the user's records. Defaults to `owner`.                |
| `redact_fields` | Fields to redact. If unset, redacts personal data from all text fields.    |
| `partial`       | Redact the user's name and username from all text fields.                  |
| `rename`        | Rename the document to anonymize it when its name contains user data.      |
| `strict`        | Redact data from every record of the doctype, not just ones the user owns. |

Download only uses `doctype` and `filter_by`.

## Fixtures

Fixtures let you ship database records as part of your app. They're useful for records you create through the Desk but want to version with code, like Custom Fields, Roles, or Workflows.

The `fixtures` hook lists the doctypes (and optional filters) to include:

```python
fixtures = [
    "Custom Field",
    {"dt": "Role", "filters": [["name", "in", ["Librarian"]]]},
]
```

An entry is either a doctype name (export every record) or a dict with `dt` and `filters` (or `or_filters`) to export a subset.

Export the records to JSON with:

```bash
bench --site <site> export-fixtures --app library
```

This writes one file per doctype to `<app>/<app>/fixtures/`, for example `fixtures/custom_field.json`. Commit those files.

On `bench migrate`, Frappe imports every JSON file under `fixtures/` for each installed app, overwriting matching records on the target site. So fixtures sync one way: export from where you author them, then migrate everywhere else to apply them. If a fixture's doctype doesn't exist on the site, that file is skipped.

## Install and migrate hooks

```python
before_install = "library.install.before_install"
after_install = "library.install.after_install"

before_migrate = "library.migrate.before_migrate"
after_migrate = "library.migrate.after_migrate"

before_uninstall = "library.install.before_uninstall"
after_uninstall = "library.install.after_uninstall"
```

`before_uninstall`/`after_uninstall` run when the app is removed from a site with `bench uninstall-app`.

`after_sync` runs after the app's fixtures are synced. `before_tests` runs once before the test suite starts, which is where you seed data your tests depend on.

```python
after_sync = "library.install.after_sync"
before_tests = "library.tests.before_tests"
```

## Other app install hooks

You can also react to installation and uninstallation of other apps on a site, useful when toggling functionality when a certain app (e.g. integrations) is installed.

```python
before_app_install = "library.integrations.before_app_install"
after_app_install = "library.integrations.after_app_install"

before_app_uninstall = "library.integrations.before_app_uninstall"
after_app_uninstall = "library.integrations.after_app_uninstall"
```

## File hooks

These override how user-uploaded files are stored, so you can write to a CDN or object store instead of the local disk.

```python
before_write_file = "library.overrides.file.before_write"
write_file = "library.overrides.file.write_file"
delete_file_data_content = "library.overrides.file.delete_file"
```

`before_write_file` runs before a file is saved. `write_file` replaces the save itself. `delete_file_data_content` replaces deletion.

## Discovering hooks

The framework's own `hooks.py` is the most complete reference for what each hook expects, so read `frappe/hooks.py` in the source. To see the merged value across all installed apps for any hook:

```python
frappe.get_hooks("doc_events")
frappe.get_hooks("scheduler_events")
```

## Hook index

The commonly used hooks, alphabetically, with the section that covers each.

| Hook                           | Section                                                       |
| ------------------------------ | ------------------------------------------------------------- |
| `after_app_install`            | [Other app install hooks](#other-app-install-hooks)           |
| `after_app_uninstall`          | [Other app install hooks](#other-app-install-hooks)           |
| `after_install`                | [Install and migrate hooks](#install-and-migrate-hooks)       |
| `after_job`                    | [Request and job hooks](#request-and-job-hooks)               |
| `after_migrate`                | [Install and migrate hooks](#install-and-migrate-hooks)       |
| `after_request`                | [Request and job hooks](#request-and-job-hooks)               |
| `after_sync`                   | [Install and migrate hooks](#install-and-migrate-hooks)       |
| `after_uninstall`              | [Install and migrate hooks](#install-and-migrate-hooks)       |
| `app_include_css`              | [Assets](#assets)                                             |
| `app_include_js`               | [Assets](#assets)                                             |
| `app_name`, `app_title`, ...   | [App metadata](#app-metadata)                                 |
| `auth_hooks`                   | [Authentication hooks](#authentication-hooks)                 |
| `before_app_install`           | [Other app install hooks](#other-app-install-hooks)           |
| `before_app_uninstall`         | [Other app install hooks](#other-app-install-hooks)           |
| `before_install`               | [Install and migrate hooks](#install-and-migrate-hooks)       |
| `before_job`                   | [Request and job hooks](#request-and-job-hooks)               |
| `before_migrate`               | [Install and migrate hooks](#install-and-migrate-hooks)       |
| `before_request`               | [Request and job hooks](#request-and-job-hooks)               |
| `before_tests`                 | [Install and migrate hooks](#install-and-migrate-hooks)       |
| `before_uninstall`             | [Install and migrate hooks](#install-and-migrate-hooks)       |
| `before_write_file`            | [File hooks](#file-hooks)                                     |
| `delete_file_data_content`     | [File hooks](#file-hooks)                                     |
| `doc_events`                   | [Document events](#document-events)                           |
| `doctype_js`                   | [Assets](#assets)                                             |
| `extend_bootinfo`              | [Login and session hooks](#login-and-session-hooks)           |
| `fixtures`                     | [Fixtures](#fixtures)                                         |
| `get_website_user_home_page`   | [Website hooks](#home-page)                                   |
| `has_permission`               | [Permission hooks](#permission-hooks)                         |
| `home_page`                    | [Website hooks](#home-page)                                   |
| `jinja`                        | [Jinja and queries](#jinja-and-queries)                       |
| `on_login`                     | [Login and session hooks](#login-and-session-hooks)           |
| `on_logout`                    | [Login and session hooks](#login-and-session-hooks)           |
| `on_session_creation`          | [Login and session hooks](#login-and-session-hooks)           |
| `override_doctype_class`       | [override_doctype_class](#override_doctype_class)             |
| `override_whitelisted_methods` | [override_whitelisted_methods](#override_whitelisted_methods) |
| `page_js`                      | [Assets](#assets)                                             |
| `permission_query_conditions`  | [Permission hooks](#permission-hooks)                         |
| `portal_menu_items`            | [Website hooks](#portal-sidebar)                              |
| `role_home_page`               | [Website hooks](#home-page)                                   |
| `scheduler_events`             | [Scheduler events](#scheduler-events)                         |
| `standard_portal_menu_items`   | [Website hooks](#portal-sidebar)                              |
| `standard_queries`             | [Jinja and queries](#jinja-and-queries)                       |
| `update_website_context`       | [Website hooks](#context)                                     |
| `user_data_fields`             | [User data privacy](#user-data-privacy)                       |
| `web_include_css`              | [Assets](#assets)                                             |
| `web_include_js`               | [Assets](#assets)                                             |
| `webform_include_js`           | [Assets](#assets)                                             |
| `website_clear_cache`          | [Website hooks](#clearing-website-cache)                      |
| `website_context`              | [Website hooks](#context)                                     |
| `website_redirects`            | [Website hooks](#redirects-and-route-rules)                   |
| `website_route_rules`          | [Website hooks](#redirects-and-route-rules)                   |
| `write_file`                   | [File hooks](#file-hooks)                                     |

## See also

- [Controllers & Lifecycle](/doctypes/controllers-lifecycle): the events `doc_events` hooks into.
- [Permissions in code](/server-side/permissions-in-code): `permission_query_conditions` and `has_permission`.
- [Whitelisted Methods](/server-side/whitelisted-methods): overriding endpoints.
- [Background Jobs](/server-side/background-jobs): how scheduler events run.
