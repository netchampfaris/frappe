# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import re
import werkzeug
import frappe


def redirect(location):
	return werkzeug.utils.redirect(location)


def resolve_redirect(path):
	"""
	Resolve redirects from Website Settings and hooks

	Example:

		website_redirect = [
			# absolute location
			{"source": "/from", "target": "https://mysite/from"},

			# relative location
			{"source": "/from", "target": "/main"},

			# use regex
			{"source": r"/from/(.*)", "target": r"/main/\1"}
			# use r as a string prefix if you use regex groups or want to escape any string literal
		]
	"""
	redirects = frappe.get_hooks("website_redirects")
	redirects += frappe.db.get_all("Website Route Redirect", ["source", "target"])

	if not redirects:
		return

	def get_redirect_location():
		for rule in redirects:
			pattern = rule["source"].strip("/ ") + "$"
			if re.match(pattern, path):
				redirect_to = re.sub(pattern, rule["target"], path)
				return redirect_to

	return frappe.cache().hget("website_redirects", path, generator=get_redirect_location)
