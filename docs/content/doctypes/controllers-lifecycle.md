---
title: Controllers & Lifecycle
tableFirstCol: 16rem
---

# Controllers & Lifecycle

A **controller** is the Python class behind a DocType. It lives in `<doctype>.py`, subclasses `frappe.model.document.Document` (whose read/write methods are covered in the [Document API](/server-side/document-api)), and is where your server-side business logic goes. Frappe calls specially named methods on the controller at set points in a document's life. These are the **lifecycle hooks**.

## The controller class

The class name is the PascalCase of the DocType name, and it is auto-discovered from the DocType's module.

```python
import frappe
from frappe.model.document import Document

class Task(Document):
    def validate(self):
        if self.exp_end_date and self.exp_start_date:
            if self.exp_end_date < self.exp_start_date:
                frappe.throw("End date cannot be before start date")
```

To stop a save, call `frappe.throw(message)` from any of the pre-save hooks. It raises a `ValidationError` and rolls back the transaction.

## Lifecycle hooks

Define any of these methods on your controller; Frappe calls them automatically. You never call them yourself. The order below is the exact sequence from `frappe/model/document.py`.

### On insert (a new document)

When `doc.insert()` runs:

| Hook                  | Use it to                                                  |
| --------------------- | ---------------------------------------------------------- |
| `before_insert`       | Set up values before anything else; runs only on new docs. |
| `before_validate`     | Normalise/clean data before validation.                    |
| `validate`            | Validate the document; throw to abort.                     |
| `before_save`         | Final tweaks just before writing to the DB.                |
| _(row written to DB)_ |                                                            |
| `after_insert`        | React to the new record now that it has a `name`.          |
| `on_update`           | React to the saved state (also runs on every later save).  |
| `on_change`           | Runs after every change (save, submit, cancel, `db_set`).  |

### On save (an existing document)

When `doc.save()` runs on a document that already exists:

| Hook                  | Use it to                         |
| --------------------- | --------------------------------- |
| `before_validate`     | Normalise data before validation. |
| `validate`            | Validate; throw to abort.         |
| `before_save`         | Final tweaks before the DB write. |
| _(row updated in DB)_ |                                   |
| `on_update`           | React to the saved changes.       |
| `on_change`           | Runs after the change.            |

`before_save` and `on_update` are the save-time equivalents of `before_insert`/`after_insert`, but `before_save`/`on_update` run on **both** insert and update, while `before_insert`/`after_insert` run **only** on insert.

### On submit

For [submittable DocTypes](/doctypes/docstatus), when `doc.submit()` runs (docstatus 0 → 1):

| Hook                           | Use it to                                                  |
| ------------------------------ | ---------------------------------------------------------- |
| `before_validate`              | Normalise data.                                            |
| `validate`                     | Validate.                                                  |
| `before_submit`                | Last checks before the document becomes submitted.         |
| _(row updated, docstatus = 1)_ |                                                            |
| `on_update`                    | Runs on submit too.                                        |
| `on_submit`                    | Post the document's effects (ledger entries, stock, etc.). |
| `on_change`                    | Runs after the change.                                     |

### On cancel

When `doc.cancel()` runs (docstatus 1 → 2):

| Hook                           | Use it to                                   |
| ------------------------------ | ------------------------------------------- |
| `before_cancel`                | Checks before cancelling.                   |
| _(row updated, docstatus = 2)_ |                                             |
| `on_cancel`                    | Reverse the effects created in `on_submit`. |
| `on_change`                    | Runs after the change.                      |

After `on_cancel`, Frappe verifies no other active documents link to this one before completing.

### Update after submit

Submitted documents are read-only except for fields marked `allow_on_submit`. Editing such a field and saving (docstatus stays 1) triggers:

| Hook                         | Use it to                        |
| ---------------------------- | -------------------------------- |
| `before_update_after_submit` | Validate the limited edit.       |
| `on_update_after_submit`     | React to the post-submit change. |

### On delete

When `doc.delete()` / `frappe.delete_doc()` runs:

| Hook           | Use it to                                        |
| -------------- | ------------------------------------------------ |
| `on_trash`     | Clean up related data before the row is removed. |
| `after_delete` | Final cleanup after deletion.                    |

### On load

| Hook     | Use it to                                                                                   |
| -------- | ------------------------------------------------------------------------------------------- |
| `onload` | Prepare data for the form when a document is opened (e.g. `self.set_onload("key", value)`). |

### Discard (drafts)

A draft can be discarded (`doc.discard()`), which fires `before_discard` then `on_discard`.

## Quick reference: order of common operations

```text
insert:  before_insert → before_validate → validate → before_save
         → [DB insert] → after_insert → on_update → on_change

save:    before_validate → validate → before_save
         → [DB update] → on_update → on_change

submit:  before_validate → validate → before_submit
         → [DB update] → on_update → on_submit → on_change

cancel:  before_cancel → [DB update] → on_cancel → on_change

delete:  on_trash → [DB delete] → after_delete
```

## Reacting to changed values

Inside `validate`, `on_update` or `on_change` you can compare against the previously saved state:

```python
class Task(Document):
    def on_update(self):
        if self.has_value_changed("status"):
            old = self.get_value_before_save("status")
            frappe.msgprint(f"Status changed from {old} to {self.status}")
```

`has_value_changed(fieldname)` returns `True` if the value differs from the database copy; `get_value_before_save(fieldname)` returns the previous value. These only work in a save context.

## Extending another app's controller

Hooks defined directly on the class are for the DocType's own app. To run logic on a DocType owned by **another** app, register a handler via `doc_events` in `hooks.py` rather than editing its controller. See [Hooks](/server-side/hooks).

```python
# hooks.py
doc_events = {
    "Task": {
        "on_update": "your_app.tasks.notify_on_update",
    }
}
```

```python
# your_app/tasks.py
def notify_on_update(doc, method):
    # `doc` is the Task document, `method` is "on_update"
    ...
```

## See also

- [Docstatus](/doctypes/docstatus): the submit/cancel state machine.
- [Hooks](/server-side/hooks): hooking into other apps' DocTypes.
- [Document API](/server-side/document-api): `insert`, `save`, `submit`, `db_set`, etc.
