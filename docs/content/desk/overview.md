---
title: Overview
---

# Overview

Desk is the admin UI you get after logging in. It is a single-page app served at `/desk` that talks to the server over the same REST and RPC APIs your own code uses. Every DocType you create automatically gets a list view, a form, filters, reports, and print formats in Desk, with no extra UI code.

You reach Desk at:

```text
https://your-site/desk
```

Access to Desk requires a System User with the right roles. Website-only users (Customers, Suppliers, and other Website Users) land on the [portal](/portal/web-forms) instead.

## What you get for free

When you define a DocType, Desk renders these views from its metadata:

- **List view**: a filterable, sortable table of records. Also available as Report, Kanban, Calendar, Gantt, and Image views where the fields support it.
- **Form**: the detail view for one record, built from the field layout (sections, columns, tabs).
- **Reports**: ad-hoc reporting through Report Builder plus saved Query and Script Reports. See [Reports](/desk/reports).
- **Print and PDF**: any record can be printed or downloaded as a PDF using a [Print Format](/desk/print-formats).

## Navigating Desk

The left sidebar lists Workspaces. A Workspace is a landing page that groups shortcuts, links, charts, and number cards for a module. The default sidebar mirrors the apps installed on the bench.

The top bar has a few things worth knowing:

- **Awesomebar**: the search box at the top. Type a DocType name to open its list, a record name to open it, or a command like `new task` to create a record. It also runs global search across documents.
- **Notifications, help, and settings** sit on the right.

Press `Ctrl/Cmd + K` to focus the Awesomebar from anywhere.

## How Desk talks to the server

Desk is a client. Page loads pull document metadata and data through whitelisted methods, and saving a form calls the same document APIs available to scripts and the [REST API](/rest-api/overview). Anything you can do in Desk you can also do over the API, and the permission checks are identical.

## Customizing Desk without code

Most day-to-day customization happens inside Desk itself:

- Workspaces for navigation and dashboards.
- [Reports](/desk/reports) for tabular data.
- [Print Formats](/desk/print-formats) for documents and PDFs.
- [Client and Server Scripts](/desk/client-server-scripts) for logic without any deployment step.
- [Attachments](/desk/attachments) for files on records.
- [System Console](/desk/system-console) for running Python or SQL against the site.

For deeper changes you write app code. See [DocTypes](/doctypes/overview) and the [server-side](/server-side/document-api) and [client-side](/client-side/form-api) guides.
