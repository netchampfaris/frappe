---
title: Permissions in Code
---

# Permissions in Code

Frappe enforces role and document permissions automatically when documents are saved and when `frappe.get_list` runs. But in custom server code you often need to check, enforce, or deliberately bypass permissions yourself. This page covers the APIs for doing that correctly.

For how roles and permissions are configured, see the [Permission Model](/security/permission-model). This page is about the Python side.

## Checking permission

`frappe.has_permission` returns a boolean for whether a user can perform an action:

```python
# can the current user read this doctype?
if frappe.has_permission("Task", "read"):
    ...

# check a specific permission type on a specific document
if frappe.has_permission("Task", "write", doc=task_doc):
    ...

# check for another user
frappe.has_permission("Task", "submit", doc=task_doc, user="jane@example.com")
```

Permission types (`ptype`) are `read`, `write`, `create`, `delete`, `submit`, `cancel`, `amend`, and others. The default is `read`.

To **raise** `frappe.PermissionError` instead of returning `False`, pass `throw=True`:

```python
frappe.has_permission("Task", "write", doc=task_doc, throw=True)
```

## Enforcing permission on a document

A loaded document carries permission helpers. `check_permission` raises `frappe.PermissionError` if the current user lacks the given permission:

```python
doc = frappe.get_doc("Task", "TASK-0001")
doc.check_permission("write")   # raises if not allowed
doc.save()
```

`doc.has_permission("write")` is the non-raising variant. The standard `insert()`, `save()`, `submit()`, and `delete()` already perform these checks for you, so call `check_permission` explicitly only when you're doing something outside that flow.

You can also have `get_doc` enforce read permission at load time:

```python
doc = frappe.get_doc("Task", "TASK-0001", check_permission=True)
```

## Restricting to roles

`frappe.only_for` raises `frappe.PermissionError` unless the current user has at least one of the given roles. Use it as a guard at the top of a function:

```python
@frappe.whitelist()
def run_maintenance():
    frappe.only_for("System Manager")
    ...
```

Pass a list to allow any of several roles, and `message=True` for a user-friendly error:

```python
frappe.only_for(["System Manager", "Librarian"], message=True)
```

The `Administrator` user always passes.

## Bypassing permissions

In trusted server code such as background jobs, system-initiated writes, and data migrations, you sometimes need to act regardless of the current user's permissions. There are two patterns.

Pass `ignore_permissions=True` to document operations:

```python
doc.insert(ignore_permissions=True)
doc.save(ignore_permissions=True)
frappe.delete_doc("Task", "TASK-0001", ignore_permissions=True)
```

Or read with `frappe.get_all`, which ignores permissions by design (unlike `frappe.get_list`):

```python
# every Task, regardless of who is running this
frappe.get_all("Task", filters={"status": "Open"})
```

> Only bypass permissions in code paths where you have already established that the action is safe. Never use `ignore_permissions=True` or `get_all` on input that flows straight from an end user without your own access check first. See [get_all vs get_list](/server-side/querying-data#get-all-vs-get-list).

## Row-level filtering: permission_query_conditions

To restrict **which rows** a user sees in list views and `get_list` queries, register a `permission_query_conditions` hook. The function is called with the user and doctype, and returns a SQL condition string that is ANDed into the query:

```python
# hooks.py
permission_query_conditions = {
    "Library Loan": "library.permissions.loan_query_conditions",
}
```

```python
# library/permissions.py
def loan_query_conditions(user, doctype=None):
    user = user or frappe.session.user
    if "Librarian" in frappe.get_roles(user):
        return ""  # no extra restriction
    return f"`tabLibrary Loan`.member = {frappe.db.escape(user)}"
```

Return an empty string for no restriction, and always escape user-controlled values with `frappe.db.escape`. See [Permission Query Conditions](/security/permission-query-conditions) for the full details, including registering against `"*"` for every doctype.

## Per-document checks: has_permission hook

For logic that can't be expressed as a SQL condition, such as checking a specific document against related records, register a `has_permission` hook. It runs in addition to the standard role checks; returning a falsy value denies access:

```python
# hooks.py
has_permission = {
    "Library Loan": "library.permissions.has_loan_permission",
}
```

```python
# library/permissions.py
def has_loan_permission(doc, ptype, user, debug=False):
    if "Librarian" in frappe.get_roles(user):
        return True
    return doc.member == user
```

`permission_query_conditions` controls **lists**; `has_permission` controls access to an **individual document**. Keep them consistent, or a user can reach a document they can't see in the list by guessing its name. See [Permission Query Conditions](/security/permission-query-conditions) for more.

## See also

- [Querying Data](/server-side/querying-data#get-all-vs-get-list): the permission difference between `get_all` and `get_list`.
- [Hooks](/server-side/hooks#permission-hooks): registering `permission_query_conditions` and `has_permission`.
- [Permission Model](/security/permission-model): configuring roles and permission rules.
- [Permission Query Conditions](/security/permission-query-conditions): more on row-level filtering.
