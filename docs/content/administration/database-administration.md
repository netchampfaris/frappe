---
title: Database Administration
---

# Database Administration

Each Frappe site has one database. MariaDB is the default and the most tested
choice. PostgreSQL and SQLite are both supported but experimental and still being
worked on. You pick the engine when you create the site and it stays in
`site_config.json` as `db_type`.

```bash
bench new-site mysite.localhost --db-type mariadb
bench new-site mysite.localhost --db-type postgres
bench new-site mysite.localhost --db-type sqlite
```

## Choosing an engine

- **MariaDB**: the default. Use it unless you have a specific reason not to. Most
  Frappe and ERPNext deployments run on MariaDB.
- **PostgreSQL**: supported but experimental. Some features and third-party apps
  assume MariaDB, so test thoroughly before committing to it.
- **SQLite**: file-based, no server to run. Still experimental and being worked
  on, so it is not ready for production use.

## Opening a SQL shell

`bench mariadb` (or `bench postgres`) opens a SQL client connected to the current
site's database with the right credentials already filled in:

```bash
bench --site mysite.localhost mariadb
```

From app code or `bench console`, run queries through the framework's database
layer instead of raw connections:

```python
import frappe
frappe.db.sql("select count(*) from `tabUser`")
frappe.db.get_value("User", "Administrator", "email")
```

## Backups and restore

Database backups are part of [Site Management](/administration/site-management).
The short version:

```bash
bench --site mysite.localhost backup --with-files
bench --site mysite.localhost restore /path/to/database.sql.gz
```

Scheduled backups run automatically while the scheduler is enabled, and old ones
are pruned after `keep_backups_for_hours` (set it in the site or common config).
If backup encryption is on in System Settings, keep the encryption key safe, you
cannot restore without it.

## Read replica

To take read load off the primary database, point read queries at a replica. This
needs a primary-replica setup already running, for example
[MariaDB replication](https://mariadb.com/kb/en/setting-up-replication/), so the
replica stays in sync with the primary.

The replica is connected using the same database name as the primary
(`db_name`), so the replica must serve that same database. Set these keys in
`site_config.json`:

```json
{
  "read_from_replica": 1,
  "replica_host": "10.0.0.5"
}
```

By default the replica is reached with the same database user and password as the
primary. If the replica needs different credentials, set
`different_credentials_for_replica` and supply them:

```json
{
  "read_from_replica": 1,
  "replica_host": "10.0.0.5",
  "different_credentials_for_replica": 1,
  "replica_db_user": "readonly",
  "replica_db_password": "s3cret",
  "replica_db_port": 3306
}
```

The framework uses the replica during maintenance-mode reads automatically. In
your own code, force a query onto the replica by connecting to it explicitly:

```python
import frappe
frappe.connect_replica()
# reads here go to the replica until the request ends
```

## Inspecting tables

Each DocType maps to a table named `tab<DocType>` (for example `tabUser`). To see
schema, indexes, and row counts for a DocType without opening a SQL shell:

```bash
bench --site mysite.localhost describe-database-table --doctype User
```

## Trimming tables

Deleting a field from a DocType does not drop its column, and deleting a DocType
does not drop its table. Over time this leaves unused columns and orphaned tables
behind. Two commands clean this up.

`trim-tables` removes columns for fields that no longer exist in their DocType:

```bash
bench --site mysite.localhost trim-tables
```

`trim-database` drops `tab` tables that belong to DocTypes that no longer exist:

```bash
bench --site mysite.localhost trim-database
```

Both run a dry run with `--dry-run` so you can see what would change without
touching anything:

```bash
bench --site mysite.localhost trim-tables --dry-run
```

These commands are destructive. By default they take a backup of the affected
tables first; pass `--no-backup` to skip it only if you already have a backup.
