---
title: Listing Documents
---

# Listing Documents

`GET /api/resource/<DocType>` returns a list of documents. It is backed by
`frappe.client.get_list` (which is `frappe.get_list`), so it honours
[user permissions](/server-side/permissions-in-code). A caller only sees rows
they're allowed to read.

```bash
curl https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>"
```

```json
{
  "data": [{ "name": "abc123" }, { "name": "def456" }]
}
```

By default you get only the `name` of each document and at most **20** rows. To
get more, pass query parameters.

## Common parameters

| Parameter           | Purpose                           | Example                           |
| ------------------- | --------------------------------- | --------------------------------- |
| `fields`            | JSON array of fields to return    | `["name","status","description"]` |
| `filters`           | JSON conditions to match (AND-ed) | `[["status","=","Open"]]`         |
| `or_filters`        | JSON conditions to match (OR-ed)  | `[["status","=","Open"]]`         |
| `limit_page_length` | Max rows (use `0` for all)        | `50`                              |
| `limit_start`       | Offset for pagination             | `40`                              |
| `order_by`          | Sort expression                   | `creation desc`                   |
| `as_dict`           | Return objects (default) vs lists | `1`                               |

`fields`, `filters`, `or_filters`, `limit_page_length`, `limit_start` and
`order_by` are passed straight through to `frappe.get_list`. See
[Filters, Fields & Pagination](/rest-api/filters-fields-pagination) for the full
filter syntax.

## Selecting fields

Pass `fields` as a JSON array. Because it contains brackets and quotes,
URL-encode it (curl's `-G --data-urlencode` does this cleanly):

```bash
curl -G https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'fields=["name","status","description"]'
```

```json
{
  "data": [
    { "name": "abc123", "status": "Open", "description": "Buy milk" },
    { "name": "def456", "status": "Closed", "description": "Pay rent" }
  ]
}
```

## Filtering

```bash
curl -G https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'fields=["name","status"]' \
  --data-urlencode 'filters=[["status","=","Open"],["priority","=","High"]]'
```

A list of `[fieldname, operator, value]` triples is AND-ed together. Operators
include `=`, `!=`, `>`, `<`, `>=`, `<=`, `like`, `in`, `not in`, `between`.

## Ordering and pagination

```bash
curl -G https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'fields=["name","creation"]' \
  --data-urlencode 'order_by=creation desc' \
  --data-urlencode 'limit_page_length=20' \
  --data-urlencode 'limit_start=40'
```

This returns rows 41 to 60, newest first. To fetch **all** matching rows in one
call, set `limit_page_length=0`.

## Expanding link fields

By default a Link field returns just the linked document's name. Pass `expand`
(v1 only) to inline the full linked document instead. It's a JSON array of
fieldnames, and each must also be in `fields` (skip this if `fields` is `["*"]`):

```bash
curl -G https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'fields=["name","assigned_by"]' \
  --data-urlencode 'expand=["assigned_by"]'
```

For a single document, pass `expand_links=1` to do the same for all of its Link
and Dynamic Link fields, plus linked rows in table/multiselect fields:

```bash
curl "https://example.com/api/resource/ToDo/abc123?expand_links=1" \
  -H "Authorization: token <api_key>:<api_secret>"
```

## v2 equivalents

The v2 endpoint is `/api/v2/document/<DocType>` and uses `start`/`limit` instead
of `limit_start`/`limit_page_length`. It also reports whether more pages exist via
`has_next_page` at the top level of the response:

```bash
curl -G https://example.com/api/v2/document/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'fields=["name","status"]' \
  --data-urlencode 'filters=[["status","=","Open"]]' \
  --data-urlencode 'start=0' \
  --data-urlencode 'limit=20'
```

```json
{
  "data": [{ "name": "abc123", "status": "Open" }],
  "has_next_page": false
}
```

v2 also gives you a dedicated count endpoint:

```bash
curl https://example.com/api/v2/doctype/ToDo/count \
  -H "Authorization: token <api_key>:<api_secret>"
```

## See also

- [Filters, Fields & Pagination](/rest-api/filters-fields-pagination): full query syntax
- [Querying data](/server-side/querying-data): the server-side `get_list` this maps to
- [Creating & Updating](/rest-api/creating-updating): writing documents
