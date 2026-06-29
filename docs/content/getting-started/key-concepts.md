---
title: Key Concepts
---

# Key Concepts

A short glossary of the core terms in Frappe and how they fit together. Each entry
links to a deeper page. If you read only one thing before building, read this.

## How they fit together

```text
Bench  →  the environment (virtualenv, config, processes)
 └─ App  →  installable package of code
     └─ Module  →  grouping of related DocTypes inside an app
         └─ DocType  →  the definition of a data model (schema + behavior)
             └─ Document  →  one record (row) of a DocType
```

A **Bench** runs many **Sites**; each **Site** has its own database and installs a
set of **Apps**.

## Glossary

### DocType

The central concept. A **DocType** is the *definition* of a data model: its
fields, options, permissions, and naming rules. Creating a DocType generates a
database table, [REST endpoints](/rest-api/overview), and a Desk form/list automatically. DocTypes are
stored as JSON in your app (in [developer mode](/contributing/developer-mode)).
→ [DocTypes Overview](/doctypes/overview), [Fields](/doctypes/fields)

### Document

A **Document** is a single instance (row) of a DocType, such as one customer or one invoice.
You work with documents in Python through the [Document API](/server-side/document-api)
(`frappe.get_doc`, `doc.save`, `doc.submit`).
→ [Document API](/server-side/document-api)

### Controller

The Python class that holds a DocType's server-side behavior. Its **lifecycle
methods** (`validate`, `before_save`, `on_update`, `on_submit`, …) are called by
the framework at the right points when a document is saved or submitted.
→ [Controllers & Lifecycle](/doctypes/controllers-lifecycle)

### App

An installable Python package that adds DocTypes, controllers, hooks, and assets.
`frappe` is itself an app; your code is another app that depends on it. The same
app can be installed on many sites.
→ [Modules & App Structure](/doctypes/modules-app-structure), [Your First App](/getting-started/your-first-app)

### Module

A grouping of related DocTypes (and reports, pages, etc.) within an app, listed in
the app's `modules.txt`. Modules organize code and show up as sections in the
Desk.
→ [Modules & App Structure](/doctypes/modules-app-structure)

### Site

An isolated instance with its own database, files, and configuration, addressed by
a hostname (e.g. `library.localhost`). One bench can host many sites, each with a
different set of apps installed.
→ [Architecture: Site](/getting-started/architecture#site), [Site Management](/administration/site-management)

### Bench

The working directory and CLI that manages your Frappe environment: the
virtualenv, the `apps/` and `sites/` folders, and the processes (web, workers,
realtime). Bench is a separate tool you install with `pip`.
→ [Architecture: Bench](/getting-started/architecture#bench), [Bench Overview](/administration/bench-overview)

### Hook

A declaration in an app's `hooks.py` that plugs the app into the framework
without modifying core. Hooks register document event handlers, scheduled jobs,
asset includes, route rules, and more.
→ [Hooks](/server-side/hooks)

### Desk

The built-in admin UI at `/app`. It auto-generates forms, list views, reports, and
dashboards from your DocTypes, and is where you customize and administer the
system. It runs on JavaScript and talks to the server over the REST API.
→ [Desk Overview](/desk/overview), [Form API](/client-side/form-api)

## See also

- [Architecture](/getting-started/architecture): how these pieces run together
- [Introduction](/getting-started/introduction): why Frappe is built this way
