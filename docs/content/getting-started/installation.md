---
title: Installation
---

# Installation

There are two ways to install Frappe for development: with the **Bench CLI**
(recommended) or with **Docker**. This page walks through the Bench path and
points to the other.

Make sure you have the [Prerequisites](/getting-started/prerequisites) installed
first.

## Install with Bench (recommended)

[Bench](/administration/bench-overview) is the CLI that creates and manages
Frappe environments. It is a separate tool from the framework. On current
Ubuntu/Debian and Homebrew Python, a plain `pip install` fails with an
"externally-managed-environment" error, so install it with
[`pipx`](https://pipx.pypa.io) instead:

```bash
python3 -m pip install --user pipx
pipx install frappe-bench
```

If you would rather manage a virtualenv yourself, that works too:

```bash
python3 -m venv ~/frappe-venv
source ~/frappe-venv/bin/activate
pip install frappe-bench
```

### 1. Initialize a bench

`bench init` creates a new bench directory, sets up the Python virtualenv, and
clones the `frappe` app into it:

```bash
bench init frappe-bench
```

Useful options:

```bash
# pin a specific framework branch
bench init --frappe-branch version-15 frappe-bench
```

All remaining commands are run from inside the bench directory:

```bash
cd frappe-bench
```

### 2. Create a site

A [site](/getting-started/architecture#site) has its own database. `bench
new-site` creates the database and bootstraps it (it will prompt for the database
root password and a new Administrator password):

```bash
bench new-site mysite.localhost
```

The `new-site` command accepts options such as `--db-type` (`mariadb`,
`postgres`, or `sqlite`), `--admin-password`, `--db-root-password`, and
`--install-app` to install apps during creation. For example:

```bash
bench new-site mysite.localhost --db-type postgres --admin-password admin
```

### 3. Get an app

`bench get-app` downloads an app (from a Git URL or a known app name) into
`apps/` so it can be installed on sites:

```bash
bench get-app https://github.com/frappe/erpnext
```

To create your own app instead of downloading one, see
[Your First App](/getting-started/your-first-app).

### 4. Install the app on the site

Downloading an app does not activate it; you install it onto a specific site with
`bench install-app`:

```bash
bench --site mysite.localhost install-app erpnext
```

The `--site` flag selects which site the command targets. Pass it explicitly on
each command so it is always clear which site you are acting on.

A `bench use` command exists to set a default site and drop the flag, but relying
on it makes it easy to run a command against the wrong site, so prefer passing
`--site`:

```bash
bench use mysite.localhost
```

### 5. Start the development server

```bash
bench start
```

This runs the web server, realtime server, background workers, and the asset
watcher together. Open your site in the browser:

```text
http://mysite.localhost:8000
```

> If `mysite.localhost` does not resolve, add it to your hosts file with
> `bench --site mysite.localhost add-to-hosts`.

## Docker

For a containerized setup, use the official
[`frappe_docker`](https://github.com/frappe/frappe_docker) repository. It
provides Compose files for both development (a dev container with bench inside)
and production (separate web, worker, database, and Redis containers). It avoids
installing dependencies on your host. Follow the README in that repository.

For a manual, non-docker (supervisor based) setup, see
[Production Setup](/administration/production-setup).

## Next steps

- [Your First App](/getting-started/your-first-app): scaffold your own app
- [Your First Site](/getting-started/your-first-site): install it and enable developer mode
- [Bench Overview](/administration/bench-overview): day-to-day commands
