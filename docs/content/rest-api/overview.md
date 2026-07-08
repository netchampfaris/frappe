---
title: Overview
tableFirstCol: 9rem
---

# Overview

Frappe exposes every DocType and every whitelisted Python function over HTTP as a
JSON REST API. There is nothing to enable or scaffold. As soon as you define a
DocType or whitelist a method, it is callable over the network (subject to
[Authentication](/rest-api/authentication) and
[permissions](/server-side/permissions-in-code)).

The API has two halves:

- **Resource API**: CRUD over DocTypes at `/api/resource/<DocType>`.
- **Method API**: RPC to whitelisted functions at `/api/method/<dotted.path>`.

## Resource vs Method

```text
/api/resource/<DocType>            # query / create a collection
/api/resource/<DocType>/<name>     # read / update / delete one document
/api/method/<dotted.path.to.fn>    # call a whitelisted function
```

Use the **resource** endpoints for standard document operations: list,
read, create, update, delete. The HTTP verb selects the operation:

| Verb     | Endpoint                         | Action                                           |
| -------- | -------------------------------- | ------------------------------------------------ |
| `GET`    | `/api/resource/<DocType>`        | [List documents](/rest-api/listing-documents)    |
| `POST`   | `/api/resource/<DocType>`        | [Create a document](/rest-api/creating-updating) |
| `GET`    | `/api/resource/<DocType>/<name>` | Read one document                                |
| `PUT`    | `/api/resource/<DocType>/<name>` | [Update a document](/rest-api/creating-updating) |
| `DELETE` | `/api/resource/<DocType>/<name>` | Delete a document                                |

Use the **method** endpoints when you need behaviour that isn't plain CRUD, like a
report, a bulk action, or a custom calculation. Any function decorated with
`@frappe.whitelist()` is reachable. See
[Calling Methods](/rest-api/calling-methods) and
[Whitelisted Methods](/server-side/whitelisted-methods).

```bash
# Read a single ToDo
curl https://example.com/api/resource/ToDo/abc123 \
  -H "Authorization: token <api_key>:<api_secret>"

# Call a whitelisted function
curl https://example.com/api/method/frappe.client.get_count \
  -G --data-urlencode 'doctype=ToDo' \
  -H "Authorization: token <api_key>:<api_secret>"
```

## API versions: v1 and v2

Frappe ships two API versions. The router mounts them like this (see
`frappe/api/__init__.py`):

```text
/api/...           -> v1   (unversioned paths default to v1)
/api/v1/...        -> v1
/api/v2/...        -> v2
```

So `/api/resource/ToDo` and `/api/v1/resource/ToDo` are the same thing. v1 is the
unversioned default and is still used by most existing clients. **For new
integrations, prefer v2.** It has cleaner paths, simpler pagination, and built-in
bulk operations (see below).

### What v2 changes

v2 uses different path segments and a cleaner contract. The main differences:

- The resource path is **`/api/v2/document/<DocType>`** (not `/resource/`), and
  the collection helpers live under `/api/v2/doctype/<DocType>`.
- Pagination uses **`start`** and **`limit`** (v1 uses `limit_start` and
  `limit_page_length`).
- List responses set **`has_next_page`** in the response so you can paginate
  without a separate count call.
- It adds first-class **bulk** operations plus `count` and `meta` endpoints.

v2 route map (from `frappe/api/v2.py`; not exhaustive):

| Verb          | v2 Endpoint                                    | Action                        |
| ------------- | ----------------------------------------------- | ------------------------------ |
| `GET`         | `/api/v2/document/<DocType>`                   | List documents                 |
| `POST`        | `/api/v2/document/<DocType>`                   | Create a document              |
| `GET`         | `/api/v2/document/<DocType>/<name>`            | Read one document              |
| `PUT`/`PATCH` | `/api/v2/document/<DocType>/<name>`            | Update a document              |
| `DELETE`      | `/api/v2/document/<DocType>/<name>`            | Delete a document              |
| `GET`         | `/api/v2/document/<DocType>/<name>/copy`       | Get a clean copy to re-insert  |
| `GET`/`POST`  | `/api/v2/document/<DocType>/<name>/method/<m>` | Run a doc method                |
| `POST`        | `/api/v2/document/<DocType>/bulk_update`       | Bulk update (one doctype)      |
| `POST`        | `/api/v2/document/<DocType>/bulk_delete`       | Bulk delete (one doctype)      |
| `POST`        | `/api/v2/method/bulk_update`                   | Bulk update across doctypes    |
| `POST`        | `/api/v2/method/bulk_delete`                   | Bulk delete across doctypes    |
| `GET`         | `/api/v2/doctype/<DocType>/count`              | Count records                  |
| `GET`         | `/api/v2/doctype/<DocType>/meta`               | Get DocType meta                |
| `GET`/`POST`  | `/api/v2/method/<dotted.path>`                 | Call a method                   |
| `GET`/`POST`  | `/api/v2/method/<DocType>/<method>`            | Call a method via a DocType's controller module |
| `GET`/`POST`  | `/api/v2/method/run_doc_method`                | Run a controller method on an in-memory document |

Use v2 for new code. v1 is still supported and the examples across these pages
use the v1 paths, which map to the v2 endpoints above.

## Response shape

Every JSON response wraps the payload in a `data` key:

```json
{
  "data": { "name": "abc123", "status": "Open", "description": "Buy milk" }
}
```

List endpoints return an array under `data`. Errors return a non-2xx status with
an `exc_type` and a server message; with traceback logging on, an `exception`
field is included.

## Next steps

- [Authentication](/rest-api/authentication): get a token before you call anything
- [Listing Documents](/rest-api/listing-documents): query collections
- [Creating & Updating](/rest-api/creating-updating): write data
- [Calling Methods](/rest-api/calling-methods): invoke whitelisted functions
