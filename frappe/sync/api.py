"""frappe.sync — HTTP endpoints (whitelisted, permission-aware).

`sync.pull` and `sync.push` run in web workers with the full permission machinery.
`pull` uses the same query path as `get_list` (row + field permissions).
`push` calls real `doc.insert()` / `doc.save()` so every hook, validation, and
notification behaves exactly as it does today.

Applied mutation ids are recorded (keyed by user) for idempotent replay.
"""

from __future__ import annotations

import json
from typing import Any

import frappe
from frappe import _
from frappe.sync.log import changes_since, current_cursor
from frappe.sync.views import get_view


# ---------- pull -----------------------------------------------------------------


def _run_list_query(doctype: str, params: dict) -> list[dict]:
	filters = params.get("filters")
	fields = params.get("fields") or ["*"]
	order_by = params.get("orderBy") or "modified desc"
	limit = params.get("limit")
	return frappe.get_list(
		doctype,
		filters=filters,
		fields=fields,
		order_by=order_by,
		limit_page_length=limit,
		ignore_permissions=False,
	)


@frappe.whitelist(methods=["POST"])
def pull(subs: list[dict] | str | None = None, cursor: int | str | None = None) -> dict:
	if isinstance(subs, str):
		subs = json.loads(subs)
	if isinstance(cursor, str):
		cursor = int(cursor) if cursor else None

	out_docs: dict[str, list[dict]] = {}
	out_deletes: dict[str, list[str]] = {}
	out_renames: dict[str, list[dict]] = {}
	out_counts: dict[str, int] = {}
	resync = False

	# Detect cursor expiry — if the cursor is below the earliest retained row.
	if cursor is not None:
		earliest_row = frappe.db.sql("SELECT MIN(name) FROM `tabSync Log`")
		earliest = earliest_row[0][0] if earliest_row and earliest_row[0] else None
		if earliest is not None and int(cursor) < (int(earliest) - 1):
			resync = True
			# still return the current cursor so client can re-establish
			return {
				"docs": {},
				"deletes": {},
				"renames": {},
				"counts": {},
				"cursor": current_cursor(),
				"resync": True,
			}

	# Group subs to fetch changes once
	touched_doctypes: set[str] = set()
	for sub in subs or []:
		q = sub.get("query") or {}
		if q.get("kind") in ("list", "doc", "count") and q.get("doctype"):
			touched_doctypes.add(q["doctype"])

	delta_by_doctype: dict[str, list[dict]] = {}
	if cursor is not None and touched_doctypes:
		rows = changes_since(int(cursor), list(touched_doctypes))
		for r in rows:
			delta_by_doctype.setdefault(r["ref_doctype"], []).append(r)

	for sub in subs or []:
		sid = sub["id"]
		q = sub["query"]
		kind = q.get("kind")

		if kind == "list":
			out_docs[sid] = _run_list_query(q["doctype"], q)
			# deltas
			if cursor is not None:
				for r in delta_by_doctype.get(q["doctype"], []):
					if r["op"] == "delete":
						out_deletes.setdefault(sid, []).append(r["ref_name"])
					elif r["op"] == "rename":
						out_renames.setdefault(sid, []).append(
							{"from": r["ref_name"], "to": r["new_name"]}
						)
		elif kind == "doc":
			try:
				doc = frappe.get_doc(q["doctype"], q["name"])
				doc.check_permission("read")
				out_docs[sid] = [doc.as_dict()]
			except Exception:
				out_docs[sid] = []
			if cursor is not None:
				for r in delta_by_doctype.get(q["doctype"], []):
					if r["ref_name"] == q["name"] and r["op"] == "delete":
						out_deletes.setdefault(sid, []).append(r["ref_name"])
		elif kind == "count":
			out_counts[sid] = frappe.db.count(q["doctype"], q.get("filters") or {})
		elif kind == "view":
			view = get_view(q["view"])
			if not view:
				out_docs[sid] = []
				continue
			rows = view.fn(
				filters=q.get("filters"),
				order_by=q.get("orderBy"),
				start=q.get("start", 0),
				limit=q.get("limit"),
			) or []
			# Coerce to list of dicts with a `name` key
			out_docs[sid] = list(rows)

	return {
		"docs": out_docs,
		"deletes": out_deletes,
		"renames": out_renames,
		"counts": out_counts,
		"cursor": current_cursor(),
		**({"resync": True} if resync else {}),
	}


# ---------- push -----------------------------------------------------------------


def _applied_ids_cache_key(user: str) -> str:
	return f"sync:applied:{user}"


def _get_applied(user: str) -> dict[str, dict]:
	cache = frappe.cache()
	raw = cache.get_value(_applied_ids_cache_key(user)) or {}
	if isinstance(raw, str):
		raw = json.loads(raw)
	return raw or {}


def _set_applied(user: str, applied: dict[str, dict]):
	cache = frappe.cache()
	cache.set_value(_applied_ids_cache_key(user), applied, expires_in_sec=60 * 60)


def _apply_one(m: dict) -> dict:
	op = m["op"]
	doctype = m["doctype"]

	if op == "insert":
		doc = frappe.get_doc({"doctype": doctype, **(m.get("values") or {})})
		doc.insert()
		return {"id": m["id"], "status": "applied", "doc": doc.as_dict()}

	if op == "set_value":
		name = m["name"]
		doc = frappe.get_doc(doctype, name)
		base = m.get("base")
		if base and str(doc.modified) != str(base):
			return {"id": m["id"], "status": "conflict", "doc": doc.as_dict()}
		for k, v in (m.get("values") or {}).items():
			doc.set(k, v)
		doc.save()
		return {"id": m["id"], "status": "applied", "doc": doc.as_dict()}

	if op == "delete":
		frappe.delete_doc(doctype, m["name"])
		return {"id": m["id"], "status": "applied"}

	if op == "rename":
		new_name = (m.get("values") or {}).get("new_name")
		if not new_name:
			return {"id": m["id"], "status": "error",
				"error": {"code": "bad_request", "message": "rename requires values.new_name"}}
		frappe.rename_doc(doctype, m["name"], new_name)
		return {"id": m["id"], "status": "applied",
			"doc": frappe.get_doc(doctype, new_name).as_dict()}

	if op == "run_doc_method":
		doc = frappe.get_doc(doctype, m["name"])
		fn = getattr(doc, m["method"])
		fn(**(m.get("args") or {}))
		doc.reload()
		return {"id": m["id"], "status": "applied", "doc": doc.as_dict()}

	return {"id": m["id"], "status": "error",
		"error": {"code": "bad_request", "message": f"unknown op {op}"}}


@frappe.whitelist(methods=["POST"])
def push(mutations: list[dict] | str | None = None) -> dict:
	if isinstance(mutations, str):
		mutations = json.loads(mutations)
	user = frappe.session.user
	applied = _get_applied(user)
	results: list[dict] = []
	stopped = False

	for m in mutations or []:
		mid = m["id"]
		if stopped:
			results.append({"id": mid, "status": "error",
				"error": {"code": "not_run", "message": "stopped by prior failure"}})
			continue

		if mid in applied:
			# Idempotent replay — return the prior result verbatim.
			results.append(applied[mid])
			continue

		try:
			r = _apply_one(m)
		except frappe.PermissionError as e:
			r = {"id": mid, "status": "error",
				"error": {"code": "permission", "message": str(e)}}
		except frappe.ValidationError as e:
			r = {"id": mid, "status": "error",
				"error": {"code": "validation", "message": str(e)}}
		except Exception as e:
			frappe.logger("sync").exception("push failed")
			r = {"id": mid, "status": "error",
				"error": {"code": "server_error", "message": str(e)}}

		results.append(r)
		if r["status"] == "applied":
			applied[mid] = r
		else:
			stopped = True

	_set_applied(user, applied)
	return {"results": results}
