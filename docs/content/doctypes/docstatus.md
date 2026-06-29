---
title: Docstatus
---

# Docstatus & the Submit Flow

Every document has a `docstatus` field that tracks where it is in its lifecycle. Most DocTypes only ever use status `0`. **Submittable** DocTypes add a Draft, Submitted, Cancelled state machine. Use it for transactional records (invoices, stock entries, journal entries) that should become read-only once posted.

## The three states

| docstatus | State     | Meaning                                                      |
| --------- | --------- | ------------------------------------------------------------ |
| `0`       | Draft     | Editable. Can be saved freely.                               |
| `1`       | Submitted | Posted and locked. Only `allow_on_submit` fields can change. |
| `2`       | Cancelled | Reversed. Permanently read-only.                             |

These are defined in `frappe/model/docstatus.py` as `DocStatus.DRAFT`, `DocStatus.SUBMITTED` and `DocStatus.CANCELLED`. The `docstatus` value behaves like an int and exposes helpers:

```python
if doc.docstatus.is_draft():     # docstatus == 0
    ...
if doc.docstatus.is_submitted(): # docstatus == 1
    ...
if doc.docstatus.is_cancelled(): # docstatus == 2
    ...
```

## Making a DocType submittable

Set `is_submittable` to `1` on the DocType. This enables the Submit and Cancel buttons in the form and the docstatus transitions below.

```json
{
  "doctype": "DocType",
  "name": "Sales Invoice",
  "is_submittable": 1
}
```

## Valid transitions

Frappe enforces a strict state machine (`check_docstatus_transition`). Only these moves are allowed:

```text
Draft (0)     → Draft (0)        save
Draft (0)     → Submitted (1)    submit
Submitted (1) → Submitted (1)    update after submit
Submitted (1) → Cancelled (2)    cancel
```

Everything else throws. You cannot go from Draft straight to Cancelled, nor from Submitted or Cancelled back to Draft, nor edit a cancelled document.

## Submitting and cancelling in code

```python
doc = frappe.get_doc("Sales Invoice", "SINV-0001")

doc.submit()   # docstatus 0 → 1, runs before_submit / on_submit
doc.cancel()   # docstatus 1 → 2, runs before_cancel / on_cancel
```

`submit()` sets `docstatus = 1` and saves; `cancel()` sets `docstatus = 2` and saves. Both check the relevant permission (`submit`, `cancel`). The matching lifecycle hooks fire automatically. See [Controllers & Lifecycle](/doctypes/controllers-lifecycle).

A typical submittable controller posts side effects on submit and reverses them on cancel:

```python
class SalesInvoice(Document):
    def on_submit(self):
        make_ledger_entries(self)

    def on_cancel(self):
        reverse_ledger_entries(self)
```

## Editing after submit

A submitted document is read-only by default. To allow specific fields to change after submission, set `allow_on_submit` on those fields. Saving such an edit keeps `docstatus = 1` and runs `before_update_after_submit` / `on_update_after_submit`.

## Cancelling and links

Before a document is fully cancelled, Frappe checks that no other **active** (non-cancelled) document links to it, preventing dangling references. You also cannot link a Submitted document to a Cancelled one.

## Amending

To correct a submitted document you don't edit it. You cancel it, then create an **amendment**: a new draft copied from the cancelled one via its `amended_from` field. The new document gets a name derived from the original. This keeps an audit trail of the original posting.

## See also

- [Controllers & Lifecycle](/doctypes/controllers-lifecycle): `on_submit`, `on_cancel` and related hooks.
- [Links & Actions](/doctypes/links-actions): why cancelled documents can't be linked.
