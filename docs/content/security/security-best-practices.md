---
title: Security Best Practices
---

# Security Best Practices

A few habits prevent the common ways a Frappe app gets compromised: SQL injection, exposing methods that should be private, leaking secrets, and skipping the framework's built-in checks. This page covers each one.

## Avoid SQL injection

Never build SQL by pasting user input into a string. The moment a value comes from a request, a form, or a filter, treat it as hostile.

The safe options, in order of preference:

Use the ORM. `frappe.db.get_all`, `frappe.db.get_value`, and friends parameterize values for you:

```python
# safe: filters are bound as parameters
frappe.db.get_all("Book", filters={"author": author_name})
```

Use the Query Builder (`frappe.qb`) for anything more complex. It builds parameterized SQL from Python:

```python
from frappe.query_builder import DocType

Book = DocType("Book")
frappe.qb.from_(Book).select(Book.title).where(Book.author == author_name).run()
```

`frappe.qb.get_query` builds a parameterized query from a `filters` dict, the same way the ORM does:

```python
frappe.qb.get_query("Book", fields=["title"], filters={"author": author_name}).run()
```

It defaults to `ignore_permissions=True`, so it does not apply DocType or user permissions. Pass `ignore_permissions=False` when the result depends on what the current user is allowed to see.

If you must write raw SQL, pass values as parameters, never with f-strings or `%` formatting:

```python
# safe: %(author)s is bound, not interpolated
frappe.db.sql(
    "select title from `tabBook` where author = %(author)s",
    {"author": author_name},
)
```

```python
# unsafe: never do this
frappe.db.sql(f"select title from `tabBook` where author = '{author_name}'")
```

When you build a condition string for a hook like `permission_query_conditions`, you cannot use bound parameters, so escape each value with `frappe.db.escape`:

```python
condition = f"`tabBook`.author = {frappe.db.escape(author_name)}"
```

`frappe.db.escape` quotes and escapes the value so it is safe to drop into SQL. Use it only when parameters are not available.

## Use @frappe.whitelist with care

A Python method is callable over HTTP only if it is decorated with `@frappe.whitelist()`. Everything else is private. So only whitelist what you mean to expose, and assume anyone on the internet can call what you do.

```python
@frappe.whitelist()
def issue_book(book, member):
    ...
```

Things to get right on every whitelisted method:

- Check permissions yourself. Whitelisting does not enforce DocType permissions on the arguments. Call `frappe.has_permission(...)` or `frappe.get_doc(...)` (which checks read access) before acting on a record. Use `frappe.only_for("Role")` to gate a method to a role.
- Use `allow_guest=True` only when you truly want unauthenticated access. Without it, the method still requires a logged-in user. With it, anyone can call it, so validate everything.
- Treat all arguments as strings from the client. Validate and convert them. Do not trust a `doctype` or `name` argument to be one the caller is allowed to touch.

```python
@frappe.whitelist()
def issue_book(book, member):
    frappe.only_for("Librarian")
    frappe.has_permission("Book", "write", doc=book, throw=True)
    ...
```

For read-only methods that should never write, mark them `@frappe.whitelist(methods=["GET"])` so they cannot be called with POST.

## CSRF tokens

Frappe protects against cross-site request forgery by requiring a CSRF token on state-changing requests from the browser. The desk includes the token automatically, so your client scripts and `frappe.call` work without extra setup.

You only need to think about it when you build a custom form or call the API from outside the desk. In those cases include the token in the `X-Frappe-CSRF-Token` header (the server injects `frappe.csrf_token` into the page for you). Requests authenticated with an API key and secret instead of a session cookie do not need a CSRF token, since they are not riding on a browser session.

Do not disable CSRF protection to make an integration easier. Use API key authentication for server-to-server calls instead.

## Do not expose secrets

Keep secrets out of code, out of the database where users can read them, and out of responses.

- Store passwords and API secrets in fields of type `Password`. Frappe stores them encrypted and never sends them to the client. Read them back with `doc.get_password("fieldname")`.
- Put site-wide secrets in `site_config.json` and read them with `frappe.conf.get("my_api_key")`. This file is not exposed over HTTP.
- Never log secrets, and never return them from a whitelisted method. Check what your API responses include before shipping.
- Do not commit credentials to your app's repository.

To read an encrypted value tied to a record directly, use `frappe.utils.password.get_decrypted_password(doctype, name, fieldname)`.
