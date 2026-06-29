---
title: Logging Errors
---

# Logging Errors

When something goes wrong in server code, you want a record of it. Frappe gives you two tools: `frappe.log_error` to write structured errors into the database, and `frappe.logger` to write line-based logs to disk.

```python
try:
    sync_with_api()
except Exception:
    frappe.log_error("Catalog sync failed")
```

## frappe.log_error

`frappe.log_error` creates an **Error Log** document. Call it from an `except` block and it captures the current traceback automatically, so you usually only pass a title.

```python
try:
    risky_operation()
except Exception:
    frappe.log_error(title="Risky operation failed")
```

Parameters:

- `title`: a short, single-line label for the error. This is how you find it later.
- `message`: the body. If you leave it out, the current traceback is used. Pass your own text or traceback when you want something specific.
- `reference_doctype` and `reference_name`: link the error to a document so you can trace it back.

```python
frappe.log_error(
    title="Loan reminder failed",
    reference_doctype="Library Loan",
    reference_name=loan.name,
)
```

Keep the title short and stable. A good title groups similar failures together so you can spot a recurring problem. Do not put the full traceback or a unique id in the title; that belongs in the message.

`log_error` writes to the database, so it works inside requests and background jobs. It does not raise; logging a failure should never cause a second failure.

## The Error Log DocType

Each call to `log_error` inserts one Error Log record. View them in the Desk by searching "Error Log" in the awesomebar. Each entry stores the title (shown as `method`), the full traceback, any linked reference document, and metadata about the request or job that produced it (path, user, job id, and so on).

Background jobs use this automatically. When a job raises, the worker rolls back and calls `frappe.log_error` before failing, so every failed job leaves a trace here. See [Background Jobs](/server-side/background-jobs#errors-and-retries).

Old logs are cleaned up automatically, so the table does not grow forever.

## frappe.logger

For ongoing, line-based logging (not one row per error), use a Python logger. `frappe.logger` returns a standard library logger configured to write to the site's `logs/` directory.

```python
logger = frappe.logger("library")
logger.info("Starting catalog sync")
logger.warning("Rate limit close, slowing down")
logger.error("API returned 500")
```

The first argument names the log file, so `frappe.logger("library")` writes to `library.log`. Logs rotate by size, so they will not fill the disk.

Use `logger` for informational and debugging output you want to keep, and use `log_error` for actual exceptions you want to review in the Desk. They serve different purposes: one is a running narrative on disk, the other is a queryable list of failures in the database.

```python
logger = frappe.logger("library", with_more_info=True)  # adds request/site context
```

### Arguments

`frappe.logger` takes a few optional arguments:

- `module`: names the logger and its log file. Defaults to `frappe`.
- `with_more_info`: when true, appends the current site and a sanitized form dict to each record. Values for keys that look like secrets (password, token, key, and so on) are masked.
- `allow_site`: pass a site name to log under that site, or `True` to use the current site. Defaults to `True`.
- `filter`: a logging filter function to attach to the logger.
- `max_size`: max size of each log file in bytes before it rotates. Defaults to `100_000`.
- `file_count`: how many rotated files to keep. Defaults to `20`.
- `stream_only`: log to stderr instead of files. Defaults to the `FRAPPE_STREAM_LOGGING` environment variable.

### Log files and rotation

Each logger writes to two files: a bench-level file under the bench's `logs/` directory and a site-level file under `sites/{site}/logs/`. Both use the same name, so `frappe.logger("library")` writes to `logs/library.log` and `sites/{site}/logs/library.log`. Files rotate by size using `max_size` and `file_count`, so they will not fill the disk.

### Setting the log level

Loggers use `frappe.log_level`, which falls back to `WARNING` on a dev server and `ERROR` otherwise. Set a different level with `set_log_level`:

```python
from frappe.utils.logger import set_log_level

set_log_level("DEBUG")
```

This resets the cached loggers, so the new level applies the next time you call `frappe.logger`.

## Operational logs

Beyond your own loggers, the bench keeps a set of logs you can read when debugging. Bench-level logs live in the bench's `logs/` directory; the Frappe application also mirrors its own logs under `sites/{site}/logs/`. Some useful ones:

- `scheduler.log`: scheduled job activity, written by `frappe.logger("scheduler")`.
- `database.log`: database-level logging, written by `frappe.logger("database")`.
- `worker.log`: background worker process output.
- `bench.log`: output from bench commands.
- `frappe.web.log`: per-request logging (off by default, see below).

To log every web request to `frappe.web.log`, set `enable_frappe_logger` to `true` in the site config. Each request is recorded with its site, remote address, user, URL, method, and HTTP status code.

When a request fails with an unhandled exception, Frappe records it in the Error Log automatically. There is no separate snapshot file or DocType; the failure lands in the same Error Log described above.

## Getting the current traceback

If you need the traceback text yourself, for example to include in a notification, use `frappe.get_traceback`:

```python
frappe.log_error(message=frappe.get_traceback(), title="Manual capture")
```

## See also

- [Background Jobs](/server-side/background-jobs#errors-and-retries): failed jobs are logged here automatically.
