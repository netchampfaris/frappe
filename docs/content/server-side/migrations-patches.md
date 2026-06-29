---
title: Migrations & Patches
---

# Migrations & Patches

An app's database schema and data change as the code changes. Frappe handles
both with one command:

```bash
bench --site mysite.localhost migrate
```

Run `migrate` after you pull updates for any app on a site. It applies pending
patches and syncs schema from the DocType JSON files.

## What `bench migrate` does

`migrate` runs in a fixed order:

1. Run `before_migrate` hooks.
2. Run pre-model-sync patches from each app's `patches.txt`.
3. Sync the schema from DocType JSON files.
4. Run post-model-sync patches.
5. Sync jobs, fixtures, dashboards, customizations, languages, and the portal menu.
6. Run `after_migrate` hooks.

The patch and schema steps are the core of a migration. Everything else keeps
derived data in step with the latest code.

## Schema changes

When you edit a DocType in Developer Mode, Frappe writes its definition to a
JSON file in the app source tree at
`<app>/<module>/doctype/<doctype>/<doctype>.json`. Installing an app on a site
creates the database tables from these files.

On `migrate`, Frappe compares the hash of each DocType JSON against the hash
stored in the database. If they differ, it reloads that DocType and applies the
schema change. Only changed DocTypes are touched.

Removing or renaming a field does not drop its database column. The column stays
but the field no longer shows in the form. This avoids data loss and lets you
write a patch that still reads the old values. Frappe does not support reverse
schema migrations.

## Data migrations with patches

A patch is a one-off script that changes existing data to match new code. Each
patch runs once per site and is recorded in the **Patch Log** so it never runs
again.

### Writing a patch

A patch is a Python module with an `execute` function:

```python
import frappe

def execute():
    # patch code here
    frappe.db.set_value("System Settings", None, "country", "India")
```

Put patches in a `patches` package inside your app, grouped by version:

```text
myapp
└── patches
    └── v15_0
        └── set_default_country.py
```

Then register the patch in `myapp/patches.txt` by its dotted path:

```text
myapp.patches.v15_0.set_default_country
```

### Pre and post model sync

`patches.txt` uses an INI-style format with two sections that decide when a
patch runs relative to the schema sync:

```text
[pre_model_sync]
myapp.patches.v15_0.backup_old_field

[post_model_sync]
myapp.patches.v15_0.set_default_country
```

- `pre_model_sync` patches run before the schema is synced, so the DocType meta
  still reflects the old JSON. Use this when your patch needs old fields that the
  new schema removes.
- `post_model_sync` patches run after the schema is synced, so the meta is up to
  date. Most patches that only change data belong here.

A `patches.txt` with no section headers is read as the old flat format, where
every line is a single pre-model-sync patch.

### Reloading a DocType inside a patch

If a pre-model-sync patch needs the latest schema for a specific DocType, reload
it from its JSON first with `frappe.reload_doc`:

```python
import frappe

def execute():
    frappe.reload_doc("myapp_module", "doctype", "my_doctype")

    # patch code that needs the new schema
```

`reload_doc(module, dt, dn)` takes the module name, the document type (usually
`"doctype"`), and the document name. Pass `force=True` to reload even when the
hash is unchanged.

### One-off statements

For small changes you do not need a separate module. Prefix a line in
`patches.txt` with `execute:` and Frappe runs it as a Python statement:

```text
execute:frappe.delete_doc("Page", "applications", ignore_missing=True)
```

A common use is resetting permissions after a DocType ships new defaults, since
permission changes are not synced automatically:

```text
execute:frappe.permissions.reset_perms("My DocType")
```

### Re-running a patch

Every line in `patches.txt` must be unique, and a patch that has run will not
run again. To force a patch to run a second time, change the line so it looks
new. Add a trailing comment:

```text
myapp.patches.v15_0.set_default_country #2026-06-29 re-run
```

The comment makes the line distinct, so Frappe treats it as a new patch and runs
it again.

### Running a patch at the end

Prefix a patch with `finally:` to defer it until all other patches in the run
have finished:

```text
finally:myapp.patches.v15_0.rebuild_caches
```
