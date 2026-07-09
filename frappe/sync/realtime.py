"""Realtime handlers for sync subscriptions.

Registered as `sync.sub`/`sync.unsub` on the realtime channel. Change fan-out to
`sync:{doctype}` rooms is done from the web process via `frappe.publish_realtime`
in `frappe.sync.log.notify_change` — no Frappe context needed in the realtime
process on the hot path.

Handlers are plain functions taking a socket-like object with `has_permission`
and `join`/`leave` methods. They're wired to the native realtime server (or a
socket.io shim) at bind time.
"""

from __future__ import annotations

from typing import Any


def _room_for(query: dict[str, Any]) -> str | None:
	kind = query.get("kind")
	if kind in ("list", "doc", "count"):
		return f"sync:{query['doctype']}"
	# view rooms are keyed by view name; the fan-out publishes on doctype rooms of
	# depends_on, so view subscribers should join those rooms instead — resolved
	# via the views registry when a native binding lands.
	return None


def sync_sub(socket, sub_id: str, query: dict[str, Any]):
	room = _room_for(query)
	if not room:
		return
	doctype = query.get("doctype")
	if doctype and not socket.has_permission(doctype):
		return
	socket.join(room)


def sync_unsub(socket, sub_id: str, query: dict[str, Any]):
	room = _room_for(query)
	if not room:
		return
	socket.leave(room)
