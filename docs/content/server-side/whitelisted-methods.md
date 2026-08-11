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

Whitelisting only authenticates the request; it decides who may call the function at all (a logged-in user, or a guest if `allow_guest=True`). It does not by itself enforce document permissions. Whether permissions are checked depends on what the function calls inside: `frappe.get_all` skips permissions, while `frappe.get_list` and document methods like `insert`/`save`/`delete` enforce them. The example above uses `get_all`, so it returns every matching Library Loan regardless of who's asking; use [`get_list`](/server-side/querying-data) if you want per-user filtering.

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

Over HTTP, controller methods go through the built-in `run_doc_method` endpoint. Pass the doctype as `dt`, the document name as `dn`, and the method name:

```bash
curl -X POST https://mysite.localhost/api/v2/method/run_doc_method \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{"dt": "Library Loan", "dn": "LOAN-0001", "method": "mark_returned"}'
```

## Calling from the client

`frappe.call` is available in Desk (the `/desk` interface) and on Frappe-rendered website pages, since the website JS bundle ships it too. It is not available in a fully custom frontend (a separate SPA, a non-Frappe site); call the method over REST there instead. `frm.call` is narrower still: it only exists on a form, so you can use it inside Desk form scripts.

From browser JavaScript inside Desk (or a Frappe-rendered website page), use `frappe.call` for module-level functions:

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
curl -X POST https://mysite.localhost/api/v2/method/library.library.api.create_loan \
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

Override with care. Once a method is mapped, every caller silently runs your replacement instead of the original, which makes failures hard to trace: the code at the dotted path is not what actually ran. Keep the override's behavior close to the original and document why it exists.

See [Hooks](/server-side/hooks#override-whitelisted-methods).

## See also

- [Permissions in code](/server-side/permissions-in-code): enforcing access inside endpoints.
- [REST API](/rest-api/overview): auth and the built-in resource endpoints.
- [Hooks](/server-side/hooks): overriding and extending whitelisted methods.
