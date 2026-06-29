---
title: User Permissions
---

# User Permissions

A User Permission restricts a user to the records that match an allowed value. Where document sharing opens a door for one record, a User Permission narrows the set of records a user can reach. For example, allow a salesperson to access only the "Acme" Customer, and they see only documents linked to "Acme", plus the "Acme" record itself.

Each rule is a `User Permission` record with three core fields: `user`, `allow` (the DocType of the allowed value), and `for_value` (the allowed value).

## Adding a User Permission

```python
from frappe.permissions import add_user_permission

# jane can only work with the "Acme" customer
add_user_permission("Customer", "Acme", "jane@example.com")
```

This single rule cascades. Any DocType with a `Link` field pointing to "Customer" (Sales Order, Quotation, and so on) is now filtered to documents where that link is "Acme". To exclude a Link field from this filtering, turn on "Ignore User Permissions" on that field.

A user with no User Permission for a given DocType is not restricted on it at all. The filtering only kicks in once at least one User Permission exists for that user and that linked DocType.

## Apply to all doctypes

By default a User Permission applies to every DocType that links to the allowed value. This is the `apply_to_all_doctypes` flag, which is on unless you set `applicable_for`.

Set `applicable_for` to restrict the rule to a single target DocType instead of all linked ones:

```python
add_user_permission("Customer", "Acme", "jane@example.com", applicable_for="Sales Order")
```

## Default values

Mark a value as the user's default for a DocType with `is_default`. New documents then prefill that value in the matching Link field.

```python
add_user_permission("Customer", "Acme", "jane@example.com", is_default=1)
```

## Tree doctypes

For tree (nested set) DocTypes, a User Permission on a parent node includes its descendant nodes by default. Pass `hide_descendants=1` to allow only the named value and not its children.

## Removing a User Permission

```python
from frappe.permissions import remove_user_permission

remove_user_permission("Customer", "Acme", "jane@example.com")
```

## How it fits the permission system

User Permissions are checked on top of role permissions, not instead of them. A user still needs a role rule that grants the action; the User Permission then filters which records that rule reaches. Both are applied when you pass a `doc` to `frappe.has_permission` and when list views are filtered.

### Strict user permissions

By default, a document with an empty restricted Link field is not blocked, since there is no value to check. Turn on "Apply Strict User Permissions" in System Settings to also block documents where the restricted Link field is empty. Use this when an empty value should not be a way around the restriction.
