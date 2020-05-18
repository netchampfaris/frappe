# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe


def execute():
	frappe.reload_doc("core", "doctype", "data_import_legacy")
	frappe.db.sql(
		"""
		INSERT INTO `tabData Import Legacy`
		SELECT * FROM `tabData Import`
	"""
	)
	frappe.db.sql("DROP TABLE IF EXISTS `tabData Import`")
	frappe.reload_doc("core", "doctype", "data_import")
	frappe.get_doc("DocType", "Data Import").on_update()
