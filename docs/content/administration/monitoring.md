---
title: Monitoring
---

# Monitoring

Two things go wrong most often in production: the scheduler stops running jobs, and
background queues back up. Frappe gives you a diagnostic command for both, log
files for everything else, and an optional per-request monitor for timing data.

```bash
bench --site mysite.localhost doctor
```

## Scheduler diagnostics

`doctor` prints the state of the scheduler and the background queues. It tells you
whether the scheduler is disabled, paused, or inactive, how many workers are
online, and how many jobs are waiting in each queue:

```bash
bench --site mysite.localhost doctor
```

To check or change the scheduler state directly:

```bash
bench --site mysite.localhost scheduler status
bench --site mysite.localhost scheduler pause     # stop ticking, keep enabled
bench --site mysite.localhost scheduler resume
bench --site mysite.localhost scheduler disable
bench --site mysite.localhost scheduler enable
```

`pause` sets `pause_scheduler` in the config and is meant to be temporary.
`disable`/`enable` flip the persistent scheduler setting for the site.

To see what is queued or to clear a stuck queue:

```bash
bench --site mysite.localhost show-pending-jobs
bench --site mysite.localhost purge-jobs --queue default
```

## Log files

Logs live in the `logs/` folder of the bench. The useful ones:

| File                                       | What it holds                                 |
| ------------------------------------------ | --------------------------------------------- |
| `logs/web.log`, `logs/web.error.log`       | web server (gunicorn) output                  |
| `logs/worker.log`, `logs/worker.error.log` | background worker output                      |
| `logs/schedule.log`                        | scheduler output                              |
| `logs/frappe.log`                          | application logs from `frappe.logger()`       |
| `logs/monitor.json.log`                    | per-request and per-job timing (when enabled) |

These are rotating files, so older entries roll into numbered files like
`web.log.1`. There is also a per-site `logs/` folder under each site for site
scoped logs.

Inside app code, write to a named log file with the logger:

```python
import frappe
frappe.logger("payments").info("charged invoice %s", invoice)
```

This writes to `logs/payments.log`.

## The Monitor

The Monitor records timing for every request and background job: how long it took,
which method ran, and a trace id you can correlate across logs. It is off by
default. Turn it on with the `monitor` config key:

```bash
bench set-config -g monitor 1
```

With it on, each request and job appends a JSON line to `logs/monitor.json.log`.
You can ship that file to a log aggregator and chart request durations, find slow
methods, or trace a single request by its uuid. Add custom fields to a monitor
record from your code:

```python
from frappe.monitor import add_data_to_monitor
add_data_to_monitor(customer="ACME", items=12)
```

There is overhead to recording every transaction, so enable the Monitor when you
are investigating, or accept the cost knowingly if you want it always on.

## The Recorder

The Recorder profiles individual requests so you can find slow pages and bad
queries. Where the Monitor logs one line per request, the Recorder captures every
SQL query a request runs, its duration, and the `EXPLAIN` output, and it can
suggest indexes.

Open it in the Desk at **Recorder** and click **Start Recording**. Use the app
while it records, then **Stop**. Each captured request shows up in the list with
its query count and time. Open one to see the queries it ran. **Clear** discards
the captured data.

Recording adds overhead and turns itself off after about ten minutes, so use it
for a focused investigation rather than leaving it on.

## Error Log

Unhandled exceptions are also stored in the database as Error Log records, which
you can browse in the Desk at **Error Log**. That is the first place to look when a
user reports a server error.
