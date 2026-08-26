---
title: User Role Management
---

# User Role Management

Three DocTypes work together to decide who a person is and what they can do: User, Role, and Role Profile. A User holds the account, Roles are assigned to the User, and a Role Profile is a reusable bundle of roles you can apply to many users at once.

## User

The User DocType is the account. It holds login details, the user's name and email, enabled state, and the list of roles assigned to that user. Roles are stored in a child table on the User, so adding a role is just adding a row.

```python
user = frappe.get_doc("User", "jane@example.com")
user.add_roles("Librarian", "Sales User")

# remove a role
user.remove_roles("Sales User")
```

Both methods save the user document themselves, so you do not need a trailing `user.save()`. `add_roles` also skips roles the user already has, so it is safe to call more than once.

### User type and desk access

Every user is either a System User or a Website User. System Users get desk access (the backend UI at `/desk`). Website Users can only use portal pages and the public site. The type is derived from the user's roles: if any assigned role has `desk_access` turned on, the user becomes a System User. This is recalculated automatically when roles or the role's `desk_access` flag change.

## Role

A Role is a named set of access. You assign roles to users, and permission rules on DocTypes are written against roles. See [Permission Model](/security/permission-model) for how rules use roles.

A Role has a few settings of its own:

- `desk_access`: whether holders of this role can use the desk. This is what makes a user a System User.
- `disabled`: turn the role off without deleting it. Disabling a role removes it from all users.
- `two_factor_auth`: require two-factor authentication for users with this role.
- `is_custom`: marks a role you created, as opposed to a standard one shipped by an app.

Some roles are standard and protected: `Administrator`, `System Manager`, `Script Manager`, `All`, and `Guest`. They cannot be renamed, and the system ones cannot be disabled.

To find every user with a role:

```python
from frappe.core.doctype.role.role import get_users

get_users("Librarian")  # list of user ids
```

## Role Profile

A Role Profile is a named group of roles. Instead of assigning the same ten roles to every new salesperson by hand, you make a "Sales" Role Profile once and apply it to each user. The profile holds its roles in a child table.

```python
profile = frappe.get_doc({
    "doctype": "Role Profile",
    "role_profile": "Sales",
    "roles": [
        {"role": "Sales User"},
        {"role": "Sales Manager"},
    ],
})
profile.insert()
```

Assign a profile to a user through the user's "Role Profiles" field. When you change a Role Profile later, the change is pushed to every user that has it: Frappe re-saves each of those users in the background so their role list stays in sync with the profile. That sync runs on a background queue, so updates to large user bases do not block the request.
