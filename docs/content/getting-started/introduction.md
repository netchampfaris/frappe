---
title: Introduction
---

# Introduction

Frappe Framework is a full-stack, batteries-included web framework written in
Python and JavaScript. It powers [ERPNext](https://erpnext.com) and a wide range
of other apps, not just business software: Frappe CRM, Frappe Helpdesk, and
Frappe HR for operations; Gameplan for team communication; Frappe Drive for
files; Frappe Insights for analytics; Frappe Builder for websites; Frappe LMS
for learning; and Frappe Cloud for hosting. This page explains what Frappe is
and why you might choose it.

## What is Frappe?

Frappe is a **low-code, metadata-driven** framework for building database-backed
web applications. You describe your data models as **DocTypes**, and the
framework generates the database schema, REST API, admin UI, forms, list views,
permissions, and reports for you. You don't write boilerplate for each layer. It
ships with everything a typical business application needs out of the box (see
below).

## Why metadata-driven?

In most frameworks you write the model, then a migration, then a serializer, then
a form, then a list view, then permission checks, and you repeat that for every
entity. In Frappe you define a DocType once. From that one definition the
framework derives:

| You define in the DocType | Frappe generates                                |
| ------------------------- | ----------------------------------------------- |
| Fields and their types    | Database columns, form controls, and validation |
| Links and child tables    | Relations between records and nested forms      |
| Permissions per role      | Server and client access control                |
| Naming rules              | Auto-generated document IDs                     |

Every DocType also gets a REST API and a Desk UI (form, list view, and report)
without any extra code.

Because the definition lives as data (and as a `.json` file in your app), you can
build, customize, and extend applications quickly, and even let power users
customize them at runtime.

## Full-stack and batteries-included

A Frappe app spans the whole stack in one codebase:

- **Server side**: Python controllers, business logic, the [Document API](/server-side/document-api), and [whitelisted methods](/server-side/whitelisted-methods) exposed as APIs.
- **Client side**: JavaScript [form scripts](/client-side/form-api) and [controls](/client-side/controls) that run in the Desk, plus a [REST API](/rest-api/overview) for custom front-ends.
- **Data**: DocTypes that map directly to tables, with the [Database API](/server-side/database-api) and a [query builder](/server-side/query-builder).

"Batteries-included" means most of what an app needs is already built in:

- ORM and database abstraction over **MariaDB** and **PostgreSQL**
- REST API and role-based permissions
- The **Desk**, with auto-generated forms, list views, and reports
- Background jobs and a scheduler backed by **Redis**
- Real-time updates over WebSockets
- Website and portal pages with server-side rendering (Jinja)
- Email (sending and inbox) and in-app notifications
- File management and full-text search
- PDF generation and print formats
- Workflows for multi-step approvals
- Webhooks and OAuth for integrations
- Translations for building multilingual apps

You extend the framework through [hooks](/server-side/hooks) rather than forking
it, so your apps stay upgradeable.

## When to use Frappe

Frappe is a strong fit when you are building internal tools, business
applications, ERPs, portals, or any CRUD-heavy app where you want forms, roles,
reporting, and an API without assembling them yourself. If you only need a static
site or a tiny single-purpose service, a lighter tool may be simpler.

## Next steps

- Understand the moving parts in [Architecture](/getting-started/architecture)
- Skim the [Key Concepts](/getting-started/key-concepts) glossary
- Set up your machine via [Prerequisites](/getting-started/prerequisites) and [Installation](/getting-started/installation)
