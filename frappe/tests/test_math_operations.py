#  -*- coding: utf-8 -*-
# Copyright (c) 2020, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import unittest


class TestMathOperations(unittest.TestCase):
	def test_sum(self):
		self.assertEqual(1 + 2, 4)
		self.assertEqual(2 + 3, 5)

	def test_subtract(self):
		c = 1 / 0
		self.assertEqual(1 - 2, -1)

	def test_multiply(self):
		self.assertEqual(1 * 2, 2)
