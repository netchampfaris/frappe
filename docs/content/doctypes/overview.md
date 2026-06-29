---
title: Overview
---

# DocTypes & the Data Model

A **DocType** is the central building block of every Frappe app. A single DocType definition gives you four things at once:

- **Schema**: the fields and their types, stored as JSON.
- **Database table**: a real SQL table generated from the schema.
- **Model and controller**: a Python class (a `Document` subclass) with lifecycle hooks for validation and business logic.
- **UI**: an auto-generated form, list view, filters and reports in the Desk.

You define the DocType once, and Frappe takes care of the table, the REST API, the form, permissions and search.

## A DocType is a table

Every standard DocType maps to one SQL table named `tab<DocType>`. A DocType called `Task` lives in the table `tabTask`, and each field becomes a column.

```sql
SELECT name, subject, status FROM `tabTask`;
```

A row in that table is a **document** (or "doc"). In Python you work with documents, not rows:

```python
import frappe

# Create and save a new document (a new row in tabTask)
doc = frappe.new_doc("Task")
doc.subject = "Write docs"
doc.status = "Open"
doc.insert()

# Load an existing document
doc = frappe.get_doc("Task", "TASK-0001")
print(doc.subject)
```

See [Document API](/server-side/document-api) for the full set of CRUD methods.

## Anatomy of a DocType

A DocType is made up of:

- **Fields**: each field has a `fieldtype` (Data, Link, Select, Currency, Table, and more), a `fieldname` (the column and property name) and a `label`. See [Fields](/doctypes/fields).
- **Naming rule**: how the primary key (`name`) is generated. See [Naming](/doctypes/naming).
- **Permissions**: role-based rules controlling who can read/write/submit. See [Permissions](/server-side/permissions-in-code).
- **A controller**: `<doctype>.py` with a `Document` subclass holding validation and lifecycle logic. See [Controllers & Lifecycle](/doctypes/controllers-lifecycle).
- **A client script**: `<doctype>.js` for form behaviour in the browser. See [Form API](/client-side/form-api).

## Standard fields

Every document gets a set of standard fields automatically. You never declare them. The most important is `name`, the primary key.

| Field         | Type        | Description                                                                    |
| ------------- | ----------- | ------------------------------------------------------------------------------ |
| `name`        | string      | Primary key, unique per DocType. How you load a doc.                           |
| `owner`       | Link (User) | User who created the document.                                                 |
| `creation`    | Datetime    | When it was created.                                                           |
| `modified`    | Datetime    | Last modified timestamp (used for concurrency checks).                         |
| `modified_by` | Link (User) | User who last modified it.                                                     |
| `docstatus`   | Int         | `0` Draft, `1` Submitted, `2` Cancelled. See [Docstatus](/doctypes/docstatus). |
| `idx`         | Int         | Sort/row index.                                                                |

These are defined in `frappe/model/__init__.py` as `default_fields`. Child table rows also carry `parent`, `parenttype` and `parentfield` (see [Child Tables](/doctypes/child-tables)).

## Where a DocType lives

A DocType is owned by a **module** inside an **app**. Its files live on disk under that module's folder:

```text
your_app/your_app/<module>/doctype/<doctype>/
├── <doctype>.json   # schema (fields, permissions, naming)
├── <doctype>.py     # controller (Document subclass)
├── <doctype>.js     # client script
└── test_<doctype>.py
```

The JSON is the source of truth; it is synced into the database table on `bench migrate`. See [Modules & App Structure](/doctypes/modules-app-structure).

## Special kinds of DocTypes

Most DocTypes are standard table-backed types, but a few flags change their behaviour:

- **Child table** (`istable`): rows embedded in a parent document. See [Child Tables](/doctypes/child-tables).
- **Single** (`issingle`): exactly one record, for settings pages. See [Single DocTypes](/doctypes/single-doctypes).
- **Virtual** (`is_virtual`): no SQL table; you supply the backend. See [Virtual DocTypes](/doctypes/virtual-doctypes).
- **Submittable** (`is_submittable`): has the Draft, Submit, Cancel flow. See [Docstatus](/doctypes/docstatus).

## Next steps

- [Fields](/doctypes/fields): every field type and its key properties.
- [Naming](/doctypes/naming): how the `name` primary key is generated.
- [Controllers & Lifecycle](/doctypes/controllers-lifecycle): where your business logic goes.
- [Document API](/server-side/document-api): reading and writing documents in code.
