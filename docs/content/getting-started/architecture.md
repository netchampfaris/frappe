---
title: Architecture
---

# Architecture

This page covers how Frappe is layered (bench → app → site), the technology stack
it runs on, and what happens when a request comes in. Understanding these three
helps you reason about where your code runs and where data lives.

## The stack

A Frappe deployment is made of a few cooperating processes:

| Layer               | Technology                                               | Role                                                                    |
| ------------------- | -------------------------------------------------------- | ----------------------------------------------------------------------- |
| Web / API server    | Python (Werkzeug WSGI), served by Gunicorn in production | Handles HTTP requests, runs controllers                                 |
| Realtime            | Node.js (Socket.IO)                                      | WebSocket push for live updates                                         |
| Database            | MariaDB or PostgreSQL                                    | Persistent storage; each site is a separate database                    |
| Cache & queue       | Redis                                                    | Caching, background job queue, pub/sub                                  |
| Workers & scheduler | Python (RQ)                                              | Run [background jobs](/server-side/background-jobs) and scheduled tasks |
| Asset build         | Node.js (esbuild)                                        | Bundle JS/CSS for the Desk and websites                                 |

In development these run together under `bench start`. In production they are
managed by a process supervisor and a web server / reverse proxy.

## Bench, app, and site

Frappe separates _code_ from _data_ through three nested concepts.

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
├── apps   (code, shared across sites)
└── sites  (data; each site picks which apps it installs)
```

Apps and sites are parallel: apps hold code, sites hold data. A site does not
live inside an app. Instead, a site records which of the bench's apps are
installed on it.

This split is why the same `your_app` codebase can serve many independent
customers from one bench.

## Where your code runs

- **Python** runs on the server: controllers, API methods, jobs, scheduled tasks.
- **JavaScript** runs in the browser: Desk [form scripts](/client-side/form-api),
  list-view customizations, and any custom front-end talking to the REST API.
- **Jinja** runs on the server to render website/portal pages and print formats.

## Execution contexts

Server-side Python does not only run during web requests. Each context sets up a
site (`frappe.init()` + `frappe.connect()`), runs your code against
`frappe.local` and a database transaction, then tears the context down with
`frappe.destroy()`. They differ in how they are triggered.

- **Web request**: a Gunicorn/Werkzeug worker handles one HTTP request, as in the
  lifecycle above. `frappe.init(..., is_request=True)`.
- **Background job**: an RQ worker pulls a job off the Redis queue and runs it
  with `frappe.init(..., is_job=True)`, often as a specific user. See
  [background jobs](/server-side/background-jobs).
- **Scheduler**: a periodic process enqueues scheduled events, which then run as
  background jobs.
- **Patches**: data and schema migrations run once during `bench migrate`, in a
  one-off script context rather than per request.
- **CLI / console**: `bench execute` and `bench console` init a site and run code
  directly, useful for scripts and debugging.

Because each context manages its own transaction, you usually do not call
`frappe.db.commit()` yourself. The request and job runners commit on success and
roll back on error.

## Request lifecycle

When an HTTP request hits the Frappe web server, it flows roughly like this:

1. **WSGI entry**: the request enters the Werkzeug/WSGI application
   (`frappe/app.py`).
2. **Init**: `init_request()` resolves the **site** from the host (or the
   `X-Frappe-Site-Name` header), calls `frappe.init()` and `frappe.connect()` to
   open a database connection and request-local context (`frappe.local`), and
   runs `before_request` hooks.
3. **Auth**: `validate_auth()` resolves the session or API key into
   `frappe.session.user`.
4. **Routing**: the path is dispatched.
   - `/api/v2/method/<dotted.path>` → a [whitelisted method](/server-side/whitelisted-methods)
   - `/api/v2/document/<DocType>` → the [REST API](/rest-api/overview) for documents
   - `/app/...` → the Desk (rewritten to and served under `/desk`)
   - any other path → the [website/portal](/portal/generators-routing) renderer (Jinja)
5. **Permissions**: role and document [permissions](/server-side/permissions-in-code) are enforced.
6. **Controller logic**: the request runs your Python code. This is a Document's
   [lifecycle hooks](/doctypes/controllers-lifecycle) (`validate`, `on_update`, and so on)
   or a custom method.
7. **Response**: the result is serialized (JSON or HTML), the transaction is
   committed, `after_request` hooks run, and the context is torn down with
   `frappe.destroy()`.

Slow or deferrable work (emails, exports, syncs) is pushed to Redis-backed
[background jobs](/server-side/background-jobs) instead of blocking the response.

## See also

- [Key Concepts](/getting-started/key-concepts): the vocabulary above, defined
- [Hooks](/server-side/hooks): how apps plug into the framework
- [Bench Overview](/administration/bench-overview): managing the environment
