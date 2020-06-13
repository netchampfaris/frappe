# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe
from frappe.website.router_new.redirect import resolve_redirect
from frappe.website.utils import get_home_page
from frappe.website.render import (
	resolve_from_map,
	is_static_file,
	get_static_file_response,
)

# from frappe.website.router_new import get_context
from frappe.website.context import get_context


class Route:
	def __init__(self, request=None):
		if not request:
			request = frappe.local.request

		self.request = request
		self.path = self.get_path()
		frappe.local.route = self
		frappe.local.path = self.path

		self.raise_if_disabled()
		self.redirect_to = self.get_redirect()

		if self.is_404():
			self.path = "404"
			return

		if not self.is_cached():
			self.context = get_context(self.path)

	def raise_if_disabled(self):
		raise_if_disabled(self.path)

	def get_redirect(self):
		return resolve_redirect(self.path)

	def is_404(self):
		if self.can_cache() and frappe.cache().hget("website_404", frappe.request.url):
			return True

	def resolve_route_rules(self):
		if self.path != "index":
			return resolve_from_map(self.path)

	def get_path(self):
		path = self.request.path
		path = path.strip("/ ")

		if not path:
			path = "index"

		if path.endswith(".html"):
			path = path[:-5]

		if path.endswith(".md"):
			path = path[:-3]

		if path == "index":
			path = get_home_page()

		return path

	def get_cache_key(self):
		return self.path + ":" + frappe.local.lang

	def is_cached(self):
		return frappe.cache().hexists("rendered_page_cache", self.get_cache_key())

	def get_cached(self):
		return frappe.cache().hget("rendered_page_cache", self.get_cache_key())

	def set_cache(self, value):
		frappe.cache().hset("rendered_page_cache", self.get_cache_key(), value)

	def can_cache(self, no_cache=False):
		if frappe.conf.disable_website_cache or frappe.conf.developer_mode:
			return False
		if getattr(frappe.local, "no_cache", False):
			return False
		return not no_cache


def raise_if_disabled(path):
	routes = frappe.db.get_all(
		"Portal Menu Item",
		fields=["route", "enabled"],
		filters={"enabled": 0, "route": ["like", "%{0}".format(path)]},
	)

	for r in routes:
		_path = r.route.lstrip("/")
		if path == _path and not r.enabled:
			raise frappe.exceptions.NotFound
