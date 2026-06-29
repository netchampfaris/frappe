---
title: Creating, Updating & Deleting
---

# Creating, Updating & Deleting

Write operations use the single-resource endpoints and standard HTTP verbs.
`POST` creates, `PUT` updates, `DELETE` removes. Each goes through the normal
document lifecycle (validation, controller hooks, permissions), exactly as a Desk
save would. See [Controllers & lifecycle](/doctypes/controllers-lifecycle).

## Create a document

`POST /api/resource/<DocType>` with a JSON body of field values. Don't include
`doctype` in the body. It comes from the URL.

```bash
curl -X POST https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{
        "description": "Buy milk",
        "priority": "High"
      }'
```

The response is the created document, including server-set fields like `name`,
`creation` and `owner`:

```json
{
  "data": {
    "name": "abc123",
    "description": "Buy milk",
    "priority": "High",
    "status": "Open",
    "owner": "jane@example.com",
    "creation": "2026-06-27 10:00:00.000000"
  }
}
```

### Child tables

Provide child rows as a nested array on the table field:

```bash
curl -X POST https://example.com/api/resource/Quotation \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{
        "party_name": "ACME",
        "items": [
          { "item_code": "WIDGET", "qty": 2 },
          { "item_code": "GADGET", "qty": 1 }
        ]
      }'
```

## Update a document

`PUT /api/resource/<DocType>/<name>` with only the fields you want to change. The
document is loaded, updated, and saved (running validation and `on_update`).

```bash
curl -X PUT https://example.com/api/resource/ToDo/abc123 \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "Closed" }'
```

The full updated document is returned under `data`.

> To replace child table rows, send the entire `items` array. It's set wholesale,
> not merged row by row.

## Delete a document

`DELETE /api/resource/<DocType>/<name>`. There's no body. On success the response
status is **202 Accepted** with `"ok"`.

```bash
curl -X DELETE https://example.com/api/resource/ToDo/abc123 \
  -H "Authorization: token <api_key>:<api_secret>"
```

If the document doesn't exist, the request fails (it does not silently succeed).

## Submitting and cancelling

There is no HTTP verb for submit/cancel. These are document **methods**, so call
them on the single resource with `POST` and a `run_method` argument:

```bash
# Submit a submittable document
curl -X POST https://example.com/api/resource/Sales%20Invoice/INV-0001 \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{ "run_method": "submit" }'
```

See [docstatus](/doctypes/docstatus) for the draft/submitted/cancelled model and
[Calling Methods](/rest-api/calling-methods) for running document methods.

## v2 equivalents

v2 uses `/api/v2/document/<DocType>` for create and
`/api/v2/document/<DocType>/<name>` for read/update/delete. Update accepts `PUT`
or `PATCH`. v2 also adds bulk routes:

```bash
# Bulk update many documents of one DocType
curl -X POST https://example.com/api/v2/document/ToDo/bulk_update \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{
        "docs": [
          { "name": "abc123", "status": "Closed" },
          { "name": "def456", "status": "Closed" }
        ]
      }'
```

```bash
# Bulk delete by name
curl -X POST https://example.com/api/v2/document/ToDo/bulk_delete \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Content-Type: application/json" \
  -d '{ "names": ["abc123", "def456"] }'
```

Bulk operations run inline for small batches; above a configurable threshold
(`bulk_operation_async_threshold`, default 20) they are enqueued as a background
job and the response returns `202` with a `job_id`.

## See also

- [Calling Methods](/rest-api/calling-methods): submit, cancel and custom actions
- [Controllers & lifecycle](/doctypes/controllers-lifecycle): what runs on save
- [Listing Documents](/rest-api/listing-documents): reading data back
