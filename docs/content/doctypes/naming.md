---
title: Naming
---

# Naming

Every document has a unique primary key stored in its `name` field. The **naming rule** of a DocType decides how that `name` is generated when a document is inserted. You configure it through the `autoname` property (or the friendlier `naming_rule` selector in the DocType form).

Naming is resolved in `frappe/model/naming.py` (`set_new_name`). The rules below are tried based on the `autoname` value.

## Naming options

### By a field value: `field:`

Use the value of another field as the name.

```text
autoname: field:email
```

The field must be filled, or Frappe throws "`<label>` is required". A unique index is created on that field automatically.

### By a naming series: `naming_series:`

Generate sequential names from a prefix with a counter. The document needs a `naming_series` field (usually a Select) and the running number comes from the `tabSeries` table.

```text
autoname: naming_series:
```

A series key like `SINV-.YYYY.-.#####` produces `SINV-2024-00001`, `SINV-2024-00002`, … The special parts:

| Part | Expands to |
|------|-----------|
| `.#####` | Zero-padded counter (number of `#` = digits). |
| `.YYYY.` / `.YY.` | 4- or 2-digit year. |
| `.MM.` / `.DD.` | Month / day. |
| `.WW.` | ISO week number. |
| `.JJJ.` | Day of year. |
| `.timestamp.` | Current timestamp. |

Parts are separated by dots. The text before the counter (e.g. `SINV-2024-`) is stored as the prefix whose counter lives in `tabSeries`.

### Expression: `format:`

Build the name from a template mixing literal text, date parts and field values in braces.

```text
autoname: format:TASK-{customer}-{####}
```

`{customer}` is replaced by the document's `customer` value and `{####}` by a counter. You can also reference date parts like `{YYYY}`.

### Prompt

Ask the user to type a name when creating the document.

```text
autoname: prompt
```

The entered value arrives in `__newname` and is validated before being set as `name`.

### Hash (random)

Assign a random hash. This is the default fallback when no rule is set.

```text
autoname: hash
```

### Autoincrement

Use a database sequence to produce monotonically increasing integer names. Set this at creation time; it **cannot be changed** afterwards.

```text
autoname: autoincrement
```

Internally this calls `frappe.db.get_next_sequence_val(doctype)`.

### UUID

Assign a UUID (v7) as the name.

```text
autoname: UUID
```

## Naming from the controller

If you need full control, define an `autoname` method on the controller. It runs only if no name has been set by the rules above.

```python
from frappe.model.document import Document
from frappe.model.naming import make_autoname

class Task(Document):
    def autoname(self):
        self.name = make_autoname(f"TASK-{self.project}-.#####")
```

`make_autoname(key, doctype, doc)` accepts the same series syntax described above and also `"hash"`.

## Resolution order

When a document is inserted, `set_new_name` applies the first matching rule:

1. If `autoname` is `autoincrement`, use the DB sequence (returns immediately).
2. If `autoname` is `UUID`, generate a UUID (returns immediately).
3. If amending a cancelled doc, append an amendment suffix.
4. For Single DocTypes, the name is always the DocType name.
5. Apply any matching **Document Naming Rule** (a runtime-configurable DocType).
6. Call the controller's `autoname()` method if defined.
7. Apply the `autoname` option (`field:`, `naming_series:`, `format:`, `prompt`, expression).
8. Fall back to a random `hash`.

## Renaming

If the DocType has `allow_rename` enabled, a document can be renamed (which updates the primary key and all references):

```python
doc = frappe.get_doc("Task", "TASK-0001")
doc.rename("TASK-0001-A", merge=False)
```

## See also

- [Fields](/doctypes/fields): defining the field used by `field:` naming.
- [Single DocTypes](/doctypes/single-doctypes): why singles are named after their DocType.
