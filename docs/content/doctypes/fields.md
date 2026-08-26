---
title: Fields
tableFirstCol: 14rem
---

# Fields

Fields define the schema of a DocType. Each field has a **fieldtype** (what kind of data it holds and how it renders), a **fieldname** (the column and Python property name) and a **label** (what the user sees). This page lists the available field types and the properties you'll use most.

## Field types

Most value-storing field types are listed in `frappe/model/__init__.py` as `data_fieldtypes` (the Table types below are backed by child rows rather than a column). Here are the field types grouped by what they hold:

### Text & content

| Fieldtype         | Stores                                                       |
| ----------------- | ------------------------------------------------------------ |
| `Data`            | Short single-line text (max 140 chars). Most common field.   |
| `Small Text`      | Short multi-line text.                                       |
| `Text`            | Longer multi-line text.                                      |
| `Long Text`       | Very large text.                                             |
| `Text Editor`     | Rich text (HTML, WYSIWYG).                                   |
| `Markdown Editor` | Markdown content.                                            |
| `HTML Editor`     | Raw HTML editing.                                            |
| `Code`            | Code with syntax highlighting (`options` sets the language). |
| `JSON`            | Arbitrary JSON.                                              |
| `Password`        | Encrypted text, masked in the UI.                            |
| `Read Only`       | Display-only text.                                           |

### Numbers

| Fieldtype  | Stores                                               |
| ---------- | ---------------------------------------------------- |
| `Int`      | Integer.                                             |
| `Long Int` | Large integer (bigint).                              |
| `Float`    | Floating point. `precision` controls decimal places. |
| `Currency` | Money value; rendered with currency symbol.          |
| `Percent`  | Percentage.                                          |
| `Check`    | Boolean stored as `0`/`1`, rendered as a checkbox.   |
| `Rating`   | Star rating, stored as a float between 0 and 1.      |
| `Duration` | A length of time in seconds.                         |

### Dates & time

| Fieldtype  | Stores         |
| ---------- | -------------- |
| `Date`     | Date only.     |
| `Datetime` | Date and time. |
| `Time`     | Time only.     |

### Relationships

| Fieldtype           | Stores                                                                                                   |
| ------------------- | -------------------------------------------------------------------------------------------------------- |
| `Link`              | Reference to another document. `options` = target DocType.                                               |
| `Dynamic Link`      | Reference where the target DocType is chosen at runtime. `options` = fieldname holding the doctype name. |
| `Table`             | Child table rows. `options` = child DocType.                                                             |
| `Table MultiSelect` | Multi-select stored as a child table. `options` = child DocType.                                         |

See [Links & Actions](/doctypes/links-actions) for Link/Dynamic Link and [Child Tables](/doctypes/child-tables) for Table fields.

### Choice

| Fieldtype      | Stores                                                              |
| -------------- | ------------------------------------------------------------------- |
| `Select`       | One value from a fixed list. `options` = newline-separated choices. |
| `Autocomplete` | Free text with suggestions from `options`.                          |

### Files

| Fieldtype      | Stores                                |
| -------------- | ------------------------------------- |
| `Attach`       | File attachment, stores the file URL. |
| `Attach Image` | Image attachment with preview.        |
| `Signature`    | Hand-drawn signature image.           |

### Specialized

| Fieldtype     | Stores                          |
| ------------- | -------------------------------- |
| `Barcode`     | Barcode value.                   |
| `Geolocation` | GeoJSON map data.                |
| `Color`       | Color value.                     |
| `Icon`        | Icon picker value.               |
| `Phone`       | Phone number with country code.  |

### Layout-only (no value)

These render structure and store nothing (`display_fieldtypes`). Use them to organise the form.

| Fieldtype       | Renders                                                             |
| --------------- | ------------------------------------------------------------------- |
| `Section Break` | Starts a new section.                                               |
| `Column Break`  | Starts a new column within a section.                               |
| `Tab Break`     | Starts a new tab.                                                   |
| `Heading`       | A section heading.                                                  |
| `HTML`          | Arbitrary HTML (`options` holds the markup).                        |
| `Button`        | A button that triggers a client-side action.                        |
| `Image`         | Displays an image from another field (`options` = image fieldname). |
| `Fold`          | A fold that hides fields below it until expanded.                   |

`Table` and `Table MultiSelect` are also "no value" columns, since their data lives in child rows. See [Layout & View Settings](/doctypes/layout-view-settings).

## Common field properties

In the DocType JSON each field is an object. The properties you'll set most often:

```json
{
  "fieldname": "customer",
  "label": "Customer",
  "fieldtype": "Link",
  "options": "Customer",
  "reqd": 1,
  "in_list_view": 1
}
```

| Property             | Purpose                                                                                                          |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `fieldname`          | Column name and Python/JS property. Lowercase, `snake_case`.                                                     |
| `label`              | Human-readable label shown in the form.                                                                          |
| `fieldtype`          | One of the types above.                                                                                          |
| `options`            | Meaning depends on type: target DocType (Link/Table), choices (Select), language (Code), data validation (Data). |
| `reqd`               | `1` makes the field mandatory.                                                                                   |
| `default`            | Default value for new documents.                                                                                 |
| `unique`             | `1` enforces a unique constraint on the column.                                                                  |
| `read_only`          | `1` makes it non-editable in the UI.                                                                             |
| `hidden`             | `1` hides it from the form.                                                                                      |
| `description`        | Help text shown under the field.                                                                                 |
| `length`             | Column length. For `Data` and similar text types this overrides the 140-character default.                     |
| `precision`          | Decimal places for Float/Currency/Percent.                                                                       |
| `in_list_view`       | `1` shows the field as a column in the list view.                                                                |
| `in_standard_filter` | `1` adds it to the list view filter bar.                                                                         |
| `search_index`       | `1` adds a DB index for faster lookups.                                                                          |
| `no_copy`            | `1` skips the field when a document is duplicated/amended.                                                       |
| `set_only_once`      | `1` allows the value to be set on insert but never changed afterwards.                                           |
| `allow_on_submit`    | `1` lets this field stay editable after the document is submitted. See [Docstatus](/doctypes/docstatus).        |

### `depends_on`: conditional display

Show a field only when a JavaScript expression is true. `doc` refers to the current document.

```json
{
  "fieldname": "reason",
  "label": "Reason",
  "fieldtype": "Small Text",
  "depends_on": "eval:doc.status == 'Rejected'"
}
```

Related properties: `mandatory_depends_on` and `read_only_depends_on` take the same `eval:` expression syntax to conditionally require or lock a field.

### `fetch_from`: pull values from a linked document {#fetch-from}

Auto-populate a field from a field on a linked document. The format is `<link_fieldname>.<source_fieldname>`.

```json
{
  "fieldname": "customer_name",
  "label": "Customer Name",
  "fieldtype": "Data",
  "fetch_from": "customer.customer_name",
  "read_only": 1
}
```

Here `customer` is a Link field; when it is set, `customer_name` is filled from the linked Customer's `customer_name`. Add `"fetch_if_empty": 1` to only fetch when the target field is empty (so manual edits are preserved).

### `options` for Data fields

`Data` fields support validation via `options`: `Email`, `Name`, `Phone`, `URL`, `Barcode`, `IBAN`. For example `"options": "Email"` validates the value is a valid email address.

## See also

- [Naming](/doctypes/naming): use a field as the document name.
- [Child Tables](/doctypes/child-tables): Table and Table MultiSelect fields.
- [Links & Actions](/doctypes/links-actions): Link and Dynamic Link fields.
- [Layout & View Settings](/doctypes/layout-view-settings): sections, columns and tabs.
