# Copyright (c) 2021, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe


@frappe.whitelist()
def new(doctype, print_format_name):
	doc = frappe.new_doc("Print Format")
	doc.doc_type = doctype
	doc.name = print_format_name
	doc.print_format_builder = 1
	doc.format_data = frappe.as_json(get_default_layout(doctype))
	doc.insert()
	return doc


@frappe.whitelist()
def download_pdf(doctype, name, print_format, letterhead=None):
	html, header, footer = get_html(doctype, name, print_format, letterhead)

	# frappe.local.response.result = html
	# frappe.local.response.doctype = 'asdf'
	# frappe.local.response.type = 'txt'
	# return

	from .weasypdf import get_pdf

	filename = name.replace(" ", "-").replace("/", "-")
	frappe.local.response.filename = f"{filename}.pdf"
	frappe.local.response.filecontent = get_pdf(html, header, footer)
	frappe.local.response.type = "pdf"


def get_html(doctype, name, print_format, letterhead=None):
	from frappe.utils import cint
	print_format = frappe.get_doc("Print Format", print_format)
	letterhead = frappe.get_doc("Letter Head", letterhead) if letterhead else None
	doc = frappe.get_doc(doctype, name)

	layout = frappe.parse_json(print_format.format_data)
	paper_width_map = {"A4": 210, "Letter": 216}
	paper_width = paper_width_map.get(layout.size or "A4")
	body_width = paper_width - cint(layout.margin_left) - cint(layout.margin_right)

	context = frappe._dict(
		doctype=doctype,
		name=name,
		doc=doc,
		layout=layout,
		letterhead=letterhead,
		paper_width=paper_width,
		body_width=body_width,
	)
	context.print_format_css = frappe.render_template(
		"templates/print_format/print_format.template.css", context, is_path=True,
	)
	html = frappe.render_template(
		"templates/print_format/print_format.template.html", context, is_path=True,
	)

	css = f"""
	<style>
	header, footer {{
		font-family: "Inter", "-apple-system", "BlinkMacSystemFont","Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell","Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
	}}

	header {{
		position: fixed;
		top: {layout.margin_top}mm;
		left: {layout.margin_left}mm;
		right: {layout.margin_right}mm;
		width: {body_width}mm;
	}}

	footer {{
		position: fixed;
		bottom: {layout.margin_bottom}mm;
		left: {layout.margin_left}mm;
		right: {layout.margin_right}mm;
		width: {body_width}mm;
	}}
	</style>
	"""

	header = f"""{css}
		<header>
			{frappe.render_template(letterhead.content, context) if letterhead else ''}
			{frappe.render_template(layout.header["html"], context)}
		</header>
	"""

	footer = f"""{css}
		<footer>
			{frappe.render_template(layout.footer["html"], context)}
			{frappe.render_template(letterhead.footer, context) if letterhead else ''}
		</footer>
	"""

	return html, header, footer


def get_default_layout(doctype):
	sections = get_sections(doctype)

	return {
		"size": "A4",
		"margin_top": 15,
		"margin_left": 15,
		"margin_right": 15,
		"margin_bottom": 15,
		"letterhead": None,
		"header": {
			"html": f"""
				<h1 class="header-title">{doctype}</h1>
				<p class="header-subtitle">{{{{ doc.name }}}}</p>
			""",
		},
		"footer": {"html": ""},
		"sections": sections,
	}


def get_sections(doctype):
	meta = frappe.get_meta(doctype)
	sections = []

	current_section = None
	current_column = None

	for df in meta.fields:
		if df.fieldtype == "Section Break":
			if current_column:
				current_section.columns.append(current_column)
				current_column = None

			if current_section:
				sections.append(current_section)
				current_section = None

			current_section = frappe._dict(pluck(df, ["label", "fieldname"]))
			current_section.columns = []
			continue

		if df.fieldtype == "Column Break":
			if current_section and current_column:
				current_section.columns.append(current_column)
				current_column = None

			current_column = frappe._dict(pluck(df, ["label", "fieldname"]))
			current_column.fields = []
			continue

		if not current_section:
			current_section = frappe._dict(label="", columns=[])

		if not current_column:
			current_column = frappe._dict(label="", fields=[])

		current_column.fields.append(
			pluck(df, ["label", "fieldname", "fieldtype", "options"])
		)

	return sections


def pluck(_dict, keys):
	out = {}
	for key in keys:
		value = _dict.get(key)
		if value:
			out[key] = value
	return out
