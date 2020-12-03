# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
from typing import Callable
import frappe
from frappe import _


def chainable(func: Callable) -> Callable:
	def inner(self, *args, **kwargs):
		result = func(self, *args, **kwargs)
		if result is None:
			return self
		return result

	return inner


class QueryBuilder:
	def __init__(self, doctype) -> None:
		self.doctype = doctype
		self.fields = []
		self.filters = []
		self.escaped_values = {}
		self._group_by = []
		self._pluck = None
		self._limit = None
		self._offset = None
		self._order_by = []  # (('col1', 'desc'), ('col2', 'asc'))
		self._order_asc = None
		self._order_desc = None

	@chainable
	def select(self, *args):
		self.fields.extend(args)

	@chainable
	def where(self, *parts):
		parts = self._validate_filters(parts)
		self.filters.append(parts)

	@chainable
	def group_by(self, *fields):
		self._group_by.extend(fields)

	@chainable
	def order_by(self, order_by, direction=None):
		self._order_by.append((order_by, direction))

	@chainable
	def desc(self, order_by):
		self._order_by = order_by

	@chainable
	def desc(self, order_by):
		self._order_by = order_by

	@chainable
	def limit(self, limit: int):
		self._limit = limit

	@chainable
	def offset(self, offset: int):
		self._offset = offset

	@chainable
	def pluck(self, field):
		self._pluck = field

	def to_sql(self) -> str:
		select_columns = "select " + self._build_select_columns()
		from_table = "from " + self.table_name
		where = self._build_where_clause()
		group_by = self._build_group_by()
		having = ""
		order_by = self._build_order_by()
		limit = f"LIMIT {self._limit}" if self._limit else ""
		offset = f"OFFSET {self._offset}" if self._offset else ""

		return " ".join(
			filter(
				bool, [select_columns, from_table, where, group_by, having, order_by, limit, offset]
			)
		).strip()

	def execute(self, **kwargs):
		result = frappe.db.sql(self.to_sql(), values=self.escaped_values, **kwargs)
		if isinstance(result[0], dict) and self._pluck:
			return [d[self._pluck] for d in result]
		return result

	def _build_select_columns(self):
		if not self.fields:
			self.fields.append("name")
		return ",".join([self._column_string(field) for field in self.fields])

	def _build_where_clause(self):
		conditions = []
		for filter in self.filters:
			key = f"filter_{filter[0]}"
			self.escaped_values[key] = filter[2]
			column = self._column_string(filter[0])
			operator = filter[1]
			conditions.append(f"{column} {operator} %({key})s")

		if not conditions:
			return ""
		return "WHERE " + " and ".join(conditions)

	def _build_group_by(self):
		if not self._group_by:
			return ""

		return "GROUP BY " + ", ".join(self._group_by)

	def _build_order_by(self):
		if not self._order_by:
			return ""

		return "ORDER BY " + ", ".join(
			[self._column_string(f[0]) + " " + f[1] for f in self._order_by]
		)

	def _validate_filters(self, parts):
		operator = parts[1]
		operator_lower = operator.lower()

		valid_operators = ("=", "!=", ">=", "<=", "<=>", "between")
		if operator_lower not in valid_operators:
			frappe.throw(_("Invalid operator {0}").format(operator))

		if operator.lower() == "between" and len(parts) != 4:
			frappe.throw(_("Between operator requires two arguments"))

		return parts

	def _column_string(self, field):
		return f"`{field}`"

	@property
	def table_name(self):
		return f"`tab{self.doctype}`"
