---
title: Permission Query Conditions
---

# Permission Query Conditions

Role permissions decide whether a user can see a DocType at all. They do not, on their own, filter which rows of that DocType show up in a list. For row-level filtering you use two hooks: `permission_query_conditions` to filter list and report queries, and `has_permission` to allow or deny access to a single document.

These hooks run on top of the role permission system. They can only take access away, never grant access the user does not already have through their roles.

## permission_query_conditions

This hook lets you add a SQL `WHERE` condition to every list, report, and count query for a DocType. Use it to limit which records a user sees in the list view.

Register the hook in your app's `hooks.py`:

```python
# library/hooks.py
permission_query_conditions = {
    "Book": "library.permissions.book_query_conditions",
}
```

The function receives the user and must return a SQL condition string, or an empty string for no extra filtering:

```python
# library/permissions.py
import frappe

def book_query_conditions(user):
    if not user:
        user = frappe.session.user

    # librarians see everything
    if "Librarian" in frappe.get_roles(user):
        return ""

    # everyone else sees only public books
    return "`tabBook`.is_public = 1"
```

The returned string is inserted into the query, so reference columns with the full backticked table name (`` `tabBook` ``). Build any user-supplied value with `frappe.db.escape` to avoid SQL injection:

```python
def book_query_conditions(user):
    user = user or frappe.session.user
    branch = frappe.db.get_value("Library Member", {"user": user}, "branch")
    return f"`tabBook`.branch = {frappe.db.escape(branch)}"
```

You can register the same hook against `"*"` to apply a condition to every DocType. Frappe joins the conditions from all matching functions with `and`.

## has_permission

The `permission_query_conditions` hook handles lists. To control access to a single document, like when someone opens a form or you call `frappe.has_permission(doc=...)`, use the `has_permission` hook.

```python
# library/hooks.py
has_permission = {
    "Book": "library.permissions.book_has_permission",
}
```

The function receives the document, the permission type, the user, and returns `True` to allow or `False` to deny:

```python
# library/permissions.py
def book_has_permission(doc, ptype=None, user=None, debug=False):
    user = user or frappe.session.user

    if "Librarian" in frappe.get_roles(user):
        return True

    # non-librarians can only touch public books
    return bool(doc.is_public)
```

Like the query hook, this is a controller check that can only deny. If the user's roles already deny access, returning `True` here will not grant it. Returning `False` blocks the action even if the roles would have allowed it.

Keep the two hooks consistent. If `permission_query_conditions` hides a record from the list but `has_permission` would still allow opening it directly, a user could reach a document they should not see by guessing its name. Write both so they agree on the same rule.
