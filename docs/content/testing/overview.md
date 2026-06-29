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

## Writing tests for commands

To test a bench command, write a test class that inherits from
`BaseTestCommands` in `frappe.commands.test_commands`. It already extends
`IntegrationTestCase`, so the runner picks it up like any other test.

Call `self.execute(command)` to run a command. The `{site}` placeholder is
filled in with the current test site. After it runs you can read `self.stdout`,
`self.stderr`, and `self.returncode`.

```python
from frappe.commands.test_commands import BaseTestCommands


class TestExecuteCommand(BaseTestCommands):
    def test_execute(self):
        # run a command and expect a numeric result
        self.execute("bench --site {site} execute frappe.db.get_database_size")
        self.assertEqual(self.returncode, 0)
        self.assertIsInstance(float(self.stdout), float)

        # an unknown attribute should fail
        self.execute("bench --site {site} execute frappe.lacol.site")
        self.assertEqual(self.returncode, 1)
        self.assertIsNotNone(self.stderr)
```

Pass values through the second argument and reference them as placeholders in
the command string. This avoids escaping problems with shell quoting:

```python
self.execute(
    "bench --site {site} execute frappe.bold --kwargs '{payload}'",
    {"payload": '{"text": "DocType"}'},
)
self.assertEqual(self.stdout, frappe.bold(text="DocType"))
```

To feed input to an interactive command, pass `cmd_input` as a byte string:

```python
self.execute(
    "bench make-app {apps_path} {app_name}",
    {"apps_path": apps_path, "app_name": "testapp0", "cmd_input": b"\n".join(user_input)},
)
```

## Running tests in parallel

As a suite grows, running it serially on one machine gets slow. `run-parallel-tests`
splits the test files across several build machines so continuous integration
finishes faster.

Pass the build number and the total number of builds. Each machine runs its
slice of the files:

```bash
# on the first machine
bench --site mysite run-parallel-tests --app myapp --build-number 1 --total-builds 2

# on the second machine
bench --site mysite run-parallel-tests --app myapp --build-number 2 --total-builds 2
```

The file list is split evenly by count, so an even split does not mean an even
run time. If some files take much longer than others, the machines finish at
different times.

To balance the load, use the [test orchestrator](https://github.com/frappe/test-orchestrator).
It hands the next test file to whichever machine is free, so slow files do not
hold up the whole run:

```bash
bench --site mysite run-parallel-tests --app myapp --use-orchestrator
```

The orchestrator mode reads two environment variables: `ORCHESTRATOR_URL`, the
public URL of your hosted orchestrator, and `CI_BUILD_ID`, the unique id for the
build run.

## UI tests

UI tests use Cypress and a separate command. See
[UI Testing](/testing/ui-testing).
