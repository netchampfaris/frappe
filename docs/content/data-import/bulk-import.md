---
title: Bulk Import
---

# Bulk Import

Bulk import lets you create or update many records at once from a CSV or Excel
file. You drive it from the **Data Import** DocType, either through the Desk UI
or programmatically. The flow is always the same: download a template, fill it
with your data, upload it, map any columns that need attention, and run the
import in the background.

## Before you start

A DocType can only be imported if it has **Allow Import** enabled in its DocType
settings, and you need the `import` permission on that DocType. Core DocTypes
(like DocType and DocField) are blocked, with a few exceptions such as User,
Role, and Print Format.

## The UI workflow

Go to the **Data Import** list and create a new Data Import. The form walks you
through these steps.

1. **Pick the Document Type.** Set `reference_doctype` to the DocType you want to
   import, for example `Item` or `Customer`.
2. **Pick the import type.** One of:
   - `Insert New Records` creates new documents.
   - `Update Existing Records` updates documents that already exist. Your file
     must include the `ID` column (the document name) so each row can be matched.
   - `Insert or Update Records` (upsert) inserts a row if it does not exist and
     updates it if it does.
3. **Download a template.** Use the **Download Template** button. You choose
   which fields to include and whether to export existing data or a blank
   template.
4. **Fill the template** with your data and save it.
5. **Attach the file** to `import_file`, or paste a published Google Sheets URL
   into `google_sheets_url`.
6. **Check the preview.** Frappe parses the file and shows a preview with column
   mapping. Columns that match a field are mapped automatically. Unmatched
   columns are flagged so you can map or skip them.
7. **Resolve value mappings.** If a Link or Select column contains values that do
   not exist yet (for example a Customer Group that is not in the system), those
   show up under **Value Mappings** so you can map them to valid values.
8. **Start the import.** Click **Start Import**. The work runs as a background
   job, so you can leave the page and come back. Progress and the final status
   update live.

## Downloading a template

The template comes from the `Exporter`. You can call the whitelisted
`download_template` method directly if you want to script it:

```python
import frappe
from frappe.core.doctype.data_import.data_import import download_template

download_template(
    doctype="Item",
    export_fields={"Item": ["item_code", "item_name", "item_group"]},
    export_records="blank_template",  # or "all", "by_filter", "5_records"
    file_type="CSV",  # or "Excel"
)
```

`export_records` controls what data the template carries:

- `blank_template`: headers only, no rows.
- `5_records`: headers plus the first 5 records, handy as an example.
- `all`: every record (subject to `export_filters`).
- `by_filter`: records that match `export_filters`.

Excel templates carry extra formatting and column hints, which makes them
friendlier for non-technical users. CSV is plain text and better for large data
or scripting.

## Running an import from code

Each Data Import is a regular document. Create one, save it, and call
`start_import` to enqueue the background job:

```python
import frappe

di = frappe.new_doc("Data Import")
di.reference_doctype = "Item"
di.import_type = "Insert New Records"
di.import_file = "/files/items.csv"  # an attached File
di.submit_after_import = 0
di.insert()
di.start_import()
```

`start_import` enqueues a job with the id `data_import||<name>`. If a job for the
same Data Import is already queued, it will not enqueue a second one. The
scheduler must be running, otherwise the import is refused (except in
`developer_mode` or during tests, where it runs immediately).

To stop a running import, call `stop_data_import`:

```python
from frappe.core.doctype.data_import.data_import import stop_data_import

stop_data_import(doc_name="<data-import-name>")
```

## Other options on the form

- `submit_after_import`: submit each document after it is inserted (only for
  submittable DocTypes).
- `mute_emails`: suppress email notifications triggered during the import.
- `use_csv_sniffer`: let Frappe auto-detect the CSV delimiter.
- `custom_delimiters` with `delimiter_options`: set the delimiter characters
  yourself, useful for files that use `;` instead of `,`.

## Tracking results

Every row that is processed creates a **Data Import Log** record linked to the
Data Import through the `data_import` field. Each log stores:

- `success`: whether the row imported.
- `docname`: the name of the document that was created or updated.
- `messages` and `exception`: error details for failed rows.
- `row_indexes`: which file rows produced this document (a single document can
  span several rows when it has child table data).

The form's status (`Pending`, `Success`, `Partial Success`, `Error`, or
`Timed Out`) reflects the overall outcome. After an import you can:

- **Export errored rows** to get a file with only the failed rows, fix them, and
  re-import.
- **Export skipped rows** to see rows that were skipped due to value mappings.
- **Download the import log** as a file.

## Retrying a partial import

If an import ends as `Partial Success` or `Error`, running it again reuses the
import log. Rows that already succeeded are skipped, and only the failed or
pending rows are retried. This is safe to do as many times as you need. Deleting
the Data Import also deletes its linked Data Import Log records.
