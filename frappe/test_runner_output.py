# Copyright (c) 2021, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe
from unittest import TextTestResult
from unittest.util import strclass
from simple_chalk import chalk
from IPython.core.ultratb import ColorTB


class PrettyTextTestResult(TextTestResult):
	separator1 = "=" * 70
	separator2 = "-" * 70
	_test_class = None

	def __init__(self, stream, descriptions, verbosity):
		super(PrettyTextTestResult, self).__init__(stream, descriptions, 2)

	def getDescription(self, test):
		test_name, test_module = self.getTestAndModuleName(test)
		description = f"{chalk.white(test_name)} {chalk.gray(test_module)}"
		return description

	def getClassDescription(self, test):
		test_class = test.__class__
		doc = test_class.__doc__
		if self.descriptions and doc:
			return doc.strip().split("\n")[0].strip()
		return strclass(test_class)

	def getTestAndModuleName(self, test):
		description = str(test)
		test_name, test_module = description.split(" (")
		test_module = test_module.rstrip(")")
		return test_name, test_module

	def startTest(self, test):
		super(TextTestResult, self).startTest(test)
		if self.showAll:
			if self._test_class != test.__class__:
				self._test_class = test.__class__
				title = self.getClassDescription(test)
				self.stream.writeln(chalk.greenBright(title))

	def addSuccess(self, test):
		if self.showAll:
			success = chalk.green(" ✓")
			test_name, _ = self.getTestAndModuleName(test)
			self.stream.writeln(f"{success} {chalk.dim(test_name)}")
		elif self.dots:
			self.stream.write(".")
			self.stream.flush()

	def addError(self, test, err):
		self.errors.append((test, err))
		self._mirrorOutput = True

		if self.showAll:
			test_name, _ = self.getTestAndModuleName(test)
			self.stream.writeln(f"{chalk.red(' ✕')} {chalk.dim(test_name)}")

		elif self.dots:
			self.stream.write("E")
			self.stream.flush()

	def addFailure(self, test, err):
		self.failures.append((test, err))
		self._mirrorOutput = True

		if self.showAll:
			test_name, _ = self.getTestAndModuleName(test)
			self.stream.writeln(f"{chalk.red(' ✕')} {chalk.dim(test_name)}")

		elif self.dots:
			self.stream.write("F")
			self.stream.flush()

	def addSkip(self, test, reason):
		super(PrettyTextTestResult, self).addSkip(test, reason)
		if self.showAll:
			self.stream.writeln("skipped {0!r}".format(reason))
		elif self.dots:
			self.stream.write("s")
			self.stream.flush()

	def addExpectedFailure(self, test, err):
		super(PrettyTextTestResult, self).addExpectedFailure(test, err)
		if self.showAll:
			self.stream.writeln("expected failure")
		elif self.dots:
			self.stream.write("x")
			self.stream.flush()

	def addUnexpectedSuccess(self, test):
		super(PrettyTextTestResult, self).addUnexpectedSuccess(test)
		if self.showAll:
			self.stream.writeln("unexpected success")
		elif self.dots:
			self.stream.write("u")
			self.stream.flush()

	def printErrors(self):
		if self.dots or self.showAll:
			self.stream.writeln()
		self.printErrorList("ERROR", self.errors)
		self.printErrorList("FAIL", self.failures)

	def printErrorList(self, flavour, errors):
		for test, err in errors:
			self.printError(test, err, flavour)

	def printError(self, test, err, type):
		self.stream.writeln()
		status = chalk.bgRed.bold.white(f" {type} ")
		test_name, _ = self.getTestAndModuleName(test)
		self.stream.writeln(f"{status} {chalk.red.bold(test_name)}")
		self.stream.writeln()
		exctype, value, tb = err
		# Skip test runner traceback levels
		while tb and self._is_relevant_tb_level(tb):
			tb = tb.tb_next
		color_tb = ColorTB()
		colored_tb = "".join(color_tb.structured_traceback(exctype, value, tb))
		self.stream.writeln(colored_tb)
