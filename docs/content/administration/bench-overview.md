---
title: Bench Overview
---

# Bench Overview

Bench is the command-line tool you use to create and run Frappe environments. It
is a separate project from the framework (it lives in the
[frappe/bench](https://github.com/frappe/bench) repository), but almost every
operational task starts with a `bench` command. A "bench" is also the directory
it manages: one folder that holds the Python virtualenv, the apps you cloned, the
sites you created, and the config and process files that tie them together.

```bash
bench init frappe-bench
cd frappe-bench
bench new-site mysite.localhost
bench start
```

## What a bench directory contains

After `bench init`, the directory looks like this:

```text
frappe-bench/
├── apps/              # cloned apps (frappe lives here, plus erpnext, your apps)
├── sites/             # one folder per site, plus common_site_config.json
│   ├── common_site_config.json
│   └── mysite.localhost/
│       └── site_config.json
├── config/            # generated nginx, supervisor, redis configs
├── env/               # the Python virtualenv
├── logs/              # log files for web, workers, scheduler, redis
└── Procfile           # process list used by `bench start`
```

The framework reads two config files: `common_site_config.json` (shared by every
site) and each site's `site_config.json`. See
[Configuration](/administration/configuration) for the keys.

## Common commands

These are the commands you will run most days.

```bash
# create and manage benches
bench init frappe-bench              # create a new bench
bench get-app erpnext                # download an app into apps/
bench update                         # pull updates, build assets, run migrate

# create and target sites
bench new-site mysite.localhost      # create a site (new database)
bench --site mysite.localhost install-app erpnext
bench use mysite.localhost           # set the default site for later commands

# run things in development
bench start                          # run web, workers, scheduler, watcher
bench build                          # build JS/CSS assets
bench --site mysite.localhost migrate
bench --site mysite.localhost clear-cache
```

Most site-specific commands need a `--site` flag. If you set a default site with
`bench use`, you can leave it out. To run a command on every site in the bench,
pass `--site all`.

## Targeting a site

The `--site` flag goes before the subcommand:

```bash
bench --site mysite.localhost backup
bench --site mysite.localhost console     # interactive Python shell with frappe loaded
bench --site mysite.localhost mariadb     # open a SQL shell on the site database
```

## Running framework CLI commands

The framework ships its own commands (the ones documented in this section, like
`new-site`, `backup`, `migrate`, and `scheduler`). Bench discovers them and
exposes them under `bench`. When you read `bench --site x migrate` in these docs,
`migrate` is a Frappe command that Bench is forwarding to.

## Updating

`bench update` is the usual way to upgrade. It pulls the latest code for each app,
installs Python and Node dependencies, builds assets, and runs `migrate` on every
site. You can run the steps separately:

```bash
bench update --pull          # only git pull the apps
bench update --patch         # only run migrations
bench update --build         # only rebuild assets
bench update --no-backup     # skip the automatic backup step
```

## Next steps

- [Site Management](/administration/site-management): create, back up, restore, and drop sites
- [Configuration](/administration/configuration): the config file keys
- [Production Setup](/administration/production-setup): nginx and supervisor
