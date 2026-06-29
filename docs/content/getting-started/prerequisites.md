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

| Dependency | Recommended version | Notes |
| ---------- | ------------------- | ----- |
| Python     | 3.10 or newer | The framework is a Python package |
| Node.js    | 18 or newer (use an LTS) | For building assets and the realtime server |
| Yarn       | 1.x (classic) | JS package manager used for builds |
| Redis      | 6 or newer | Cache, queue, and pub/sub |
| MariaDB    | 10.6 or newer | Default database |
| PostgreSQL | 13 or newer | Optional alternative to MariaDB |
| Git        | any recent | Apps are cloned and version-controlled with Git |
| wkhtmltopdf | 0.12.x (with patched Qt) | For PDF/print generation |

> Frappe's current development version targets Python 3.10+. When in doubt, match
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

## The Bench CLI

Most installations use **Bench**, the command-line tool that creates and manages
Frappe environments. It is a separate package from the framework and has its own
prerequisites (Python, the items above). You install it with `pip`:

```bash
pip install frappe-bench
```

Verify it is available:

```bash
bench --version
```

## Next steps

Once these are in place, continue to [Installation](/getting-started/installation).
