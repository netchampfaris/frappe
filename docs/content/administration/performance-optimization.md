---
title: Performance Optimization
---

# Performance Optimization

Most slow Frappe sites are slow for one of three reasons: a query without an
index, work being done in the request that should run in the background, or a
value being computed on every request that could be cached. This page covers each,
plus how to find the slow queries in the first place.

## Add a database index

If a list view, report, or filter is slow, the usual fix is an index on the column
being filtered or sorted. Add one with `add-database-index`. For a single column it
creates the index and a Property Setter so the index survives migrations:

```bash
bench --site mysite.localhost add-database-index --doctype "Sales Invoice" --column customer
```

For a multi-column index, pass `--column` more than once, in the order you want
them indexed:

```bash
bench --site mysite.localhost add-database-index --doctype "Sales Invoice" \
  --column customer --column posting_date
```

A multi-column index is not backed by a Property Setter, so it is not guaranteed to
survive a migrate. To make it permanent, define it in the DocType controller's
`on_doctype_update` function. Frappe runs this on every `bench migrate`, so the
index is recreated whenever it is missing:

```python
# sales_invoice.py
def on_doctype_update():
    frappe.db.add_index("Sales Invoice", ["customer", "posting_date"])
```

`on_doctype_update` is a module-level function in the controller file, not a method
on the document class. This is how the framework's own DocTypes add their
composite indexes.

You can also mark a single field as indexed in the DocType editor: tick "Index" on
the field.

Indexes speed up reads but slow down writes a little and use disk, so add them for
columns you actually filter or sort on, not every column.

## Move work to the background queue

Anything slow that does not need to finish before the response is sent should run
in a background job. The framework has three queues: `short`, `default`, and
`long`, each with its own timeout. Use `frappe.enqueue`:

```python
import frappe

def send_report():
    # slow work here

frappe.enqueue(send_report, queue="long", timeout=1500)
```

To run a method on a specific document in the background:

```python
import frappe
frappe.enqueue_doc("Sales Invoice", invoice_name, "send_reminder", queue="default")
```

Background workers process these queues. If jobs pile up, add workers with the
`background_workers` config key and regenerate supervisor config (see
[Production Setup](/administration/production-setup)). Watch the queue depth with
`bench --site x doctor`, covered in [Monitoring](/administration/monitoring).

## Caching

Reading from cache (Redis) is far cheaper than recomputing or hitting the
database. The framework gives you a few caching tools.

For a value you read often and rarely changes, use the cache directly:

```python
import frappe

def get_settings():
    value = frappe.cache.get_value("my_settings")
    if value is None:
        value = compute_settings()
        frappe.cache.set_value("my_settings", value)
    return value
```

For pure functions, the decorators in `frappe.utils.caching` cache the return
value for you:

```python
from frappe.utils.caching import redis_cache, request_cache, site_cache

@redis_cache(ttl=3600)
def expensive(arg):
    ...

@request_cache          # cached only for the duration of one request
def lookup(arg):
    ...
```

`request_cache` lives for a single request, `site_cache` keeps an in-process
cache per site, and `redis_cache` stores the result in Redis with a TTL so it is
shared across workers. Remember to clear or expire a cache when the underlying
data changes.

## Find slow queries

To know what to index or cache, you need to see which queries are slow.

On MariaDB, turn on the slow query log to capture queries over a threshold. In the
MariaDB shell (`bench --site x mariadb`):

```sql
SET GLOBAL slow_query_log = 1;
SET GLOBAL long_query_time = 1;            -- log queries slower than 1 second
SET GLOBAL slow_query_log_file = '/var/log/mysql/slow.log';
```

For a single slow query, prefix it with `EXPLAIN` to see whether it uses an index:

```sql
EXPLAIN SELECT name FROM `tabSales Invoice` WHERE customer = 'ACME';
```

A row showing `type: ALL` and no key means a full table scan, that column wants an
index.

Inside the framework, the Recorder (under **Recorder** in the Desk, or via
`bench --site x start-recording`) captures the SQL run during requests so you can
see the slow ones and their call counts. Turn on the
[Monitor](/administration/monitoring) to track request and job durations over
time.
