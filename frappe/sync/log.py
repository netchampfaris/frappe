"""Sync Log writer — the cursor is a Sync Log row's autoincrement name.

Rows are written via direct `frappe.qb` inserts (not `frappe.get_doc(...).insert()`)
because they must be cheap: one row per touched doc per commit. The write happens
on the `Document.notify_update()` path (after commit), matching where `list_update`
fires today.

Doctypes opt in via `sync_doctypes` in `hooks.py`. All doctypes referenced by any
registered view are automatically added.
"""

from __future__ import annotations

import frappe
from frappe.query_builder import DocType


def _opted_in_doctypes() -> set[str]:
	from frappe.sync.views import all_depends_on

	# hooks.sync_doctypes is a list of doctype names.
	fromhooks = frappe.get_hooks("sync_doctypes") or []
	return set(fromhooks) | all_depends_on()


def is_synced(doctype: str) -> bool:
	if doctype == "Sync Log":
		return False
	return doctype in _opted_in_doctypes()


def _insert_row(op: str, doctype: str, name: str, new_name: str | None = None):
	from frappe.database.sequence import get_next_val

	user = frappe.session.user if frappe.session else "Administrator"
	now = frappe.utils.now()
	# Autoincrement name via the doctype's sequence.
	row_name = get_next_val("Sync Log")

	table = DocType("Sync Log")
	frappe.qb.into(table).columns(
		table.name, table.ref_doctype, table.ref_name, table.op, table.new_name,
		table.user, table.owner, table.modified_by, table.creation, table.modified,
	).insert(
		row_name, doctype, name, op, new_name, user, user, user, now, now,
	).run()


def notify_change(doctype: str, name: str, op: str, new_name: str | None = None):
	"""Called from Document.notify_update() (or equivalents) for opted-in doctypes.

	`op` is one of: create, update, delete, rename.
	"""
	if not is_synced(doctype):
		return
	_insert_row(op=op, doctype=doctype, name=name, new_name=new_name)
	# Fan out over realtime — dev binding uses publish_realtime for now (works with
	# the existing socket.io realtime process; the native realtime binding is a
	# later swap).
	try:
		frappe.publish_realtime(
			event="sync.change",
			message={
				"doctype": doctype,
				"name": name,
				"op": op,
				"newName": new_name,
			},
			room=f"sync:{doctype}",
			after_commit=True,
		)
	except Exception:
		# non-fatal: notifications are best-effort
		frappe.logger("sync").exception("sync.change publish failed")


def current_cursor() -> int:
	"""Return the tip of the sync log — the highest known name, or 0 if empty."""
	row = frappe.db.sql("SELECT MAX(name) FROM `tabSync Log`", as_dict=False)
	if row and row[0][0] is not None:
		return int(row[0][0])
	return 0


def changes_since(cursor: int, doctypes: list[str] | None = None):
	"""Return sync log rows > cursor. Filters by doctype if given."""
	table = DocType("Sync Log")
	q = (
		frappe.qb.from_(table)
		.select(table.name, table.ref_doctype, table.ref_name, table.op, table.new_name)
		.where(table.name > cursor)
	)
	if doctypes:
		q = q.where(table.ref_doctype.isin(doctypes))
	q = q.orderby(table.name)
	return q.run(as_dict=True)
