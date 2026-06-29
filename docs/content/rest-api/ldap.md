---
title: LDAP & Active Directory
---

# LDAP & Active Directory

LDAP (Lightweight Directory Access Protocol) is a directory service used for
central authentication, often called single sign-on (SSO). Many organizations
run an LDAP server such as OpenLDAP or Microsoft Active Directory.

Once you set up LDAP in Frappe, users can sign in with their LDAP credentials.
On each login Frappe binds to the directory, reads the user's attributes, creates
or updates the matching Frappe user, and syncs their roles from LDAP group
membership. Frappe is tested against OpenLDAP and Active Directory, and any
standards-compliant LDAP directory should work.

You configure everything in a single **LDAP Settings** DocType. Open it, fill in
the fields below, and tick **Enabled**. When you enable it, Frappe validates the
settings by binding to your server and searching the user and group paths. If
anything is wrong the save fails with an error, so the settings only save once
they work.

## Server

- **Directory Server**: pick `Active Directory`, `OpenLDAP`, or `Custom`. Choose
  `Custom` when your groups use a different object class such as `groupOfNames`
  or `uniqueGroupOfNames`. See [Custom directory](#custom-directory).
- **LDAP Server Url**: the URL of your server, for example `ldap://server:389`
  or `ldaps://server:636`.

## Bind account

Frappe binds to the directory with a service account to look up users.

- **Base Distinguished Name (DN)**: the DN of the bind user. This account needs
  read access to the search paths below. It also needs write access if you want
  users to reset their passwords through Frappe.
- **Password for Base DN**: the password for that bind user.

## Search and paths

- **LDAP search path for Users**: the container DN that holds your users, for
  example `ou=users,dc=example,dc=com`. A user must live under this path to log
  in.
- **LDAP search path for Groups**: the container DN that holds your groups, for
  example `ou=groups,dc=example,dc=com`.
- **LDAP Search String**: the filter that matches the value a user types on the
  login screen against a directory entry. It must be wrapped in parentheses and
  contain the `{0}` placeholder, which Frappe replaces with the login name. Any
  filter your directory supports works here. Examples:

  ```text
  (uid={0})
  (sAMAccountName={0})
  (&(description=*ACCESS:Frappe*)(uid={0}))
  (&(sAMAccountName={0})(memberOf=cn=Domain Users,ou=Groups,dc=example,dc=com))
  ```

  Use `uid` for OpenLDAP and `sAMAccountName` for Active Directory. The third
  and fourth examples restrict login to users matched by a description or by
  group membership.

## User creation and attribute mapping

These fields name the LDAP attributes Frappe reads to build the Frappe user.

- **LDAP Email Field** (required): attribute holding the email address, usually
  `mail`.
- **LDAP Username Field** (required): attribute holding the username, `uid` for
  OpenLDAP or `sAMAccountName` for Active Directory.
- **LDAP First Name Field** (required): attribute holding the first name, often
  `givenName`.
- **LDAP Middle Name Field**, **LDAP Last Name Field**, **LDAP Phone Field**,
  **LDAP Mobile Field**: optional attributes mapped to the matching Frappe user
  fields, for example `sn` for the last name.

- **Default User Type** (required): the User Type assigned to a newly created
  user. Defaults to `Website User`. Role syncing only applies when this is set
  to `System User`.
- **Default User Role**: the role assigned to a new System User on creation.
- **Do Not Create New User**: if checked, users that do not already exist in
  Frappe are not created on login.

## Security (TLS)

This section is optional but recommended for a secure connection to the
directory.

- **SSL/TLS Mode**: set to `StartTLS` to upgrade the connection with StartTLS,
  or `Off` to leave it as is. If the server does not support StartTLS you get an
  error and should check the server configuration.
- **Require Trusted Certificate**: set to `Yes` to require that the server's
  certificate is trusted by the Frappe host. `No` skips this check and is not
  recommended.

When you require a trusted certificate, give the absolute paths to the
certificate files on the Frappe server:

- **Path to private Key File**
- **Path to Server Certificate**
- **Path to CA Certs File**

To trust a self-signed certificate or your own certificate authority, add it to
the trusted certificate store of the host operating system.

## Custom directory

These fields are required only when **Directory Server** is `Custom`. They
describe how your directory models groups.

- **Group Object Class**: the object class of group entries, for example
  `groupOfNames`.
- **LDAP Group Member attribute**: the attribute on a group entry that lists its
  members, for example `member`.
- **Custom Group Search**: an optional search string used to find the groups a
  user belongs to. If filled, it must contain the `{0}` placeholder for the user
  value, for example `uid={0},ou=users,dc=example,dc=com`.

## Group to role mapping

Frappe maps the LDAP groups a user belongs to onto Frappe roles. Roles are
synced on every login, so a user's roles are added or removed to match their
current group membership. Mapping applies to System Users.

In the **LDAP Group Mappings** table, add a row per mapping:

- **LDAP Group**: the group's common name (`cn`), for example `Domain Users`.
  Use the bare `cn` value, not the full DN.
- **User Role**: the Frappe role to grant members of that group.

## Logging in

After you enable LDAP, the login page shows a **Login with LDAP** button. Users
enter the value matched by your search string along with their LDAP password to
sign in.
