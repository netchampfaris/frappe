---
title: Caching
---

# Caching

When a value is expensive to compute and does not change often, cache it instead of recomputing it on every request. Frappe gives you a Redis-backed cache through `frappe.cache`, plus a few decorators for common patterns.

```python
# read, with a fallback if the key is missing
settings = frappe.cache.get_value("library_settings")
if settings is None:
    settings = load_settings()
    frappe.cache.set_value("library_settings", settings)
```

`frappe.cache` is a Redis wrapper. (`frappe.cache()` also works, kept for backward compatibility.) Values are pickled, so you can store dicts, lists, and most Python objects, not just strings.

## get_value and set_value

```python
frappe.cache.set_value("open_loans", 42)
frappe.cache.get_value("open_loans")          # -> 42

# expire after 5 minutes
frappe.cache.set_value("token", "abc", expires_in_sec=300)

# remove it
frappe.cache.delete_value("open_loans")
```

`get_value` can take a `generator`: a function called to produce the value on a cache miss. The result is stored and returned, so the next call is a hit.

```python
def count_open_loans():
    return frappe.db.count("Library Loan", {"status": "Open"})

# computes once, then served from cache
frappe.cache.get_value("open_loans", generator=count_open_loans)
```

Pass `user=frappe.session.user` to scope a key per user, or `shared=True` to share a key across all sites on the bench (otherwise keys are namespaced per site).

## Hash fields with hget and hset

When you have a group of related values under one name, use a hash instead of many top-level keys. This keeps things tidy and lets you clear the whole group at once.

```python
frappe.cache.hset("book_stock", "ITEM-0001", 10)
frappe.cache.hget("book_stock", "ITEM-0001")     # -> 10

# generator works here too
frappe.cache.hget("book_stock", "ITEM-0002", generator=lambda: fetch_stock("ITEM-0002"))

# delete one field, or the whole hash
frappe.cache.hdel("book_stock", "ITEM-0001")
frappe.cache.delete_value("book_stock")
```

## @redis_cache

To cache a function's return value in Redis, decorate it. The cache key is built from the function and its arguments.

```python
from frappe.utils.caching import redis_cache

@redis_cache(ttl=3600)
def get_exchange_rate(from_currency, to_currency):
    return fetch_rate_from_api(from_currency, to_currency)
```

- `ttl`: seconds before the entry expires. Defaults to one hour.
- `user`: set `True` to cache per session user.
- `shared`: set `True` to share across sites.

Clear it manually when the underlying data changes:

```python
get_exchange_rate.clear_cache()
```

## Request-scoped cache

`@request_cache` caches a function's result only for the duration of the current request. It is cleared when the request ends. Use it when the same value is computed several times within one request but might differ between requests.

```python
from frappe.utils.caching import request_cache

@request_cache
def get_library_config():
    return frappe.get_doc("Library Settings")
```

Nothing is written to Redis here; the cache lives in `frappe.local.request_cache`. It is a good fit for read-heavy helpers called from many places in one request.

## Choosing a cache

- `frappe.cache` (`get_value` / `hget`): shared across all workers and requests through Redis. Use for data that should survive between requests.
- `@redis_cache`: the same Redis store, but as a decorator on a function.
- `@request_cache`: in-memory, one request only. Cheapest, but does not persist.

A related decorator, `@site_cache`, keeps a value in the worker process across requests without touching Redis. It is faster than Redis but is not shared between workers, so use it only for read-mostly data where a small staleness window per worker is fine.

## See also

- [Database API](/server-side/database-api): `frappe.db.get_value` has its own short-lived cache via `frappe.get_cached_value`.
