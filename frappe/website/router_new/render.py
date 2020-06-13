# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe
import mimetypes
from werkzeug.wrappers import Response
from frappe.website.render import is_static_file, get_static_file_response
from frappe.website.router_new.redirect import redirect


class Render:
	def __init__(self, route):
		self.route = route
		self.path = self.route.path

		if self.route.redirect_to:
			return redirect(self.route.redirect_to)

		if is_static_file(self.path):
			self.response = get_static_file_response()
			return

		self.from_cache = False
		self.http_status_code = 200

		if self.route.can_cache() and self.route.is_cached():
			self.rendered_html = self.route.get_cached()
			self.from_cache = True
		else:
			self.rendered_html = self.build_page()

		self.response = self.build_response()

	def build_page(self):
		context = self.route.context
		html = frappe.render_template(context.source or context.template, context)

		# if "{index}" in html:
		# 	html = html.replace("{index}", get_toc(context.route))

		# if "{next}" in html:
		# 	html = html.replace("{next}", get_next_link(context.route))

		if self.route.can_cache(context.no_cache):
			self.route.set_cache(html)

		return html

	def build_response(self):
		response = Response()
		response.data = set_content_type(response, self.rendered_html, self.path)
		response.status_code = self.http_status_code or 200
		response.headers["X-Page-Name"] = self.path.encode(
			"ascii", errors="xmlcharrefreplace"
		)
		response.headers["X-From-Cache"] = self.from_cache or False

		# if headers:
		# 	for key, val in iteritems(headers):
		# 		response.headers[key] = val.encode("ascii", errors="xmlcharrefreplace")

		return response


def build_page(path):
	context = get_context(path)
	html = frappe.render_template(context.source or context.template, context)

	if "{index}" in html:
		html = html.replace("{index}", get_toc(context.route))

	if "{next}" in html:
		html = html.replace("{next}", get_next_link(context.route))

	if can_cache(context.no_cache):
		page_cache = frappe.cache().hget("website_page", path) or {}
		page_cache[frappe.local.lang] = html
		frappe.cache().hset("website_page", path, page_cache)

	return html


def set_content_type(response, data, path):
	if isinstance(data, dict):
		response.mimetype = "application/json"
		response.charset = "utf-8"
		data = json.dumps(data)
		return data

	response.mimetype = "text/html"
	response.charset = "utf-8"

	if "." in path:
		content_type, encoding = mimetypes.guess_type(path)
		if content_type:
			response.mimetype = content_type
			if encoding:
				response.charset = encoding

	return data
