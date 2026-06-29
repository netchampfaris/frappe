---
title: Calling Methods
---

# Calling Methods

Sometimes you need more than CRUD, like a report, a custom action, or a
calculation. For that, call a **whitelisted function** directly over HTTP. Any
Python function decorated with `@frappe.whitelist()` is reachable at:

```text
/api/method/<dotted.path.to.function>
```

The path is the function's full import path. See
[Whitelisted Methods](/server-side/whitelisted-methods) for how to expose your
own.

## A simple call

```python
# my_app/api.py
import frappe

@frappe.whitelist()
def greet(name):
    return f"Hello, {name}!"
```

```bash
curl -G https://example.com/api/method/my_app.api.greet \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'name=Jane'
```

The return value comes back under `message`:

```json
{ "message": "Hello, Jane!" }
```

## Passing arguments

Function arguments map to request parameters by name.

- **GET**: pass args as query parameters.
- **POST**: pass args as a JSON body (or form fields).

```bash
# GET with query params
curl -G https://example.com/api/method/frappe.client.get_value \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'doctype=ToDo' \
  --data-urlencode 'filters={"status":"Open"}' \
  --data-urlencode 'fieldname=name'
```

```bash
# POST with a JSON body
curl -X POST https://example.com/api/method/my_app.api.greet \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{ "name": "Jane" }'
```

Complex arguments (lists, dicts) are JSON. As a query param, send the JSON string
URL-encoded. In a POST body, send them as native JSON.

### GET vs POST and `allow_guest`

A whitelisted method that does not opt into specific HTTP methods is callable via
both GET and POST. Restrict it with `@frappe.whitelist(methods=["POST"])`, and
allow unauthenticated access with `@frappe.whitelist(allow_guest=True)`. Read
[Whitelisted Methods](/server-side/whitelisted-methods) before exposing anything
publicly.

## Running a method on a document

To run a controller method bound to a specific document, POST to the single
resource with `run_method`:

```bash
curl -X POST https://example.com/api/resource/Sales%20Invoice/INV-0001 \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{ "run_method": "submit" }'
```

The method must be whitelisted on the controller. `GET` requires read permission;
`POST` requires write permission.

In v2 this is a dedicated route:

```bash
curl -X POST "https://example.com/api/v2/document/Sales%20Invoice/INV-0001/method/submit" \
  -H "Authorization: token <api_key>:<api_secret>"
```

## Uploading files

Use the built-in `upload_file` method. Send `multipart/form-data` with the file
plus optional metadata to attach it to a document:

```bash
curl -X POST https://example.com/api/method/upload_file \
  -H "Authorization: token <api_key>:<api_secret>" \
  -F "file=@/path/to/photo.png" \
  -F "doctype=ToDo" \
  -F "docname=abc123" \
  -F "is_private=1"
```

The response contains the created **File** document, including its `file_url`:

```json
{
  "message": {
    "name": "xyz789",
    "file_name": "photo.png",
    "file_url": "/private/files/photo.png",
    "is_private": 1,
    "attached_to_doctype": "ToDo",
    "attached_to_name": "abc123"
  }
}
```

Omit `doctype`/`docname` to upload an unattached file. Use `is_private=1` for files
that should require authentication to access.

## See also

- [Whitelisted Methods](/server-side/whitelisted-methods): exposing and securing functions
- [Creating & Updating](/rest-api/creating-updating): for plain CRUD
- [Overview](/rest-api/overview): resource vs method endpoints
