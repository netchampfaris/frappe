---
title: Controllers & Business Logic
---

# Controllers & Business Logic

The **controller** is the Python class behind a DocType. For Article it lives in
`article.py` and subclasses `Document`. Frappe calls specially named methods on it
at fixed points in a document's life. The most common one is `validate`, which
runs every time a document is about to be saved. You add server-side rules there.

Open the controller file generated when you created the Article DocType:

```text
apps/library_management/library_management/library_management/doctype/article/article.py
```

## Add a validate method

Replace the empty class body with a `validate` method. This one cleans up the
ISBN and rejects an invalid length:

```python
import frappe
from frappe.model.document import Document


class Article(Document):
	def validate(self):
		if self.isbn:
			self.isbn = self.isbn.replace("-", "").strip()
			if len(self.isbn) not in (10, 13):
				frappe.throw("ISBN must be 10 or 13 digits")
```

`self` is the document being saved, and each field is an attribute on it
(`self.isbn`, `self.status`, and so on). Changing an attribute inside `validate`
changes what gets written to the database, so stripping dashes from `self.isbn`
sticks.

`frappe.throw(message)` stops the save. It raises a `ValidationError`, rolls back
the transaction, and shows the message to the user. Use it whenever the data is
not allowed.

## Try it

No restart is needed for controller changes when `bench start` is running. Open an Article,
type an ISBN with dashes like `978-0-13-595705-9`, and save. The dashes are
removed. Now type a short value like `123` and save: the message appears and the
save is blocked.

## When validate runs

`validate` runs on both insert (new document) and save (existing document), right
before the row is written. The full save sequence is:

```text
insert:  before_insert → before_validate → validate → before_save
         → [DB insert] → after_insert → on_update → on_change

save:    before_validate → validate → before_save
         → [DB update] → on_update → on_change
```

You never call these methods yourself; Frappe calls them. Define only the ones
you need. A few you will reach for:

- `before_validate`: clean or normalise data before `validate` checks it.
- `before_save`: last changes before the DB write.
- `after_insert`: react to a brand new record once it has a `name`.
- `on_update`: react to a saved change (runs on insert and save).

The exact order comes from `run_before_save_methods` and `run_post_save_methods`
in `frappe/model/document.py`. See
[Controllers and Lifecycle](/doctypes/controllers-lifecycle) for the complete
list, including submit, cancel and delete hooks.

## React to a changed value

Inside `validate` or `on_update` you can check what changed since the last save.
For example, stamp who is on the record when status flips to `Issued`:

```python
class Article(Document):
	def validate(self):
		if self.isbn:
			self.isbn = self.isbn.replace("-", "").strip()
			if len(self.isbn) not in (10, 13):
				frappe.throw("ISBN must be 10 or 13 digits")

		if self.has_value_changed("status") and self.status == "Issued":
			frappe.msgprint(f"{self.article_name} is now marked as issued.")
```

`has_value_changed(fieldname)` returns `True` when the field differs from the copy
in the database. `frappe.msgprint(message)` shows a non-blocking message; unlike
`frappe.throw` it does not stop the save.

The validation so far is server-side, so it holds no matter how the document is
saved (form, API, or import). On the next page you add browser-side behaviour to
the form itself.

Continue to [Form Scripts](/tutorial/form-scripts).
