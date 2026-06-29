---
title: Document Sharing
---

# Document Sharing

Role permissions decide what a user can do with a whole DocType. Document sharing (DocShare) works one record at a time: it grants a named user access to a single document, even if their roles would not normally allow it.

Each share is stored as a `DocShare` record that links a user (or everyone) to one document and holds the rights granted.

## Sharing a document

Use `frappe.share.add`. The current user must have `share` permission on the document, and they can only grant rights they hold themselves.

```python
import frappe

# share Book LIB-BOOK-0001 with jane, read and write
frappe.share.add("Book", "LIB-BOOK-0001", "jane@example.com", write=1)
```

To send the user a notification when you share, pass `notify=1`.

## Share levels

A share can grant four rights: `read`, `write`, `submit`, and `share`. They cascade downward, so the higher rights always include the lower ones:

- granting `write`, `submit`, or `share` also grants `read`.
- granting `submit` also grants `write` (and so `read`).

You cannot grant `submit` on a DocType that is not submittable. Frappe also blocks granting any right that the sharing user does not already have on the document.

## Sharing with everyone

Pass `everyone=1` instead of a user to share with every user on the site:

```python
frappe.share.add("Book", "LIB-BOOK-0001", user=None, everyone=1, read=1)
```

## Changing and removing access

To flip a single right on an existing share, use `frappe.share.set_permission`. Turning `read` off clears the higher rights too, and a share with no rights left is deleted.

```python
# turn write off (this keeps read)
frappe.share.set_permission("Book", "LIB-BOOK-0001", "jane@example.com", "write", value=0)
```

To remove a user's share entirely:

```python
frappe.share.remove("Book", "LIB-BOOK-0001", "jane@example.com")
```

## Listing who a document is shared with

`frappe.share.get_users` returns the `DocShare` records for a document, including the rights on each. It returns an empty list if the current user cannot read the document.

```python
frappe.share.get_users("Book", "LIB-BOOK-0001")
```

## The Shared With panel

On a form, the sidebar has a Share control that opens a dialog of the users the document is shared with. From there a user with `share` permission can add users, toggle read, write, share, and submit rights, or share with everyone. The dialog drives the same `frappe.share` calls described above.

## Turning sharing off

Sharing can be disabled for the whole site with the "Disable Document Sharing" option in System Settings. When it is on, no one can share, even with `share` permission.
