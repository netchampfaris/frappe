"""Server views — enriched queries declared by apps.

Usage:

    from frappe.sync import view

    @view("gameplan.discussion_feed", depends_on=["GP Discussion", "GP Comment"])
    def discussion_feed(filters=None, order_by=None, start=0, limit=20):
        # any query — joins, subqueries, computed fields. Must return rows with `name`.
        ...

Views are always server-evaluated. They stay live because any change to a `depends_on`
doctype is a change all view subscribers care about; the client re-pulls (debounced).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable


@dataclass
class View:
	name: str
	fn: Callable
	depends_on: list[str] = field(default_factory=list)


_registry: dict[str, View] = {}


def view(name: str, depends_on: list[str] | None = None):
	"""Register a server view. The decorated function is a normal Python query."""

	def decorator(fn: Callable) -> Callable:
		_registry[name] = View(name=name, fn=fn, depends_on=list(depends_on or []))
		return fn

	return decorator


def get_view(name: str) -> View | None:
	return _registry.get(name)


def list_views() -> list[View]:
	return list(_registry.values())


def all_depends_on() -> set[str]:
	out: set[str] = set()
	for v in _registry.values():
		out.update(v.depends_on)
	return out
