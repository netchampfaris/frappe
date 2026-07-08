---
title: Site Config
tableFirstCol: 18rem
---

# Site Config

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

## Config precedence

A key in a site's `site_config.json` overrides the same key in
`common_site_config.json`, so the common config acts as a fallback. This lets you
set a default for the whole bench and change it for one site. To turn the request
logger on everywhere but off for one busy site:

```bash
# default for every site
bench set-config -g enable_frappe_logger 1

# override for one site
bench --site worker.localhost set-config enable_frappe_logger 0
```

The same idea applies to database and Redis keys: point every site at one host
through the common config, then override per site only where needed.

## Database keys

These live in `site_config.json` (each site has its own database):

| Key           | What it does                                  |
| ------------- | --------------------------------------------- |
| `db_name`     | Database name for the site.                   |
| `db_password` | Password for the site's database user.        |
| `db_type`     | `mariadb` (default), `postgres`, or `sqlite`. |
| `db_user`     | Database user (defaults to `db_name`).        |
| `db_host`     | Database host. Usually set in common config.  |
| `db_port`     | Database port.                                |
| `db_socket`   | Unix socket path for the database connection. |

SSL options for the database connection: `db_ssl_ca`, `db_ssl_cert`,
`db_ssl_key`, and `db_ssl_check_hostname`.

## Read replica keys

To send read queries to a replica, set these (see
[Database Administration](/administration/database-administration)):

| Key                                                                               | What it does                                          |
| --------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `read_from_replica`                                                               | Turn on replica reads (`1` or `0`).                   |
| `replica_host`                                                                    | Hostname of the read replica.                         |
| `different_credentials_for_replica`                                               | Use separate credentials below.                       |
| `replica_db_name` / `replica_db_user` / `replica_db_password` / `replica_db_port` | Replica credentials, used when the flag above is set. |

## Redis keys

Set in `common_site_config.json`. Bench fills these in when it sets up the bench:

| Key           | What it does                                              |
| ------------- | --------------------------------------------------------- |
| `redis_cache` | URL of the Redis instance used for caching.               |
| `redis_queue` | URL of the Redis instance used for background job queues. |

For a Redis Sentinel setup, the cache connection also reads
`redis_cache_sentinel_enabled`, `redis_cache_sentinels`,
`redis_cache_master_service`, and the matching username/password keys.

## Operational flags

| Key                              | What it does                                                                                                                           |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `developer_mode`                 | When `1`, lets you create and edit DocTypes, exports schema changes to disk, and shows full tracebacks. Never enable in production.    |
| `maintenance_mode`               | When `1`, the site rejects requests with a "Session Stopped" error. Set with `bench set-maintenance-mode on`.                          |
| `allow_reads_during_maintenance` | When `1`, read requests still work during maintenance mode (uses the replica if one is configured, otherwise a read-only transaction). |
| `pause_scheduler`                | When `1`, the scheduler skips its tick. Set with `bench --site x scheduler pause`.                                                     |
| `disable_scheduler`              | When `1`, disables the scheduler for the site.                                                                                         |
| `monitor`                        | When `1`, writes per-request and per-job timing to `logs/monitor.json.log`. See [Monitoring](/administration/monitoring).              |
| `keep_backups_for_hours`         | How long scheduled backups are kept before cleanup.                                                                                    |
| `max_file_size`                  | Largest upload allowed, in bytes. Defaults to 25 MB.                                                                                   |
| `rate_limit`                     | Request rate limiting config for the site.                                                                                             |
| `allow_cors`                     | Allowed origin(s) for cross-origin requests.                                                                                           |

## Worker and process keys

These go in `common_site_config.json`. `background_workers`, `gunicorn_workers`,
and the port keys only take effect after Bench regenerates the supervisor and
nginx configs and you reload them. `scheduler_tick_interval` and
`max_queued_jobs` are read by Frappe directly at runtime, so changing them just
needs a `clear-cache` (or process restart), not a config regeneration:

| Key                                | What it does                                                |
| ---------------------------------- | ----------------------------------------------------------- |
| `background_workers`               | Number of background worker processes per queue.            |
| `gunicorn_workers`                 | Number of web server worker processes.                      |
| `webserver_port` / `socketio_port` | Ports for the web and realtime servers.                     |
| `scheduler_tick_interval`          | Seconds between scheduler ticks.                            |
| `max_queued_jobs`                  | Cap on jobs queued at once before new enqueues are dropped. |

Worker tuning keys for background jobs include `rq_results_ttl`,
`rq_job_failure_ttl`, `rq_failed_jobs_limit`, and `use_rq_auth` (with
`rq_username` / `rq_password`) when your Redis requires authentication.

## Site setup and security keys

These live in `site_config.json`:

| Key                      | What it does                                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `admin_password`         | Password for the Administrator user, set when the site is created.                                                                           |
| `encryption_key`         | Key used to encrypt stored passwords. Generated on a fresh site. Back it up; restoring a site needs the same key to read existing passwords. |
| `install_apps`           | Apps to install on new, reinstall, and restore.                                                                                              |
| `skip_setup_wizard`      | When `1`, skips the setup wizard on a new site.                                                                                              |
| `host_name`              | Canonical URL for the site, used when building absolute links.                                                                               |
| `deny_multiple_sessions` | When `1`, a new login ends the user's other sessions.                                                                                        |
| `ignore_csrf`            | When `1`, skips CSRF token checks. For development only.                                                                                     |
| `mute_emails`            | When `1`, outgoing email is not sent.                                                                                                        |
| `disable_global_search`  | When `1`, turns off global search indexing.                                                                                                  |
| `disable_website_cache`  | When `1`, skips the website page cache.                                                                                                      |
| `enable_frappe_logger`   | When `1`, logs request info to the site's own `sites/<site>/logs/frappe.web.log`.                                                                                        |
| `error_report_email`     | Default recipient for error reports.                                                                                                         |
| `data_import_batch_size` | Rows per batch during data import. Defaults to 1000.                                                                                         |
| `allow_tests`            | When `1`, allows running tests on the site.                                                                                                  |

## Email keys

Set these to send outgoing mail without configuring an Email Account in the desk.
They are read as a fallback when no Email Account is set up:

| Key                                     | What it does                                            |
| --------------------------------------- | ------------------------------------------------------- |
| `mail_server`                           | SMTP server hostname for outgoing email.                |
| `mail_port`                             | SMTP port.                                              |
| `mail_login`                            | SMTP login.                                             |
| `mail_password`                         | SMTP password.                                          |
| `use_tls`                               | When `1`, connects to the SMTP server over TLS.         |
| `auto_email_id`                         | Default From address for outgoing mail.                 |
| `email_sender_name`                     | Default sender name.                                    |
| `always_use_account_email_id_as_sender` | When `1`, sends from the account email, not the user's. |

## Inspecting config from code

Inside a `bench console` or app code, the merged config is available as
`frappe.conf`:

```python
import frappe
frappe.conf.developer_mode      # value for the current site
frappe.conf.get("monitor")      # None if the key is not set
```
