"""Tests for frappe.sync — log, pull, push, views.

Runs with:  bench --site test.localhost run-tests --module frappe.sync.test_sync

Uses ToDo (a built-in doctype) as the target; it is opted into `sync_doctypes` in
the test setup and reset between tests.
"""

from __future__ import annotations

import unittest

import frappe
from frappe.tests import IntegrationTestCase


SYNCED_DOCTYPES = ["ToDo"]


class SyncTestBase(IntegrationTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		# Register ToDo as synced for tests by patching _opted_in_doctypes.
		from frappe.sync import log as sync_log

		cls._orig_opted = sync_log._opted_in_doctypes
		def patched():
			return set(SYNCED_DOCTYPES) | cls._orig_opted()
		sync_log._opted_in_doctypes = patched

	@classmethod
	def tearDownClass(cls):
		from frappe.sync import log as sync_log
		sync_log._opted_in_doctypes = cls._orig_opted
		super().tearDownClass()

	def setUp(self):
		frappe.db.delete("Sync Log")
		frappe.db.delete("ToDo", {"description": ["like", "sync-test%"]})
		frappe.db.commit()

	def tearDown(self):
		frappe.db.rollback()


class TestSyncLog(SyncTestBase):
	def test_create_writes_a_row(self):
		td = frappe.get_doc({"doctype": "ToDo", "description": "sync-test-1"}).insert()
		frappe.db.commit()
		rows = frappe.get_all(
			"Sync Log",
			filters={"ref_doctype": "ToDo", "ref_name": td.name},
			fields=["op"],
			order_by="name",
		)
		ops = [r.op for r in rows]
		self.assertIn("create", ops)

	def test_update_writes_row(self):
		td = frappe.get_doc({"doctype": "ToDo", "description": "sync-test-2"}).insert()
		td.description = "sync-test-2-updated"
		td.save()
		frappe.db.commit()
		rows = frappe.get_all(
			"Sync Log",
			filters={"ref_doctype": "ToDo", "ref_name": td.name},
			fields=["op"],
			order_by="name",
		)
		self.assertIn("update", [r.op for r in rows])

	def test_delete_writes_row(self):
		td = frappe.get_doc({"doctype": "ToDo", "description": "sync-test-3"}).insert()
		name = td.name
		td.delete()
		frappe.db.commit()
		rows = frappe.get_all(
			"Sync Log",
			filters={"ref_doctype": "ToDo", "ref_name": name, "op": "delete"},
		)
		self.assertTrue(rows)

	def test_opted_out_doctype_writes_no_row(self):
		from frappe.sync.log import is_synced, notify_change

		# Comment is not in SYNCED_DOCTYPES (and not depended on by any view here)
		self.assertFalse(is_synced("Comment"))
		# Calling notify_change directly must no-op for opted-out doctypes
		before = frappe.db.count("Sync Log")
		notify_change("Comment", "test-comment-name", "create")
		frappe.db.commit()
		after = frappe.db.count("Sync Log")
		self.assertEqual(before, after)


class TestSyncPull(SyncTestBase):
	def test_initial_snapshot_returns_list_docs(self):
		from frappe.sync.api import pull

		td1 = frappe.get_doc({"doctype": "ToDo", "description": "sync-test-A"}).insert()
		td2 = frappe.get_doc({"doctype": "ToDo", "description": "sync-test-B"}).insert()
		frappe.db.commit()

		resp = pull(
			subs=[
				{"id": "s1", "query": {"kind": "list", "doctype": "ToDo",
					"filters": {"description": ["like", "sync-test-%"]}}},
			],
		)
		names = {d["name"] for d in resp["docs"]["s1"]}
		self.assertIn(td1.name, names)
		self.assertIn(td2.name, names)
		self.assertIn("cursor", resp)

	def test_delta_since_cursor_returns_deletes(self):
		from frappe.sync.api import pull

		td = frappe.get_doc({"doctype": "ToDo", "description": "sync-test-D"}).insert()
		frappe.db.commit()
		before_cursor = frappe.db.sql("SELECT MAX(name) FROM `tabSync Log`")[0][0]

		td.delete()
		frappe.db.commit()

		resp = pull(
			subs=[
				{"id": "s1", "query": {"kind": "list", "doctype": "ToDo"}},
			],
			cursor=int(before_cursor),
		)
		self.assertIn(td.name, resp["deletes"].get("s1", []))

	def test_count_query(self):
		from frappe.sync.api import pull

		frappe.get_doc({"doctype": "ToDo", "description": "sync-test-C1"}).insert()
		frappe.get_doc({"doctype": "ToDo", "description": "sync-test-C2"}).insert()
		frappe.db.commit()

		resp = pull(
			subs=[
				{"id": "c", "query": {"kind": "count", "doctype": "ToDo",
					"filters": {"description": ["like", "sync-test-C%"]}}},
			],
		)
		self.assertGreaterEqual(resp["counts"].get("c", 0), 2)


class TestSyncPush(SyncTestBase):
	def test_insert_creates_doc(self):
		from frappe.sync.api import push

		resp = push(
			mutations=[
				{
					"id": "m1",
					"op": "insert",
					"doctype": "ToDo",
					"name": "local:1",
					"values": {"description": "sync-test-push-1"},
				}
			]
		)
		result = resp["results"][0]
		self.assertEqual(result["status"], "applied")
		self.assertIn("doc", result)
		self.assertNotEqual(result["doc"]["name"], "local:1")

	def test_set_value_updates(self):
		from frappe.sync.api import push

		td = frappe.get_doc({"doctype": "ToDo", "description": "sync-test-push-2"}).insert()
		frappe.db.commit()
		resp = push(
			mutations=[
				{
					"id": "m2",
					"op": "set_value",
					"doctype": "ToDo",
					"name": td.name,
					"values": {"description": "sync-test-push-2-new"},
					"base": str(td.modified),
				}
			]
		)
		self.assertEqual(resp["results"][0]["status"], "applied")
		td.reload()
		self.assertEqual(td.description, "sync-test-push-2-new")

	def test_stale_base_yields_conflict(self):
		from frappe.sync.api import push

		td = frappe.get_doc({"doctype": "ToDo", "description": "sync-test-push-3"}).insert()
		frappe.db.commit()
		resp = push(
			mutations=[
				{
					"id": "m3",
					"op": "set_value",
					"doctype": "ToDo",
					"name": td.name,
					"values": {"description": "sync-test-push-3-new"},
					"base": "9999-01-01 00:00:00",
				}
			]
		)
		self.assertEqual(resp["results"][0]["status"], "conflict")

	def test_idempotent_replay(self):
		from frappe.sync.api import push

		# First application
		resp1 = push(
			mutations=[
				{
					"id": "m-idem-1",
					"op": "insert",
					"doctype": "ToDo",
					"name": "local:X",
					"values": {"description": "sync-test-idem"},
				}
			]
		)
		self.assertEqual(resp1["results"][0]["status"], "applied")
		first_doc_name = resp1["results"][0]["doc"]["name"]

		# Replay: same id, should return prior result without creating a duplicate
		resp2 = push(
			mutations=[
				{
					"id": "m-idem-1",
					"op": "insert",
					"doctype": "ToDo",
					"name": "local:X",
					"values": {"description": "sync-test-idem"},
				}
			]
		)
		self.assertEqual(resp2["results"][0]["status"], "applied")
		# Same server-assigned name
		self.assertEqual(resp2["results"][0]["doc"]["name"], first_doc_name)

	def test_stop_at_first_failure(self):
		from frappe.sync.api import push

		td = frappe.get_doc({"doctype": "ToDo", "description": "sync-test-stop"}).insert()
		frappe.db.commit()

		resp = push(
			mutations=[
				# m1 conflicts
				{
					"id": "stop-m1",
					"op": "set_value",
					"doctype": "ToDo",
					"name": td.name,
					"values": {"description": "changed"},
					"base": "9999-01-01 00:00:00",
				},
				# m2 would normally succeed
				{
					"id": "stop-m2",
					"op": "set_value",
					"doctype": "ToDo",
					"name": td.name,
					"values": {"description": "would-be-fine"},
				},
			]
		)
		self.assertEqual(resp["results"][0]["status"], "conflict")
		self.assertEqual(resp["results"][1]["status"], "error")


class TestViews(SyncTestBase):
	def test_view_depends_on_added_to_sync_set(self):
		from frappe.sync import view
		from frappe.sync.log import _opted_in_doctypes

		@view("sync_test.dummy", depends_on=["Comment"])
		def dummy(**kw):
			return []

		self.assertIn("Comment", _opted_in_doctypes())

	def test_view_evaluated_by_pull(self):
		from frappe.sync import view
		from frappe.sync.api import pull

		@view("sync_test.rowsA", depends_on=["ToDo"])
		def rows(**kw):
			return [{"name": "row1", "custom": "v1"}, {"name": "row2", "custom": "v2"}]

		resp = pull(subs=[{"id": "v1", "query": {"kind": "view", "view": "sync_test.rowsA"}}])
		names = [r["name"] for r in resp["docs"]["v1"]]
		self.assertEqual(sorted(names), ["row1", "row2"])


class TestRealtimeHandlers(SyncTestBase):
	def test_sub_joins_doctype_room_when_permitted(self):
		from frappe.sync.realtime import sync_sub, sync_unsub

		class DummySocket:
			def __init__(self):
				self.rooms = set()
				self.user = "Administrator"

			def has_permission(self, doctype: str) -> bool:
				return True

			def join(self, room: str):
				self.rooms.add(room)

			def leave(self, room: str):
				self.rooms.discard(room)

		s = DummySocket()
		sync_sub(s, "sub1", {"kind": "list", "doctype": "ToDo"})
		self.assertIn("sync:ToDo", s.rooms)
		sync_unsub(s, "sub1", {"kind": "list", "doctype": "ToDo"})
		self.assertNotIn("sync:ToDo", s.rooms)

	def test_sub_refused_without_permission(self):
		from frappe.sync.realtime import sync_sub

		class DummySocket:
			def __init__(self):
				self.rooms = set()

			def has_permission(self, doctype: str) -> bool:
				return False

			def join(self, room: str):
				self.rooms.add(room)

		s = DummySocket()
		sync_sub(s, "sub1", {"kind": "list", "doctype": "ToDo"})
		self.assertEqual(s.rooms, set())


if __name__ == "__main__":
	unittest.main()
