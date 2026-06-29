---
title: Site Management
---

# Site Management

A site is one database plus its files and config. You create, back up, restore,
and remove sites with `bench` commands. Each command targets a single site (or
`--site all`), and all of them run from inside the bench directory.

```bash
bench new-site mysite.localhost
bench --site mysite.localhost backup --with-files
bench use mysite.localhost
```

## Create a site

`new-site` creates the database, creates the database user, and bootstraps the
schema. It prompts for the database root password and an Administrator password
unless you pass them as options.

```bash
bench new-site mysite.localhost
```

Useful options (all optional):

```bash
bench new-site mysite.localhost \
  --db-type mariadb \                 # mariadb (default), postgres, or sqlite
  --admin-password admin \            # password for the Administrator user
  --db-root-password yourpassword \   # root password to create the db and user
  --install-app erpnext \             # install an app right after creation
  --set-default                       # make this the default site
```

`--db-type postgres` and `--db-type sqlite` are supported but considered
experimental. `--db-host` and `--db-port` point at a remote database server. If
you already created the database user yourself, pass `--db-user` and
`--no-setup-db` so the command does not try to create it again.

## Set the default site

So you can drop the `--site` flag on later commands:

```bash
bench use mysite.localhost
```

This writes `default_site` into `common_site_config.json`.

## Back up a site

`backup` writes a database dump (and optionally the files) into the site's
`private/backups/` folder.

```bash
bench --site mysite.localhost backup
bench --site mysite.localhost backup --with-files     # include public and private files
```

Other options:

```bash
# back up only some DocTypes, or exclude some
bench --site mysite.localhost backup --include "User,ToDo"
bench --site mysite.localhost backup --exclude "Error Log,Activity Log"

# write to a specific path
bench --site mysite.localhost backup --backup-path-db /path/to/db.sql.gz
```

A partial backup (one made with `--include` or `--exclude`) can only be restored
with `partial-restore`, not the full `restore`. If backup encryption is turned on
in System Settings, the command prints the encryption key, save it, you will need
it to restore.

Scheduled backups run automatically when the scheduler is enabled. The retention
window is controlled by `keep_backups_for_hours` in the site or common config
(see [Configuration](/administration/site-config)).

## Restore a site

`restore` overwrites the site's database from a SQL dump. Point it at the `.sql`
or `.sql.gz` file:

```bash
bench --site mysite.localhost restore /path/to/database.sql.gz
```

Restore the files too, and pass the encryption key if the backup was encrypted:

```bash
bench --site mysite.localhost restore /path/to/database.sql.gz \
  --with-public-files /path/to/files.tar \
  --with-private-files /path/to/private-files.tar \
  --encryption-key <key>
```

To restore a partial backup onto an existing site, use `partial-restore`:

```bash
bench --site mysite.localhost partial-restore /path/to/partial.sql.gz
```

`partial-restore` also accepts `--encryption-key` for encrypted partial backups.

## Backup encryption

Turn on **Encrypt Backup** in System Settings to encrypt the database dump and the
public and private files in every backup. Encryption uses `gpg`, so it must be
installed and on the `PATH` (on macOS, `brew install gnupg`).

The key is stored in the site config under `backup_encryption_key`. If it is not
set when a backup runs, Frappe generates one and writes it to the site config. A
System Manager can read it from the **Backups** list at `/app/backups`, or from
`sites/mysite.localhost/site_config.json`. Encrypted backups are marked with a key
icon in that list.

`restore` and `partial-restore` pick the key up from the site config
automatically. Pass `--encryption-key <key>` to override it, for example when
restoring onto a different site:

```bash
bench --site mysite.localhost restore /path/to/database.sql.gz --encryption-key <key>
```

## Drop a site

`drop-site` removes the site from the database and the filesystem. By default it
takes a backup and moves the site folder into an archived location first.

```bash
bench drop-site mysite.localhost
```

Options:

```bash
bench drop-site mysite.localhost --no-backup           # skip the safety backup
bench drop-site mysite.localhost --db-root-password ... # needed to drop the db user
bench drop-site mysite.localhost --archived-sites-path /path/to/archive
```

This is destructive. The default backup is your safety net, do not pass
`--no-backup` unless you are sure.

## Reinstall a site

`reinstall` wipes the database and reinstalls the apps from scratch. Everything in
the site is lost. Useful for resetting a development site:

```bash
bench --site mysite.localhost reinstall
```

## How URLs map to files

A few URL prefixes are served straight from the filesystem. Knowing where each one
points helps when you debug a missing asset or a broken file link.

`/assets/...` serves shared, app-level static files from `sites/assets/`. Each
app's `public` folder is symlinked in as `assets/<app>`, so
`apps/frappe/frappe/public/images/favicon.png` is reachable at
`/assets/frappe/images/favicon.png`. Built JS and CSS bundles land in
`assets/<app>/dist/js` and `assets/<app>/dist/css` (RTL styles in
`assets/<app>/dist/css-rtl`), with a content hash in the filename like
`assets/frappe/dist/js/desk.bundle.ABCD1234.js`. These files are public and need
no login.

`/files/...` serves a site's public uploads from
`sites/<site>/public/files`. Anyone can read them.

`/private/files/...` serves a site's private uploads from
`sites/<site>/private/files`. The request must be logged in and have permission on
the linked File document.

`/backups/...` serves files from `sites/<site>/private/backups`. Only the
Administrator or a System Manager can download them.

The symlinks under `sites/assets/` are created by `bench build`. If an asset 404s
after adding an app, rebuild to recreate them.
