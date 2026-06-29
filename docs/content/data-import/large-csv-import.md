---
title: Large CSV Import
---

# Large CSV Import

The Desk UI is fine for a few thousand rows, but for big files it is slow to
upload and easy to time out. For large CSV or Excel files, import from the
command line or from a script instead. This runs in the same process you start
it in, prints progress to the console, and does not depend on a browser session.

## Importing from the command line

Use the `bench data-import` command. It reads a file and imports it into a
DocType without creating anything in the Desk first:

```bash
bench --site mysite.localhost data-import \
  --doctype "Item" \
  --file /path/to/items.csv \
  --type Insert
```

Options:

- `--doctype`: the DocType to import into. Required.
- `--file`: path to a `.csv` or `.xlsx` file. Required. Relative paths resolve
  from the `sites` directory.
- `--type`: `Insert`, `Update`, or `Upsert`. Defaults to `Insert`.
- `--submit-after-import`: submit each document after inserting it.
- `--mute-emails`: suppress emails during the import (on by default).

Progress is printed as the import runs, and any row errors are printed to the
console.

## Importing programmatically

The command is a thin wrapper around `import_file`. Call it from a script or a
`bench execute` invocation when you want more control:

```python
from frappe.core.doctype.data_import.data_import import import_file

import_file(
    doctype="Item",
    file_path="/path/to/items.csv",
    import_type="Insert",  # "Insert", "Update", or "Upsert"
    submit_after_import=False,
    console=True,  # print progress and errors to stdout
)
```

`import_file` builds a Data Import document in memory, counts the payloads, and
runs the import right away in the current process. Set `console=True` to get a
progress bar and printed errors.

Note one difference from the UI flow: a CLI import does not insert a Data Import
record in the database, so there is no saved Data Import Log to resume from. If
the run fails partway, you re-run the whole file, since there is no log that skips
the rows that already succeeded. Re-running is safe with `Update` and `Upsert`
because matching documents are updated in place, but with `Insert` you can create
duplicate records.

## How chunking works

The importer does not load and commit everything in one shot. It parses the file
into payloads (one payload per document, which may combine several rows for
documents with child tables), then processes them in batches. The default batch
size is 1000 payloads. Each batch is committed before the next one starts, which
keeps memory steady and means a crash does not lose every successful row before
it.

You can change the batch size in your site config (`site_config.json`):

```json
{
  "data_import_batch_size": 500
}
```

Lower the batch size if rows are heavy (many child rows or large text fields) and
you hit memory pressure. Raise it if rows are small and you want fewer commits.

## Tips for large files

- Prefer CSV over Excel for very large files. CSV parses faster and uses less
  memory.
- If your CSV uses a non-comma delimiter, the importer can sniff it. From the UI
  set `use_csv_sniffer`. From code, set `frappe.flags.delimiter_options` before
  importing, or use `custom_delimiters` on the Data Import document.
- Run the import in a screen or tmux session, or as a background job, so a
  dropped SSH connection does not kill it.
- Validate a small sample first (export 5 records as a template, import them, and
  check the result) before pushing the full file.
