---
title: Configuration
tableFirstCol: 18rem
---

# Configuration

Frappe reads two JSON config files. `sites/common_site_config.json` holds
settings shared by every site in the bench (database host, Redis URLs, worker
counts). Each site has its own `sites/<site>/site_config.json` for per-site
settings (its database name and password, developer mode, maintenance mode). A
key set in the site config overrides the same key in the common config.

```json
{
 "db_name": "_abc123",
 "db_password": "s3cret",
 "developer_mode": 1
}
```

## Editing config

Edit the JSON files directly, or use `bench set-config`, which writes valid JSON
and clears the config cache for you:

```bash
# per-site (writes to site_config.json)
bench --site mysite.localhost set-config developer_mode 1

# common config (writes to common_site_config.json)
bench set-config -g background_workers 4
```

Use `-g` (global) to target the common config. To store a JSON value instead of a
string, add `--parse`:

```bash
bench set-config -g --parse redis_cache_sentinels '["10.0.0.1:26379"]'
```

When you edit the files by hand, run `bench --site mysite.localhost clear-cache`
so the running processes pick up the change.

## Database keys

These live in `site_config.json` (each site has its own database):

| Key | What it does |
| --- | --- |
| `db_name` | Database name for the site. |
| `db_password` | Password for the site's database user. |
| `db_type` | `mariadb` (default), `postgres`, or `sqlite`. |
| `db_user` | Database user (defaults to `db_name`). |
| `db_host` | Database host. Usually set in common config. |
| `db_port` | Database port. |
| `db_socket` | Unix socket path for the database connection. |

SSL options for the database connection: `db_ssl_ca`, `db_ssl_cert`,
`db_ssl_key`, and `db_ssl_check_hostname`.

## Read replica keys

To send read queries to a replica, set these (see
[Database Administration](/administration/database-administration)):

| Key | What it does |
| --- | --- |
| `read_from_replica` | Turn on replica reads (`1` or `0`). |
| `replica_host` | Hostname of the read replica. |
| `different_credentials_for_replica` | Use separate credentials below. |
| `replica_db_name` / `replica_db_user` / `replica_db_password` / `replica_db_port` | Replica credentials, used when the flag above is set. |

## Redis keys

Set in `common_site_config.json`. Bench fills these in when it sets up the bench:

| Key | What it does |
| --- | --- |
| `redis_cache` | URL of the Redis instance used for caching. |
| `redis_queue` | URL of the Redis instance used for background job queues. |

For a Redis Sentinel setup, the cache connection also reads
`redis_cache_sentinel_enabled`, `redis_cache_sentinels`,
`redis_cache_master_service`, and the matching username/password keys.

## Operational flags

| Key | What it does |
| --- | --- |
| `developer_mode` | When `1`, lets you create and edit DocTypes, exports schema changes to disk, and shows full tracebacks. Never enable in production. |
| `maintenance_mode` | When `1`, the site rejects requests with a "Session Stopped" error. Set with `bench set-maintenance-mode on`. |
| `allow_reads_during_maintenance` | When `1`, read requests still work during maintenance mode (uses the replica if one is configured, otherwise a read-only transaction). |
| `pause_scheduler` | When `1`, the scheduler skips its tick. Set with `bench --site x scheduler pause`. |
| `disable_scheduler` | When `1`, disables the scheduler for the site. |
| `monitor` | When `1`, writes per-request and per-job timing to `logs/monitor.json.log`. See [Monitoring](/administration/monitoring). |
| `keep_backups_for_hours` | How long scheduled backups are kept before cleanup. |
| `max_file_size` | Largest upload allowed, in bytes. Defaults to 25 MB. |
| `rate_limit` | Request rate limiting config for the site. |
| `allow_cors` | Allowed origin(s) for cross-origin requests. |

## Worker and process keys

These go in `common_site_config.json` and are read when Bench generates the
supervisor and nginx configs:

| Key | What it does |
| --- | --- |
| `background_workers` | Number of background worker processes per queue. |
| `gunicorn_workers` | Number of web server worker processes. |
| `webserver_port` / `socketio_port` | Ports for the web and realtime servers. |
| `scheduler_tick_interval` | Seconds between scheduler ticks. |
| `max_queued_jobs` | Cap on jobs queued at once before new enqueues are dropped. |

Worker tuning keys for background jobs include `rq_results_ttl`,
`rq_job_failure_ttl`, `rq_failed_jobs_limit`, and `use_rq_auth` (with
`rq_username` / `rq_password`) when your Redis requires authentication.

## Inspecting config from code

Inside a `bench console` or app code, the merged config is available as
`frappe.conf`:

```python
import frappe
frappe.conf.developer_mode      # value for the current site
frappe.conf.get("monitor")      # None if the key is not set
```
