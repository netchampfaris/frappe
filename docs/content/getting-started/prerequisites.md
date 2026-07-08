---
title: Prerequisites
---

# Prerequisites

Before installing Frappe you need a few system dependencies. This page lists the
supported operating systems and the versions of Python, Node, Redis, and the
database you should have installed.

## Operating system

Frappe is developed and tested on **Linux** and **macOS**.

- **Linux**: Ubuntu and Debian are the most common, but any modern distribution works.
- **macOS**: supported for development (install dependencies via Homebrew).
- **Windows**: not supported directly. Use **WSL2** (a Linux distro under
  Windows) or [Docker](/getting-started/installation#docker).

For a no-setup option, Docker works on all three. See
[Installation](/getting-started/installation#docker).

## Required software

| Dependency  | Recommended version      | Notes                                           |
| ----------- | ------------------------ | ----------------------------------------------- |
| Python      | 3.14 (>=3.14,< 3.15)     | The framework is a Python package               |
| Node.js     | 24 or newer              | For building assets and the realtime server     |
| Yarn        | 1.x (classic)            | JS package manager used for builds              |
| Redis       | 6 or newer               | Cache, queue, and pub/sub                       |
| MariaDB     | 10.6 or newer            | Default database                                |
| PostgreSQL  | 13 or newer              | Optional alternative to MariaDB                 |
| Git         | any recent               | Apps are cloned and version-controlled with Git |
| wkhtmltopdf | 0.12.x (with patched Qt) | For PDF/print generation                        |

> Frappe's current development version targets Python 3.14. When in doubt, match
> the versions used by the official Docker images and the Bench install scripts.

## Database choice

- **MariaDB** is the default and the most thoroughly tested. Use the **utf8mb4**
  character set / collation.
- **PostgreSQL** is supported. **SQLite** support exists but is experimental and
  not for production.

See [Database Administration](/administration/database-administration) for
configuration details.

## Node version management

Different apps may need different Node versions. Install
[`nvm`](https://github.com/nvm-sh/nvm) so you can switch between Node versions per
project.

## Installing the dependencies

On **Ubuntu or Debian**, install the system packages with `apt`, then Node with
`nvm`:

```bash
sudo apt update
sudo apt install -y git python3-dev python3-venv python3-pip \
  redis-server mariadb-server libmariadb-dev \
  wkhtmltopdf xvfb libfontconfig

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
nvm install 24
npm install -g yarn
```

On **macOS**, use [Homebrew](https://brew.sh):

```bash
brew install python git redis mariadb node@24 wkhtmltopdf
npm install -g yarn
```

These commands cover the common setup. Package names and extra steps (for example
the MariaDB `utf8mb4` config) can vary by distribution and version.

## The Bench CLI

Most installations use **Bench**, the command-line tool that creates and manages
Frappe environments. It is a separate package from the framework and has its own
prerequisites (Python, the items above).

On current Ubuntu/Debian and Homebrew Python, a plain `pip install` fails with an
"externally-managed-environment" error. Install it with [`pipx`](https://pipx.pypa.io)
instead, which installs `bench` into its own isolated environment:

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

Verify it is available:

```bash
bench --version
```

## Next steps

Once these are in place, continue to [Installation](/getting-started/installation).
