import mimetypes
from pathlib import Path

from werkzeug.wrappers import Response
from werkzeug.wsgi import wrap_file

import frappe
from frappe.website.page_renderers.base_renderer import BaseRenderer


class DocsPage(BaseRenderer):
	route_prefix = "docs"

	def __init__(self, path=None, http_status_code=None):
		super().__init__(path=path, http_status_code=http_status_code)
		self.dist_dir = (
			Path(frappe.get_app_path("frappe")).parent / "docs" / ".vitepress" / "dist"
		).resolve()

	def can_render(self):
		return self.path == self.route_prefix or self.path.startswith(f"{self.route_prefix}/")

	def render(self):
		if self.path == self.route_prefix:
			return Response(
				"",
				status=302,
				headers={"Location": f"/{self.route_prefix}/getting-started/introduction"},
			)

		if not self.dist_dir.exists():
			return Response(
				"Docs build not found. Run `cd apps/frappe/docs && yarn build:frappe`.",
				status=503,
				mimetype="text/plain",
			)

		file_path = self.get_file_path()
		if not file_path:
			return self.get_not_found_response()

		return self.get_static_response(file_path)

	def get_file_path(self):
		relative_path = self.path.removeprefix(self.route_prefix).strip("/")
		if not relative_path:
			relative_path = "index.html"

		for candidate in self.get_candidate_paths(relative_path):
			candidate = candidate.resolve()
			if candidate.is_relative_to(self.dist_dir) and candidate.is_file():
				return candidate

		return None

	def get_candidate_paths(self, relative_path):
		path = self.dist_dir / relative_path
		yield path

		if not path.suffix:
			yield path.with_suffix(".html")
			yield path / "index.html"

	def get_not_found_response(self):
		file_path = self.dist_dir / "404.html"
		if file_path.is_file():
			return self.get_static_response(file_path, status=404)

		return Response("Not Found", status=404, mimetype="text/plain")

	def get_static_response(self, file_path, status=200):
		# File descriptor is closed by Werkzeug after the response is sent.
		file = open(file_path, "rb")
		response = Response(
			wrap_file(frappe.local.request.environ, file),
			status=status,
			direct_passthrough=True,
		)
		response.mimetype = mimetypes.guess_type(file_path)[0] or "application/octet-stream"

		if file_path.suffix == ".html":
			response.headers["Cache-Control"] = "no-cache"
		else:
			response.headers["Cache-Control"] = "public, max-age=31536000, immutable"

		return response
