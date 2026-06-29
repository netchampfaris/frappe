---
title: Database Administration
---

# Database Administration

Each Frappe site has one database. MariaDB is the default and the most tested
choice. PostgreSQL is supported but considered experimental, and SQLite exists for
small or throwaway sites. You pick the engine when you create the site and it
stays in `site_config.json` as `db_type`.

```bash
bench new-site mysite.localhost --db-type mariadb
bench new-site mysite.localhost --db-type postgres
```

## Choosing an engine

- **MariaDB**: the default. Use it unless you have a specific reason not to. Most
  Frappe and ERPNext deployments run on MariaDB.
- **PostgreSQL**: supported but experimental. Some features and third-party apps
  assume MariaDB, so test thoroughly before committing to it.
- **SQLite**: file-based, no server to run. Fine for tiny or single-user sites,
  not for production load.

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

To take read load off the primary database, point read queries at a replica. Set
these keys in `site_config.json`:

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

To reclaim space from deleted columns and orphaned tables, see
`bench --site mysite.localhost trim-database --help` and `trim-tables --help`.
These are destructive, take a backup first.
