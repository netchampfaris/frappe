---
title: Moving Data Between Sites
---

# Moving Data Between Sites

When you need to move data between sites or systems, the right tool depends on
what you are moving. For end-user records (Customers, Items, Sales Invoices), use
[bulk import](/data-import/data-import) with CSV or Excel. For configuration
and developer-defined records that you want to ship with an app or copy verbatim
between sites, use the JSON export and import commands described here.

## Exporting documents to JSON

`bench export-json` writes one or more documents of a DocType to a JSON file. The
JSON keeps the exact field values, including child tables, so it round-trips
cleanly back into another site:

```bash
bench --site source.localhost export-json "Print Format" /path/to/print_formats.json
```

Export a single document with `--name`:

```bash
bench --site source.localhost export-json "Print Format" /path/to/standard.json --name "Standard"
```

For Single DocTypes (like System Settings), pass `-` as the name.

The export strips fields that should not move between sites: `creation`,
`modified_by`, `owner`, `idx`, and the nested-set tree fields `lft` and `rgt`.
Tree fields are rebuilt automatically on the target site, so exporting them would
corrupt the tree. Child rows are stripped further, dropping `modified`, `name`,
`parent`, `parenttype`, `parentfield`, `docstatus`, and similar internal fields.

## Importing documents from JSON

`bench import-doc` reads a JSON file (or a directory of `.json` files) and inserts
or updates the documents on the target site:

```bash
bench --site target.localhost import-doc /path/to/print_formats.json
```

If you point it at a directory, every `.json` file in that directory is imported.
Only `.json` files are supported by this command. Emails are muted during the
import, and each file is committed as it finishes.

You can also call the importer from code:

```python
from frappe.core.doctype.data_import.data_import import import_doc

import_doc("/path/to/print_formats.json", sort=True)
```

`sort=True` imports the files in sorted filename order, which matters when one
document depends on another being imported first.

## Exporting a CSV with data

`bench export-csv` writes a Data Import style template that already contains the
DocType's data. The output works as input to a bulk import on another site:

```bash
bench --site source.localhost export-csv "Item" /path/to/items.csv
```

Use this when the destination expects a CSV import rather than raw JSON, for
example when a non-developer will load the data through the Desk.

## Fixtures: shipping data inside an app

If the records should always travel with an app (default settings, custom fields,
roles, and so on), use fixtures instead of one-off exports. Declare the DocTypes
or specific records in your app's `hooks.py`:

```python
# in your_app/hooks.py
fixtures = [
    "Custom Field",
    "Property Setter",
    {"dt": "Role", "filters": [["name", "in", ["Project Manager", "Approver"]]]},
]
```

Export the fixtures to JSON files inside your app:

```bash
bench --site source.localhost export-fixtures --app your_app
```

This writes one JSON file per DocType under `your_app/fixtures/`. The records are
imported automatically when the app is installed or migrated on any site, so
fixtures are the way to keep configuration in version control and apply it
everywhere.

## Choosing an approach

- **Bulk import (CSV/Excel):** business records, large volumes, non-developers
  loading data.
- **export-json and import-doc:** moving specific configuration documents between
  sites by hand.
- **Fixtures:** configuration that should ship with an app and apply on every
  install and migrate.
