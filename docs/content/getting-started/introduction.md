---
title: Introduction
---

# Introduction

Frappe Framework is a full-stack, batteries-included web framework written in
Python and JavaScript. It is the framework that powers [ERPNext](https://erpnext.com)
and hundreds of other business applications. This page explains what Frappe is
and why you might choose it.

## What is Frappe?

Frappe is a **low-code, metadata-driven** framework for building database-backed
web applications. You describe your data models as **DocTypes**, and the
framework generates the database schema, REST API, admin UI, forms, list views,
permissions, and reports for you. You don't write boilerplate for each layer.

It ships with everything a typical business application needs out of the box:

- An ORM and database abstraction over **MariaDB** and **PostgreSQL**
- A web server, REST API, and role-based permission system
- An admin interface (the **Desk**) with auto-generated forms, lists, and reports
- A background job queue and scheduler backed by **Redis**
- A website/portal engine with server-side rendering (Jinja)
- Email, notifications, file management, and full-text search

## Why metadata-driven?

In most frameworks you write the model, then a migration, then a serializer, then
a form, then a list view, then permission checks, and you repeat that for every
entity. In Frappe you define a DocType once. From that one definition the
framework derives:

| You define (metadata) | Frappe generates |
| --------------------- | ---------------- |
| Fields on a DocType   | Database columns + migrations |
| Field types & options | Form controls + validation |
| Permissions per role  | Server + client access control |
| The DocType itself    | REST endpoints + a Desk UI |

Because the definition lives as data (and as a `.json` file in your app), you can
build, customize, and extend applications quickly, and even let power users
customize them at runtime.

## Full-stack and batteries-included

A Frappe app spans the whole stack in one codebase:

- **Server side**: Python controllers, business logic, the [Document API](/server-side/document-api), and [whitelisted methods](/server-side/whitelisted-methods) exposed as APIs.
- **Client side**: JavaScript [form scripts](/client-side/form-api) and [controls](/client-side/controls) that run in the Desk, plus a [REST API](/rest-api/overview) for custom front-ends.
- **Data**: DocTypes that map directly to tables, with the [Database API](/server-side/database-api) and a [query builder](/server-side/query-builder).

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
