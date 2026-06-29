---
title: Filters, Fields & Pagination
---

# Filters, Fields & Pagination

This page is the reference for the query parameters used by
[Listing Documents](/rest-api/listing-documents): which fields to return, how to
filter, sort, and page through results. All of these are JSON values sent as query
parameters, so they must be URL-encoded. The examples use curl's
`-G --data-urlencode`, which encodes for you.

## Field selection

`fields` is a JSON array of column names. Without it you get only `name`.

```bash
curl -G https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'fields=["name","status","priority","description"]'
```

You can fetch all fields with `["*"]`, and you can pull fields from a linked
DocType using dotted notation in `get_list`-style queries (e.g.
`"customer.customer_name"`), though plain field names cover most cases.

## Filters

`filters` accepts two shapes.

### List of conditions

Each condition is `[fieldname, operator, value]`, all AND-ed together:

```bash
curl -G https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'filters=[["status","=","Open"],["priority","=","High"]]'
```

### Simple equality dict

For straight equality, a JSON object is shorter:

```bash
curl -G https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'filters={"status":"Open","priority":"High"}'
```

### Operators

| Operator        | Meaning                  | Example value                         |
| --------------- | ------------------------ | ------------------------------------- |
| `=` / `!=`      | equals / not equals      | `["status","=","Open"]`               |
| `>` `<` `>=` `<=` | comparison             | `["creation",">","2026-01-01"]`       |
| `like`          | pattern (use `%`)        | `["description","like","%milk%"]`     |
| `not like`      | negated pattern          | `["description","not like","%spam%"]` |
| `in` / `not in` | membership (array value) | `["status","in",["Open","Closed"]]`   |
| `between`       | range (2-element array)  | `["creation","between",["2026-01-01","2026-02-01"]]` |
| `is`            | set / not set            | `["assigned_by","is","set"]`          |

```bash
# Items created this year whose description mentions "milk"
curl -G https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'fields=["name","description","creation"]' \
  --data-urlencode 'filters=[["creation",">","2026-01-01"],["description","like","%milk%"]]'
```

## Ordering

`order_by` is a SQL-style expression: a field name optionally followed by `asc` or
`desc` (default `asc`).

```bash
curl -G https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'order_by=modified desc'
```

## Pagination

**v1** uses `limit_page_length` (page size, default 20) and `limit_start`
(offset, default 0):

```bash
# Page 3 of 20-row pages -> rows 41..60
curl -G https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'limit_page_length=20' \
  --data-urlencode 'limit_start=40'
```

Set `limit_page_length=0` to return **all** matching rows.

**v2** uses `limit` and `start`, and tells you whether more rows exist via
`has_next_page` in the response, so you can page without a separate count:

```bash
curl -G https://example.com/api/v2/document/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'limit=20' \
  --data-urlencode 'start=40'
```

```json
{ "data": [/* up to 20 rows */], "has_next_page": true }
```

Internally v2 fetches one extra row to compute `has_next_page`, then trims it from
`data`.

## Putting it together

```bash
curl -G https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  --data-urlencode 'fields=["name","status","priority","creation"]' \
  --data-urlencode 'filters=[["status","=","Open"]]' \
  --data-urlencode 'order_by=priority desc' \
  --data-urlencode 'limit_page_length=25' \
  --data-urlencode 'limit_start=0'
```

## See also

- [Listing Documents](/rest-api/listing-documents): the endpoints these parameters apply to
- [Querying data](/server-side/querying-data): the same filter syntax in Python
- [Query Builder](/server-side/query-builder): for complex server-side queries
