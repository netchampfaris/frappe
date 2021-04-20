# Copyright (c) 2021, Frappe Technologies Pvt. Ltd. and Contributors
# MIT License. See license.txt

from __future__ import unicode_literals
import frappe
from unittest import TextTestResult
from simple_chalk import chalk
from IPython.core.ultratb import ColorTB



class PrettyTextTestResult(TextTestResult):
	separator1 = "=" * 70
	separator2 = "-" * 70

	def __init__(self, stream, descriptions, verbosity):
		super(PrettyTextTestResult, self).__init__(stream, descriptions, 2)

	def getDescription(self, test):
		description = str(test)
		test_name, test_module = description.split(' (')
		test_module = test_module.rstrip(')')
		description = f"{chalk.white(test_name)} {chalk.gray(test_module)}"
		return description

	def startTest(self, test):
		super(TextTestResult, self).startTest(test)

	def addSuccess(self, test):
		if self.showAll:
			success = chalk.bgGreen.bold.white(' PASS ')
			description = self.getDescription(test)
			self.stream.writeln(f"{success} {description}")
		elif self.dots:
			self.stream.write(".")
			self.stream.flush()

	def addError(self, test, err):
		super(TextTestResult, self).addError(test, err)
		# self.exceptions.append((test, err))
		if self.showAll:
			status = chalk.bgRed.bold.white(' ERROR ')
			description = self.getDescription(test)
			self.stream.writeln(f"{status} {description}")

			exctype, value, tb = err
			# Skip test runner traceback levels
			while tb and self._is_relevant_tb_level(tb):
				tb = tb.tb_next
			color_tb = ColorTB()
			colored_tb = ''.join(color_tb.structured_traceback(exctype, value, tb))
			self.stream.writeln(colored_tb)

		elif self.dots:
			self.stream.write("E")
			self.stream.flush()

	def addFailure(self, test, err):
		super(PrettyTextTestResult, self).addFailure(test, err)
		if self.showAll:
			self.stream.writeln("FAIL")
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
			self.stream.writeln(self.separator1)
			self.stream.writeln("%s: %s" % (flavour, self.getDescription(test)))
			self.stream.writeln(self.separator2)
			self.stream.writeln("%s" % err)
