# -*- coding: utf-8 -*-
# Copyright (c) 2020, Frappe Technologies and contributors
# For license information, please see license.txt

from __future__ import unicode_literals
from frappe.model.document import Document
from frappe.utils.safe_exec import safe_exec


class PermissionScript(Document):
	def get_permission_query_conditions(self, doctype, user):
		if not self.enabled:
			return
		locals = {"doctype": doctype, "user": user, "conditions": ""}
		safe_exec(self.script, None, locals)
		if locals["conditions"]:
			return locals["conditions"]
