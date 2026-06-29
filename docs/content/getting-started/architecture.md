---
title: Architecture
---

# Architecture

This page covers how Frappe is layered (bench → app → site), the technology stack
it runs on, and what happens when a request comes in. Understanding these three
helps you reason about where your code runs and where data lives.

## The stack

A Frappe deployment is made of a few cooperating processes:

| Layer            | Technology | Role |
| ---------------- | ---------- | ---- |
| Web / API server | Python (Werkzeug WSGI), served by Gunicorn in production | Handles HTTP requests, runs controllers |
| Realtime         | Node.js (Socket.IO) | WebSocket push for live updates |
| Database         | MariaDB or PostgreSQL | Persistent storage; each site is a separate database |
| Cache & queue    | Redis | Caching, background job queue, pub/sub |
| Workers & scheduler | Python (RQ) | Run [background jobs](/server-side/background-jobs) and scheduled tasks |
| Asset build      | Node.js (esbuild) | Bundle JS/CSS for the Desk and websites |

In development these run together under `bench start`. In production they are
managed by a process supervisor and a web server / reverse proxy.

## Bench, app, and site

Frappe separates *code* from *data* through three nested concepts.

### Bench

A **bench** is a working directory that holds a Python virtual environment, the
Node toolchain, configuration, and an `apps/` and `sites/` folder. It is your
development/deployment environment and is created and managed by the
[Bench CLI](/administration/bench-overview) (a separate tool, installed
separately from the framework).

```text
frappe-bench/
├── apps/            # source code of installed apps
│   ├── frappe/
│   └── your_app/
├── sites/           # one folder per site + shared config
│   ├── common_site_config.json
│   └── mysite.localhost/
├── config/          # supervisor, nginx, redis configs
└── env/             # python virtualenv
```

### App

An **app** is an installable Python package living in `apps/`. `frappe` itself is
an app; your code is another app that depends on it. An app contributes DocTypes,
controllers, [hooks](/server-side/hooks), pages, and assets. The same app can be
installed on many sites. See [Modules & App Structure](/doctypes/modules-app-structure).

### Site

A **site** is an isolated instance with its own database, files, and config,
addressed by a hostname (for example `mysite.localhost`). One bench can host many
sites (multitenancy), and each site has a chosen set of apps installed on it.

```text
bench (environment)
└── apps (code, shared)
    └── site (data + which apps are installed)
```

This split is why the same `your_app` codebase can serve many independent
customers from one bench.

## Request lifecycle

When an HTTP request hits the Frappe web server, it flows roughly like this:

1. **WSGI entry**: the request enters the Werkzeug/WSGI application.
2. **Init**: `frappe.init()` and `frappe.connect()` resolve the **site** from the
   hostname and open a database connection and request-local context (`frappe.local`).
3. **Auth**: the session/API key is resolved into `frappe.session.user`.
4. **Routing**: the path is dispatched.
   - `/api/method/<dotted.path>` → a [whitelisted method](/server-side/whitelisted-methods)
   - `/api/resource/<DocType>` → the [REST API](/rest-api/overview) for documents
   - `/app/...` → the Desk
   - any other path → the [website/portal](/portal/generators-routing) renderer (Jinja)
5. **Permissions**: role and document [permissions](/server-side/permissions-in-code) are enforced.
6. **Controller logic**: the request runs your Python. This is a Document's
   [lifecycle hooks](/doctypes/controllers-lifecycle) (`validate`, `on_update`, and so on)
   or a custom method.
7. **Response**: the result is serialized (JSON or HTML), the transaction is
   committed, and the context is torn down.

Slow or deferrable work (emails, exports, syncs) is pushed to Redis-backed
[background jobs](/server-side/background-jobs) instead of blocking the response.

## Where your code runs

- **Python** runs on the server: controllers, API methods, jobs, scheduled tasks.
- **JavaScript** runs in the browser: Desk [form scripts](/client-side/form-api),
  list-view customizations, and any custom front-end talking to the REST API.
- **Jinja** runs on the server to render website/portal pages and print formats.

## See also

- [Key Concepts](/getting-started/key-concepts): the vocabulary above, defined
- [Hooks](/server-side/hooks): how apps plug into the framework
- [Bench Overview](/administration/bench-overview): managing the environment
