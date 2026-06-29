---
title: Profiling and Monitoring
---

# Profiling and Monitoring

When something is slow, you need numbers, not guesses. Frappe gives you two
tools: cProfile output from the test runner for code you can run as a test, and
the Monitor for requests and background jobs on a running site.

## Profiling tests

Add `--profile` to `run-tests` to wrap the run in Python's `cProfile`. After the
tests finish, the runner prints a stats table sorted by cumulative time.

```bash
bench --site mysite run-tests --module "myapp.myapp.doctype.note.test_note" --profile
```

The output lists functions with their call counts and total and cumulative time.
Read it from the top: the functions with the highest cumulative time are where
the run spends most of its time. Point `--profile` at a single test or module so
the report stays focused on the code you care about.

You can profile the development web server the same way:

```bash
bench serve --profile
```

## The Monitor

The Monitor records one entry per web request and per background job on a live
site: the path or method, how long it took, and how much time went into the
database. Use it to find slow endpoints and jobs in development or staging.

Turn it on in the site config:

```bash
bench --site mysite set-config monitor 1
```

Once enabled, each request and job appends a line to
`logs/monitor.json.log` in the bench directory. Each line is a JSON object you
can read directly or feed into a log tool. Watch it while you reproduce a slow
action:

```bash
tail -f logs/monitor.json.log
```

To attach your own fields to the current entry, for example an identifier you
want to group by, call `add_data_to_monitor` from your code:

```python
from frappe.monitor import add_data_to_monitor

add_data_to_monitor(integration="stripe", batch_size=len(rows))
```

Each entry also carries a unique trace id. Get it with
`frappe.monitor.get_trace_id()` to correlate a Monitor entry with an Error Log
entry, which stores the same id.

## The Recorder

For drilling into the SQL a single request runs, use the Recorder in Desk. It
captures every query for the requests you make while it is on, with timings and
call counts, so you can spot N+1 query patterns. Open it from the Desk URL
`/app/recorder`, start recording, perform the action, then stop and inspect the
captured requests.
