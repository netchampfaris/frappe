# Copyright (c) 2023, Frappe Technologies and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class LikedDocument(Document):
	# begin: auto-generated types
	# This code is auto-generated. Do not modify anything in this block.

	from typing import TYPE_CHECKING

	if TYPE_CHECKING:
		from frappe.types import DF

		reference_doctype: DF.Link | None
		reference_name: DF.DynamicLink | None
		title: DF.Data | None
	# end: auto-generated types

	def db_insert(self, *args, **kwargs):
		pass

	def load_from_db(self):
		print(self.name)
		reference_doctype, reference_name = self.name.split('-')
		super(Document, self).__init__({ 'name': self.name, 'reference_name': reference_name, 'reference_doctype': reference_doctype })

	def db_update(self):
		pass

	@staticmethod
	def get_list(args):
		# doctypes_with_likes = frappe.get_all(
		# 	"DocType",
		# 	filters={"allow_likes": 1},
		# 	fields=["name"],
		# 	as_list=True,
		# )
		print(args)

		doctypes = frappe.db.get_all('DocType', filters={'istable': 0, 'is_virtual': 0, 'issingle': 0}, pluck='name')
		rows = []
		for doctype in doctypes:
			title_field = frappe.get_meta(doctype).get_title_field()
			table = frappe.qb.DocType(doctype)
			result = (
				frappe.qb.get_query(table)
			 	.select(table.name.as_('reference_name'), table._liked_by, table[title_field].as_('title'))
				.where(table._liked_by.isnotnull())
				.run(as_dict=1)
			)
			for row in result:
				row.name = f'{doctype}-{row.reference_name}'
				row.reference_doctype = doctype
			rows.extend(result)

		print(len(doctypes))

		return rows

	@staticmethod
	def get_count(args):
		pass

	@staticmethod
	def get_stats(args):
		pass

	def delete(self):
		pass