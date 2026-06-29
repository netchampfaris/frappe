---
title: Whitelisted Methods
---

# Whitelisted Methods

By default, no Python function is reachable over HTTP. To expose one so the browser, a mobile app, or a REST client can call it, decorate it with `@frappe.whitelist()`. This is how you build custom server endpoints in a Frappe app.

## Defining an endpoint

Put the function anywhere in your app (a `<app>/api.py` module is the convention) and whitelist it:

```python
# library/library/api.py
import frappe

@frappe.whitelist()
def get_overdue_loans(member: str):
    return frappe.get_all(
        "Library Loan",
        filters={"member": member, "status": "Overdue"},
        fields=["name", "book", "due_date"],
    )
```

It's now callable at `/api/method/library.library.api.get_overdue_loans` (the full dotted import path).

Only logged-in users can call a whitelisted method, and the framework still enforces document permissions inside it (because you used `get_all` here, it does not; use [`get_list`](/server-side/querying-data) if you want per-user filtering). Whitelisting only opens the door; it does not bypass permissions.

### Argument types

Arguments arrive as strings from HTTP. If you add type annotations, Frappe coerces incoming values to the declared types automatically:

```python
@frappe.whitelist()
def renew_loan(loan: str, days: int = 14):
    # `days` is converted from "14" to the int 14
    ...
```

Frappe expects type annotations on whitelisted methods by default (governed by the `require_type_annotated_api_methods` hook). Annotate your parameters.

## Restricting HTTP methods

By default a whitelisted function accepts `GET`, `POST`, `PUT`, and `DELETE`. For anything that changes data, restrict it to write methods so it can't be triggered by a simple link or image tag:

```python
@frappe.whitelist(methods=["POST"])
def create_loan(book: str, member: str):
    doc = frappe.get_doc({
        "doctype": "Library Loan",
        "book": book,
        "member": member,
    })
    doc.insert()
    return doc.name
```

## Allowing guests

To make an endpoint reachable without logging in (e.g. a public signup or webhook), pass `allow_guest=True`:

```python
@frappe.whitelist(allow_guest=True)
def public_book_count():
    return frappe.db.count("Library Book", {"published": 1})
```

Guest-accessible endpoints are a common attack surface. Validate every input, never trust the caller, and keep what they can read or do to a minimum.

## Whitelisting controller methods

You can whitelist a method **on a Document controller**. It then runs against a specific document and is callable from the client with the doc's context:

```python
# library/library/doctype/library_loan/library_loan.py
from frappe.model.document import Document

class LibraryLoan(Document):
    @frappe.whitelist()
    def mark_returned(self):
        self.status = "Returned"
        self.return_date = frappe.utils.today()
        self.save()
```

When called this way, the framework loads the document with `check_permission=True` (the user must be able to read it) before running the method.

## Calling from the client

From browser JavaScript, use `frappe.call` for module-level functions:

```javascript
frappe.call({
    method: "library.library.api.get_overdue_loans",
    args: { member: "MEMBER-0001" },
    callback: (r) => {
        console.log(r.message); // the function's return value
    },
});
```

The return value is always under `r.message`.

To call a whitelisted **controller method**, use the form's helper, which sends the current document along:

```javascript
frm.call("mark_returned").then((r) => {
    frm.reload_doc();
});
```

## Calling over REST

Whitelisted methods are also plain HTTP endpoints. `GET` for reads, `POST` for writes; authenticate with a token or session.

```bash
curl -X POST https://mysite.localhost/api/method/library.library.api.create_loan \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{"book": "BOOK-0001", "member": "MEMBER-0001"}'
```

The response wraps the return value in a `message` key:

```json
{ "message": "LOAN-0001" }
```

See the [REST API](/rest-api/overview) section for authentication and the document CRUD endpoints.

## Overriding a method

To replace another app's (or core's) whitelisted method without editing it, map the original dotted path to your replacement with the `override_whitelisted_methods` hook:

```python
# hooks.py
override_whitelisted_methods = {
    "frappe.client.get_count": "library.overrides.get_count",
}
```

See [Hooks](/server-side/hooks#override-whitelisted-methods).

## See also

- [Permissions in code](/server-side/permissions-in-code): enforcing access inside endpoints.
- [REST API](/rest-api/overview): auth and the built-in resource endpoints.
- [Hooks](/server-side/hooks): overriding and extending whitelisted methods.
