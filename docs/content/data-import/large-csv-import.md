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

Emails are muted during the import by default (the Data Import doctype's `mute_emails` field defaults to checked). There is also a `--mute-emails` flag, but it has no effect: the CLI command accepts it and never passes it through to the import.

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

The importer parses the whole file into payloads up front (one payload per
document, which may combine several rows for documents with child tables), so
it does not keep memory flat for very large files. It then processes payloads
in batches, committing after every successful document and rolling back just
that document if it fails (see `import_data()` in
`frappe/core/doctype/data_import/importer.py`). Batching drives iteration and
progress reporting; it is not a commit boundary. The default batch size is
1000 payloads.

You can change the batch size in your site config (`site_config.json`):

```json
{
  "data_import_batch_size": 500
}
```

The batch size only controls how often progress is reported, not memory use: the
whole file is parsed into payloads before batching starts, so the file still
needs to fit in memory regardless of batch size. Lower it for more frequent
progress updates, raise it for fewer.

## Tips for large files

- Prefer CSV over Excel for very large files. CSV parses faster and uses less
  memory.
- If your CSV uses a non-comma delimiter, the importer can sniff it. From the UI,
  check "Use CSV Sniffer" (`use_csv_sniffer`) on the Data Import document.
  `import_file` does not expose this, so from code either construct
  `Importer(doctype, file_path=file_path, use_sniffer=True)` yourself instead of
  calling `import_file`, or set `custom_delimiters` and `delimiter_options` on a
  Data Import document and run the import from that.
- Run the import in a screen or tmux session, or as a background job, so a
  dropped SSH connection does not kill it.
- Validate a small sample first (export 5 records as a template, import them, and
  check the result) before pushing the full file.
