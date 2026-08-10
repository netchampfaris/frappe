---
title: Your First Site
---

# Your First Site

A **site** is an isolated instance with its own database and files. This page
creates a site, installs your app on it, and turns on developer mode so you can
start building.

You should have a [bench](/getting-started/installation) and ideally
[your first app](/getting-started/your-first-app) ready.

## Create the site

From the bench directory:

```bash
bench new-site library.localhost
```

You will be prompted for the **MariaDB/PostgreSQL root password** (used to create
the site's database) and a new **Administrator password** (used to log in). To
skip the prompts, pass them as flags:

```bash
bench new-site library.localhost \
  --db-root-password root_password \
  --admin-password admin
```

To use PostgreSQL instead of the default MariaDB, add `--db-type postgres`.

## Install your app on the site

A site only knows about apps you install on it. Install the app you created:

```bash
bench --site library.localhost install-app library_management
```

You can install multiple apps in one command:

```bash
bench --site library.localhost install-app erpnext library_management
```

## Enable developer mode

**Developer mode** makes the framework write DocType definitions to disk as JSON
in your app and skips certain caches, so your schema changes are tracked in
version control. Set it in the bench's common site config (a `JSON` file holding bench level configurations) so it applies to every
site on the bench:

```bash
bench set-config -g developer_mode 1
```

Then clear the cache so the change takes effect:

```bash
bench --site library.localhost clear-cache
```

> Always keep developer mode **off** in production. It is meant for development only.
> See [Developer Mode](/tutorial/developer-mode) for details.

## Start and log in

Start the development server:

```bash
bench start
```

Open the site and log in as `Administrator` with the password you set:

```text
http://library.localhost:8000
```

A fresh site redirects every request to the setup wizard until it is completed.
Go through it (or click through the steps quickly) before continuing.

Site names that end in `.localhost` resolve to `127.0.0.1` automatically, so no
extra setup is needed. If you use a different hostname (for example
`library.test`), register it locally:

```bash
bench --site library.test add-to-hosts
```

## Next steps

You now have a running site with your app installed and developer mode on. Create
your first DocType and start building:

- [DocTypes Overview](/doctypes/overview): define your data model
- [Controllers & Lifecycle](/doctypes/controllers-lifecycle): add server-side logic
- [Tutorial](/tutorial/setup): build a complete app step by step
