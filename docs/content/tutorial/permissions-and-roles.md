---
title: Permissions and Roles
---

# Permissions and Roles

Frappe controls access with **roles**. A role is a named group of permissions
(read, write, create, delete, and more). You assign roles to users, and you grant
permissions to roles per DocType. So far only `Administrator` and the `System
Manager` role can touch your DocTypes. Here you add a **Librarian** role and give
it the access it needs.

## Create the role

Create a new Role record:

```text
http://library.localhost:8000/desk/role/new
```

Set **Role Name** to `Librarian` and save. Leave **Desk Access** ticked so users
with this role can use the Desk.

## Grant permissions on the DocTypes

There are two places to edit permissions, and they store the rules differently:

- The **Role Permissions Manager** (`/desk/permission-manager`) creates **Custom
  DocPerm** records in the database. These are overrides that stay on the site and
  are not written to your app's files.
- The DocType form's **Permissions** table writes the rules into the DocType's
  own JSON. With developer mode on, this keeps them in version control with the
  rest of the schema.

For an app you are building, edit the rules on the DocType so they travel with the
code. Open the Article DocType:

```text
http://library.localhost:8000/desk/doctype/Article
```

Scroll to the **Permissions** section and add a row for the `Librarian` role. Tick
the permissions you want. For a librarian managing the catalogue:

- **Read**, **Write**, **Create**: yes
- **Delete**: leave off if librarians should not remove records
- **Report**, **Export**, **Print**, **Email**: yes for day-to-day work

Save the DocType. Repeat for `Library Member` and `Library Transaction`.

## Where permissions are stored

Because you edited them on the DocType with developer mode on, the rules are
written into the DocType's JSON under `permissions`, so they are tracked in your
app's files. The `permissions` block in `article.json` looks like this:

```json
"permissions": [
 {
  "role": "Librarian",
  "read": 1,
  "write": 1,
  "create": 1,
  "print": 1,
  "report": 1,
  "export": 1
 },
 {
  "role": "System Manager",
  "read": 1,
  "write": 1,
  "create": 1,
  "delete": 1
 }
]
```

## Assign the role to a user

Create a test user and give them the role:

```text
http://library.localhost:8000/desk/user/new
```

Fill in an email and name, then in the **Roles** section tick **Librarian** and
save. Log in as that user (or use a private browser window) to confirm they can
open the Article list, create records, but not see admin-only DocTypes.

## Field-level and row-level access

Two finer controls exist when you need them:

- **Permlevels**: set a field's **Perm Level** to a number above 0 to hide or
  protect it, then grant that level separately in the permission rules. Useful for
  fields only managers should edit.
- **User Permissions**: restrict a user to specific records, for example only the
  members at their branch. These are set per user, not per role.

For checking and enforcing permissions in your own Python code (`frappe.has_permission`,
`ignore_permissions`, and query conditions), see
[Permissions in Code](/server-side/permissions-in-code).

Continue to [Reports and Print](/tutorial/reports-and-print).
