---
title: Sharing User Permissions
---

# Sharing User Permissions

Role permissions decide what a user can do with a DocType. Two more tools work at the level of individual records:

- **DocShare** grants one user access to one specific document, even if their roles would not normally allow it.
- **User Permission** restricts a user to a set of records, so they only see documents linked to allowed values.

DocShare opens a door for a single record. User Permission narrows the set of records a user can reach. They pull in opposite directions and are often used together.

## DocShare: sharing a document

Sharing gives a named user access to a single document. The current user must have `share` permission on the DocType to share its documents. Use `frappe.share.add`:

```python
import frappe

# share Book LIB-BOOK-0001 with jane, read and write
frappe.share.add("Book", "LIB-BOOK-0001", "jane@example.com", write=1)
```

Each share is stored as a `DocShare` record with the rights granted: `read`, `write`, `submit`, and `share`. Rights cascade downward, so granting `write` also grants `read`, and granting `submit` grants both `write` and `read`. You cannot grant `submit` on a DocType that is not submittable.

Share with everyone by passing `everyone=1` instead of a user:

```python
frappe.share.add("Book", "LIB-BOOK-0001", user=None, everyone=1, read=1)
```

To change a single right on an existing share, or to remove access:

```python
# turn write off (this keeps read)
frappe.share.set_permission("Book", "LIB-BOOK-0001", "jane@example.com", "write", value=0)

# remove the share entirely
frappe.share.remove("Book", "LIB-BOOK-0001", "jane@example.com")
```

List who a document is shared with:

```python
frappe.share.get_users("Book", "LIB-BOOK-0001")
```

Sharing can be turned off for the whole site with the "Disable Document Sharing" option in System Settings. When it is off, no one can share, even with `share` permission.

## User Permission: restricting a user to records

A User Permission does the reverse of sharing: it limits a user to records that match an allowed value. For example, allow a salesperson to access only the "Acme" Customer. Once that User Permission exists, the user sees only documents linked to "Acme" through a Link field, plus the "Acme" Customer record itself.

```python
from frappe.permissions import add_user_permission

# jane can only work with the "Acme" customer
add_user_permission("Customer", "Acme", "jane@example.com")
```

This single rule cascades: any DocType with a `Link` field pointing to "Customer" (Sales Order, Quotation, and so on) is now filtered to documents where that link is "Acme". To exclude a Link field from this filtering, set `Ignore User Permissions` on that field.

Useful options when creating a User Permission:

- `applicable_for`: restrict the rule to one target DocType instead of all linked ones. Without it the rule applies to every DocType that links to the allowed value.
- `is_default`: mark this value as the user's default for that DocType, so new documents prefill it.
- `hide_descendants`: for tree (nested set) DocTypes, do not automatically include child nodes of the allowed value.

Remove a User Permission with:

```python
from frappe.permissions import remove_user_permission

remove_user_permission("Customer", "Acme", "jane@example.com")
```

A user with no User Permission for a given DocType is not restricted on it at all. The filtering only kicks in once at least one User Permission exists for that user and that linked DocType.

### Strict user permissions

By default, a document with an empty Link field is not blocked by User Permissions, since there is no value to check. Turn on "Apply Strict User Permissions" in System Settings to also block documents where the restricted Link field is empty. Use this when an empty value should not be a way around the restriction.
