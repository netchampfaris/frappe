---
title: Background Jobs
---

# Background Jobs

Some work is too slow to run inside a web request. Sending email, generating a PDF, syncing with an external API, or processing a big import will block the user if you do it inline. Push that work to a background worker with `frappe.enqueue`.

Frappe uses [RQ](https://python-rq.org/) (Redis Queue) under the hood. A worker process picks jobs off a Redis queue and runs them in its own process, with its own database connection and transaction.

```python
frappe.enqueue("library.tasks.send_due_reminders")
```

That returns immediately. The function runs later in a worker.

## frappe.enqueue

Pass either a dotted path string or a function object, then any keyword arguments you want forwarded to it.

```python
# by dotted path
frappe.enqueue("library.tasks.rebuild_index", doctype="Book")

# by reference
from library.tasks import rebuild_index
frappe.enqueue(rebuild_index, doctype="Book")
```

The handler receives the kwargs you passed:

```python
# library/tasks.py
def rebuild_index(doctype):
    # runs in a worker, has its own db connection
    ...
```

Common parameters:

- `queue`: which queue to use, `"short"`, `"default"` (the default), or `"long"`.
- `timeout`: seconds before the job is killed. Defaults to the queue's timeout.
- `now`: if `True`, skip the worker and run the function immediately in the current process. Handy in tests and scripts.
- `enqueue_after_commit`: if `True`, the job is only queued after the current database transaction commits. If the transaction rolls back, the job is never queued. Use this when the job depends on data you are saving in the same request.
- `job_id` and `deduplicate`: give a job a stable id and set `deduplicate=True` so the same job is not queued twice while one is still pending.
- `at_front`: put the job at the front of the queue instead of the back.
- `on_success` and `on_failure`: callback functions run by the worker after the job finishes.

```python
frappe.enqueue(
    "library.tasks.export_catalog",
    queue="long",
    timeout=1500,
    enqueue_after_commit=True,
    format="csv",
)
```

### Deduplicating jobs

If a user can trigger the same expensive job repeatedly, give it a `job_id` and deduplicate:

```python
frappe.enqueue(
    "library.tasks.rebuild_index",
    job_id="rebuild-book-index",
    deduplicate=True,
)
```

While a job with that id is queued or running, further calls with the same id are skipped. You can check status yourself:

```python
from frappe.utils.background_jobs import is_job_enqueued

if not is_job_enqueued("rebuild-book-index"):
    frappe.enqueue("library.tasks.rebuild_index", job_id="rebuild-book-index")
```

## Queues

There are three built-in queues. They differ only in their default timeout:

- `short`: 300 seconds. Quick tasks.
- `default`: 300 seconds. General use.
- `long`: 1500 seconds. Slow tasks like reports or bulk processing.

Pick a queue based on how long the work takes, not how important it is. A long job on the `short` queue will be killed when it hits the timeout. If a job needs more time, set `timeout` explicitly.

Queues can be served by dedicated worker processes. The standard production setup (via `bench setup supervisor`) runs a separate worker per queue, so flooding the `default` queue does not stop `long` jobs from running. In development, `bench start` runs a single worker that consumes all queues, so a flood of one queue delays the others.

Frappe rejects new jobs when a queue gets too full (around 500 pending jobs by default), raising `frappe.QueueOverloaded`. This protects the system from a runaway producer: code that enqueues faster than workers drain.

## frappe.enqueue_doc

A shortcut for running a method that lives on a document. Instead of writing a wrapper function, point at the doctype, name, and method:

```python
frappe.enqueue_doc(
    "Library Loan",
    name="LOAN-0001",
    method="send_reminder",
    queue="long",
)
```

This loads the document in the worker and calls the named method on it. It is the same as enqueuing a function that does `frappe.get_doc(doctype, name).send_reminder()`.

## Scheduled jobs

To run something on a schedule instead of on demand, register it in `scheduler_events` in your app's `hooks.py`. The scheduler enqueues these jobs for you at the right time.

```python
# hooks.py
scheduler_events = {
    "daily": [
        "library.tasks.send_due_reminders",
    ],
    "hourly": [
        "library.tasks.sync_catalog",
    ],
    "cron": {
        "0/15 * * * *": [
            "library.tasks.poll_returns",
        ],
    },
}
```

Available frequencies: `all` (every scheduler tick, about every 4 minutes by default, configurable via `scheduler_tick_interval` in site config), `hourly`, `daily`, `weekly`, `monthly`, `yearly` (also `annual`), and `cron` for arbitrary expressions. `hourly`, `daily`, `weekly`, and `monthly` have a `_long` variant that runs on the long queue. `hourly` and `daily` also have a `_maintenance` variant for jobs whose exact run time does not matter; these run on the long queue at a per-site random offset. `all` and `cron` have no `_long` or `_maintenance` forms.

The scheduler must be enabled for the site. Check and toggle it with:

```bash
bench --site mysite doctor
bench --site mysite enable-scheduler
```

Scheduled functions take no arguments and run as the Administrator. See [Hooks](/server-side/hooks#scheduler-events) for the full list of frequencies.

## Running workers locally

`bench start` starts workers for you in development. To run one by hand:

```bash
bench worker --queue short,default,long
```

## Errors and retries

If a job raises an exception, the worker rolls back the transaction, writes the traceback to the [Error Log](/server-side/logging-errors), and marks the job as failed. Failed jobs are kept in Redis for a week so you can inspect them.

Jobs that fail on a database deadlock or lock-wait timeout are retried automatically a few times. To ask for a retry from your own code, raise `frappe.RetryBackgroundJobError`.

## Monitoring jobs

The Desk has an **RQ Job** and **RQ Worker** view (search "RQ Job" in the awesomebar) where you can see queued, running, and failed jobs. From code:

```python
from frappe.utils.background_jobs import get_jobs, get_job_status

get_jobs()                      # pending jobs grouped by site
get_jobs(site="mysite")         # pending jobs for one site
get_job_status("rebuild-book-index")
```

## See also

- [Hooks](/server-side/hooks#scheduler-events): registering scheduled jobs.
- [Realtime](/server-side/realtime): push progress from a job back to the browser.
- [Logging & Errors](/server-side/logging-errors): where failed jobs are recorded.
