# -*- coding: utf-8 -*-
# Copyright (c) 2017, Frappe Technologies and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
import frappe, json
from frappe.model.document import Document

class DataMigrationMapping(Document):

	def get_filters(self):
		if self.condition:
			return frappe.safe_eval(self.condition, dict(frappe=frappe))

	def get_fields(self):
		fields = []
		for f in self.fields:
			if not (f.local_fieldname[0] in ('"', "'") or f.local_fieldname.startswith('eval:')):
				fields.append(f.local_fieldname)

		if frappe.db.has_column(self.local_doctype, self.migration_id_field):
			fields.append(self.migration_id_field)

		if 'name' not in fields:
			fields.append('name')

		return fields

	def get_mapped_record(self, d):
		mapped = frappe._dict()
		for f in self.fields:
			if f.local_fieldname.startswith('eval:'):
				value = frappe.safe_eval(f.local_fieldname[5:], dict(frappe=frappe))
			elif f.local_fieldname[0] in ('"', "'"):
				value = f.local_fieldname[1:-1]
			else:
				value = d.get(f.local_fieldname)
			mapped[f.remote_fieldname] = value

		return mapped

	def pull(self, connection, start, page_length):
		data = connection.get_objects(self.remote_objectname, self.condition, "*", start=start, page_length=page_length)
		# self.make_custom_fields(self.local_doctype) # Creating a custom field for primary key

		# pre process
		if self.pre_process:
			exec self.pre_process in locals()

		for i, self.source in enumerate(data):
			# Fetchnig the appropriate doctype
			target = self.fetch_doctype()
			target.set('migration_key', self.source.get('id')) # Setting migration key

			self.store_mapped_data(target) # fetching data and storing it appropriately
