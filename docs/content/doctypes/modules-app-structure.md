---
title: Modules & App Structure
---

# Modules & App Structure

DocTypes don't live on their own. They belong to a **module**, and modules belong to an **app**. This page shows how those pieces are laid out on disk and where each DocType file goes.

## App, module, DocType

- An **app** is a Python package installed on a bench (e.g. `frappe`, `erpnext`, `your_app`).
- A **module** is a logical grouping of DocTypes, reports and pages inside an app (e.g. "Accounts", "Core").
- A **DocType** belongs to exactly one module.

## App layout

A typical app created with `bench new-app your_app` looks like:

```text
your_app/
├── your_app/
│   ├── modules.txt          # list of modules in this app
│   ├── hooks.py             # app hooks (doc_events, fixtures, …)
│   ├── patches.txt          # migration patches
│   └── <module>/            # one folder per module
│       ├── __init__.py
│       └── doctype/
│           └── <doctype>/   # one folder per DocType
└── pyproject.toml           # app metadata and dependencies
```

## modules.txt

`modules.txt` lists the modules the app provides, one per line. Each name must have a matching folder (snake_cased) under the app package.

```text
Accounts
Stock
Selling
```

The module name `Accounts` maps to the folder `your_app/accounts/`. The mapping is also recorded as a `Module Def` document in the database.

## DocType folder layout

Each DocType gets its own folder under `<module>/doctype/<doctype>/`, where `<doctype>` is the snake_cased name. A DocType named "Sales Invoice" in the "Accounts" module lives at `your_app/accounts/doctype/sales_invoice/`:

```text
your_app/accounts/doctype/sales_invoice/
├── __init__.py
├── sales_invoice.json       # schema: fields, permissions, naming
├── sales_invoice.py         # controller (Document subclass)
├── sales_invoice.js         # client script (form behaviour)
└── test_sales_invoice.py    # tests
```

What each file is for:

| File                | Role                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| `<doctype>.json`    | The schema: fields, permissions, naming rule, flags. Source of truth.  |
| `<doctype>.py`      | The controller and [lifecycle hooks](/doctypes/controllers-lifecycle). |
| `<doctype>.js`      | Client-side [form scripts](/client-side/form-api).                     |
| `<doctype>_list.js` | Optional list-view customisation.                                      |
| `test_<doctype>.py` | Unit/integration tests.                                                |

## How the JSON reaches the database

The `.json` file is the source of truth and lives in version control. The matching table (`tab<DocType>`) is created/updated from it when you run:

```bash
bench --site your-site migrate
```

This synchronises every app's DocType JSON into the database schema. During development with **developer mode** enabled, editing a DocType in the Desk writes the changes back out to its `.json` file so they can be committed.

```bash
bench set-config -g developer_mode 1
```

## Creating a new DocType

In developer mode, create the DocType from the Desk UI (DocType List → Add), pick its module, and Frappe scaffolds the folder and files for you. You can also generate the boilerplate from the bench console. Either way, the controller and client files are created next to the JSON, ready for your logic.

## See also

- [Overview](/doctypes/overview): how a DocType maps to a table.
- [Controllers & Lifecycle](/doctypes/controllers-lifecycle): what goes in `<doctype>.py`.
- [Hooks](/server-side/hooks): `hooks.py` and app-level configuration.
