# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals

import unittest
import frappe


class TestQueryBuilder(unittest.TestCase):
	def test_simple_select(self):
		d = frappe.query("ToDo").to_sql()
		self.assertEqual(d, "select `name` from `tabToDo`")

	def test_select_with_fields(self):
		d = frappe.query("ToDo").select("name", "title", "description").to_sql()
		self.assertEqual(d, "select `name`,`title`,`description` from `tabToDo`")

	def test_select_with_filters(self):
		d = frappe.query("ToDo").where("name", "=", "test").to_sql()
		self.assertEqual(d, "select `name` from `tabToDo` WHERE `name` = %(filter_name)s")

	def test_select_with_group_by(self):
		d = frappe.query("ToDo").group_by("MONTH(creation)").to_sql()
		self.assertEqual(d, "select `name` from `tabToDo` GROUP BY MONTH(creation)")

	def test_select_with_order_by(self):
		d = frappe.query("ToDo").order_by("creation", "desc").to_sql()
		self.assertEqual(d, "select `name` from `tabToDo` ORDER BY `creation` desc")

	def test_select_with_limit(self):
		d = frappe.query("ToDo").limit(1).to_sql()
		self.assertEqual(d, "select `name` from `tabToDo` LIMIT 1")

	def test_select_with_offset(self):
		d = frappe.query("ToDo").offset(20).to_sql()
		self.assertEqual(d, "select `name` from `tabToDo` OFFSET 20")

	def test_select_with_pluck(self):
		frappe.get_doc(doctype="ToDo", description="test").insert()
		d = frappe.query("ToDo").pluck("name").execute(as_dict=1)
		self.assertTrue(isinstance(d[0], str))

	def tearDown(self):
		frappe.db.rollback()
