---
title: Permission Model
---

# Permission Model

Frappe decides what a user can do by matching the user's roles against permission rules defined on each DocType. A rule says "this role can do these things at this permission level". When a user tries to read, write, or submit a document, Frappe collects all rules that apply to the user's roles and checks if any of them grant that action.

This page uses one running example: a library app with a `Book` DocType and three roles, `Librarian`, `Library Member`, and `Library Manager`. Each section is explained against that example.

You can check a permission in code with `frappe.has_permission`:

```python
# can the current user write to this Book?
frappe.has_permission("Book", "write", doc="LIB-BOOK-0001")

# does the user have create access on the Book doctype at all?
frappe.has_permission("Book", "create")
```

If you pass `doc`, Frappe also checks User Permissions, document sharing, and `if_owner` rules. Without `doc`, it only checks role-level access on the DocType.

## Roles

A role is a named bucket of access, like "Librarian" or "Library Member". Users are assigned roles, and permission rules are written against roles, never against individual users directly. To get a user's roles:

```python
frappe.get_roles("jane@example.com")
```

Some roles are assigned automatically based on the user type:

- `Guest`: every unauthenticated request, but also every logged-in user. Frappe adds `Guest` to everyone's role list regardless of who they are, so a DocPerm rule granted to `Guest` is effectively public: any user, logged in or not, gets it.
- `All`: every logged-in user, including website users.
- `Desk User`: every System User (someone with desk access).
- `Administrator`: the superuser. The Administrator bypasses all permission checks and is granted every right on every DocType.

The `System Manager` role is the standard admin role for day-to-day setup. It is not automatic, but it grants broad access to settings, imports, and exports.

## The DocPerm table

Permission rules live in the `DocPerm` child table, attached to each DocType under its "Permissions" section. Each row is one rule and holds:

- `role`: which role the rule applies to.
- `permlevel`: the permission level (see below).
- `if_owner`: restrict this rule to documents the user created.
- one flag per permission type: `read`, `write`, `create`, and so on.

You edit these rules through the Role Permissions Manager (Desk > Role Permissions Manager) rather than by hand. When you change a DocType's permissions there, Frappe copies the standard `DocPerm` rows into a `Custom DocPerm` table for that DocType so your changes survive app updates. From then on the `Custom DocPerm` rows are the ones in effect.

In code you can add a rule with:

```python
from frappe.permissions import add_permission, update_permission_property

# give "Librarian" read access at permlevel 0
add_permission("Book", "Librarian", permlevel=0, ptype="read")

# then turn on write for the same role and level
update_permission_property("Book", "Librarian", 0, "write", value=1)
```

## Permission levels (permlevel)

Permission levels let you protect specific fields, not just whole documents. Every field has a `permlevel`, which defaults to `0`. A permission rule also has a `permlevel`. A user can see or edit a field only if they have a rule at that field's level.

Level `0` covers the document as a whole. Higher levels (1, 2, ...) are usually used to lock down a handful of sensitive fields.

Take the `Book` DocType. Most fields, like `title` and `author`, stay at permlevel 0, so the `Librarian` rule at permlevel 0 covers them. Now say the `purchase_price` field should be visible and editable only to the `Library Manager`. Set that field's `permlevel` to 1, then add a second `DocPerm` row:

- permlevel 0, role `Librarian`, with `read` and `write`. This covers `title`, `author`, and the rest.
- permlevel 1, role `Library Manager`, with `read` and `write`. This covers `purchase_price`.

A `Librarian` has no rule at permlevel 1, so they never see `purchase_price`. A `Library Manager` who also has the permlevel 0 rule (through their roles) can edit the whole document including the price. Field-level access is decided this way: for each field, Frappe checks whether the user has a matching rule at that field's level.

Most permission checks in code run against level 0. Field-level access is applied when the form loads and when a document is saved.

## Permission types

These are the actions a rule can grant. The full list lives in `frappe.permissions.std_rights`:

- `read`: view the document.
- `write`: edit and save.
- `create`: make new documents.
- `delete`: delete documents.
- `submit`: submit a submittable document (move it to docstatus 1).
- `cancel`: cancel a submitted document (docstatus 2).
- `amend`: create a new draft from a cancelled document.
- `report`: use the document type in Report view and query reports.
- `export`: export records to CSV or Excel.
- `import`: import records from a file.
- `share`: share individual documents with other users.
- `print`: print or download as PDF.
- `email`: email the document from the form.
- `select`: pick the document in a Link field. `select` is implied by `read`, so a user who can read a DocType can also select its records.

`submit`, `cancel`, and `amend` only do anything on submittable DocTypes. `import` only works if the DocType allows imports.

## if_owner

A rule with `if_owner` checked applies only to documents the user created (where `owner` equals the user). This is how you let people manage their own records without seeing everyone else's.

A common setup: give the `Library Member` role `read` and `write` with `if_owner` on a "Book Review" DocType. Members can then read and edit their own reviews, but not those of other people. When `if_owner` rules exist, Frappe still grants `read` and `select` so the user can open list views, then filters the list down to documents they own.

The `owner` field is set automatically to the creating user and is not editable through the form, so `if_owner` is a reliable boundary for normal use. Code with direct database access (`db_set`, raw SQL) can still change it.
