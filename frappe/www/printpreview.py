# Copyright (c) 2021, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe
from frappe.printing.page.print_format_editor.print_format_editor import get_html


def get_context(context):
	doctype = frappe.form_dict.doctype
	name = frappe.form_dict.name
	html, header, footer = get_html(doctype, name, frappe.form_dict.print_format, frappe.form_dict.letterhead)
	context.html = html
