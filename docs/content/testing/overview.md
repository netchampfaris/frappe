---
title: Overview
---

# Overview

Frappe ships a test framework built on Python's `unittest`. You write test
classes that inherit from one of two base classes, put them in files named
`test_*.py`, and run them with `bench run-tests`. The framework handles the test
site, database rollback between tests, and loading the records your tests depend
on.

A minimal test looks like this:

```python
import frappe
from frappe.tests import IntegrationTestCase


class TestNote(IntegrationTestCase):
    def test_create_note(self):
        note = frappe.get_doc(doctype="Note", title="Hello").insert()
        self.assertEqual(note.title, "Hello")
```

## Where tests live

- Tests for a DocType sit next to the DocType controller, named after it. For a
  DocType named "Note" the file is `note/test_note.py`.
- Tests that are not tied to a DocType go in your app's `tests/` folder in files
  named `test_*.py`.

The runner discovers any `test_*.py` file and runs every method whose name
starts with `test_`.

## The two base classes

Import both from `frappe.tests`:

```python
from frappe.tests import UnitTestCase, IntegrationTestCase
```

- `UnitTestCase` is for testing a function or component in isolation. It does not
  set up a database connection or load test records, so it is fast. Use it when
  your code does not touch the database.
- `IntegrationTestCase` extends `UnitTestCase` and adds a database connection,
  automatic loading of test records, and a rollback after each test so changes
  never leak between tests. Use it for anything that reads or writes documents.

There is also an older `FrappeTestCase` (importable from `frappe.tests.utils`).
It still works but is deprecated. New tests should use `IntegrationTestCase`. See
[Unit Testing](/testing/unit-testing) and
[Integration Testing](/testing/integration-testing) for details on each.

## Enabling tests on a site

Tests only run on a site that has `allow_tests` set. Turn it on once:

```bash
bench --site mysite set-config allow_tests true
```

Without this you get a message telling you to enable it. The `CI` environment
variable also enables tests on continuous integration.

## Running tests

Run everything for an app:

```bash
bench --site mysite run-tests --app myapp
```

Narrow it down while you work:

```bash
# tests for a single DocType
bench --site mysite run-tests --doctype "Note"

# a single module (dotted Python path)
bench --site mysite run-tests --module "myapp.myapp.doctype.note.test_note"

# a single test case class
bench --site mysite run-tests --module "myapp.myapp.doctype.note.test_note" --case TestNote

# a single test method
bench --site mysite run-tests --module "myapp.myapp.doctype.note.test_note" --test test_create_note
```

Other options you will reach for:

- `--test-category unit` or `--test-category integration` runs only one kind of
  test (`all` is the default).
- `--failfast` stops on the first failure instead of running the whole suite.
- `--verbose` is a global bench flag, placed before `run-tests`, that prints each
  test name as it runs.
- `--profile` collects a cProfile report. See
  [Profiling and Monitoring](/testing/profiling-monitoring).
- `--debug` drops you into `pdb` on an exception or breakpoint. See
  [Debugging](/testing/debugging).
- `--coverage` measures code coverage for the app.
- `--junit-xml-output <path>` writes a JUnit XML report for CI.

```bash
bench --site mysite --verbose run-tests --app myapp --failfast
```

For continuous integration, `bench run-parallel-tests` splits the suite across
several build machines.

UI tests use Cypress and a separate command. See
[UI Testing](/testing/ui-testing).
