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

## Profiling a single function

When the slow code is one function rather than a test, run it through
`bench execute` with `--profile`. The command resolves the dotted path, calls
it, and prints a `cProfile` stats table sorted by cumulative time.

```bash
bench --site mysite execute erpnext.projects.doctype.task.task.set_tasks_as_overdue --profile
```

You can run most things you would run in `bench console`, including `db`
methods. Without `--profile` it just prints the return value:

```bash
bench --site mysite execute frappe.db.get_database_size
```

Pass arguments with `--args` and `--kwargs`, or as trailing positional and
`--key value` pairs after the method.

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
captures every query for the requests and background jobs that run while it is
on, with timings and call counts, so you can spot N+1 query patterns. Only the
Administrator can use it, and it turns itself off after 10 minutes so a
forgotten session does not keep adding overhead.

Open it from the Desk URL `/app/recorder`, click **Start**, perform the action,
then click **Stop** and inspect the captured requests.

### What you can capture

**Start** opens a Configure Recorder dialog. The options are:

- **Record Web Requests** with a request path filter. The filter defaults to
  `/`, which records everything. Set it to something like `/api/method/erpnext`
  to record only matching paths and avoid slowing down other traffic.
- **Record Background Jobs** with a jobs filter, for example `email_queue.pull`.
- **Record SQL queries**, on by default.
- **Generate EXPLAIN for SQL queries**, on by default. This runs `EXPLAIN` on
  each SELECT, UPDATE, and DELETE so you can see the query plan.
- **Capture callstack of SQL queries**, on by default. This records where each
  query was fired from.
- **Run cProfile**, off by default. This adds Python profiling output to each
  capture. It adds a lot of overhead, so disable stack capturing when you use
  it.

### What each capture shows

The list sorts captured requests by duration. Open one to see the path, total
duration, number of queries, and time spent in queries. The SQL queries table
lists every query with its duration, and marks how many exact and normalized
duplicates each query has. Normalized counts group queries that differ only in
their literal values, which is how you spot the same query running in a loop.
Expand a query row to see its stack trace and `EXPLAIN` output.

### Suggested indexes

Open a capture and click **Suggest Optimizations**. The Recorder analyzes the
recorded queries and proposes up to three indexes that would cut the most query
time. Select the ones you want in the Suggested Indexes table and click **Add
Indexes** to create them.

### Recording from code

To capture the queries a single function runs without going through Desk, wrap
it with the `record_queries` decorator:

```python
from frappe.recorder import record_queries

@record_queries
def my_function():
    ...
```

After it runs, open the Recorder list to view the captured queries.

### Sharing captures

From the Recorder list you can **Export** all captures to a JSON file and
**Import** one back on another site, which is useful for sharing a slow request
with someone else. **Clear** removes all captures.
