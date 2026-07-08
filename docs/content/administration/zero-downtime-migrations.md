---
title: Zero Downtime Migrations
---

# Zero Downtime Migrations

When you deploy new code, `bench migrate` runs patches and syncs the database
schema for each site. While that runs, the site can be in an inconsistent state:
old code talking to a new schema, or vice versa. The goal of a zero-downtime
deploy is to keep the site responding (at least to reads) while the migration
happens, and to flip to the new code only once it is ready.

```bash
bench --site mysite.localhost set-maintenance-mode on
bench --site mysite.localhost migrate
bench --site mysite.localhost set-maintenance-mode off
```

## The idea

A safe deploy follows this shape:

1. Take a backup. `bench update` does this for you unless you pass `--no-backup`.
2. Put the site into maintenance mode so writes stop. Reads can keep working if
   you allow them (see below).
3. Run `migrate` to apply patches and schema changes.
4. Restart the processes so they load the new code.
5. Turn maintenance mode off.

Maintenance mode is a config flag (`maintenance_mode` in the site config). When
it is on and you have not allowed reads, every request is stopped and the user
gets a 503 "Updating" page asking them to refresh in a few moments. You set it
with:

```bash
bench --site mysite.localhost set-maintenance-mode on
bench --site mysite.localhost set-maintenance-mode off
```

## Keeping reads alive during migration

To let users keep reading the site while it migrates, set
`allow_reads_during_maintenance` in the config. During maintenance mode the
framework then serves reads either from a read replica (if `read_from_replica`
and `replica_host` are set) or through a read-only database transaction on the
primary.

```bash
bench --site mysite.localhost set-config allow_reads_during_maintenance 1
```

See [Database Administration](/administration/database-administration) for the
replica keys.

## What migrate does

`migrate` takes a `bench_migrate` lock so two migrations cannot run at once, then:

- runs `before_migrate` hooks from each installed app,
- applies pending patches,
- syncs DocType schema to the database,
- runs `after_migrate` hooks,
- clears caches and queues a rebuild of the website search index.

Because schema sync can run long `ALTER TABLE` statements on big tables, plan
deploys that touch large tables for low-traffic windows even with reads allowed.

## If the migration fails

`bench update` takes a backup before it touches anything, unless you passed
`--no-backup`. If a migration leaves the site broken, restore that backup:

```bash
bench --site mysite.localhost restore /path/to/backup.sql.gz
```

If instead a single patch is failing and you need the site back up while you
fix it, skip failing patches and run the rest:

```bash
bench --site mysite.localhost migrate --skip-failing
```

Fix the patch, then run a normal `migrate` again so it is no longer skipped.

## Checking readiness

Before a deploy you can confirm there are no pending background jobs that a
migration would disrupt:

```bash
bench --site mysite.localhost ready-for-migration
```

It checks for pending jobs a few times one second apart to avoid a race with the
scheduler, then prints whether the site is ready. It exits non-zero when jobs are
still pending, so you can gate a deploy script on it. Put the site in maintenance
mode first so no new jobs are enqueued while you check.

## Restarting after deploy

Once migrate finishes, restart the processes so workers and the web server load
the new code:

```bash
bench restart
```

`bench update` runs this whole sequence (backup, pull, build, migrate, restart)
for every site. Use the granular commands above when you want to control timing,
for example to migrate one large site separately from the rest.
