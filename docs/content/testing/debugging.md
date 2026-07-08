---
title: Debugging
---

# Debugging

When a test fails or code misbehaves, start with the cheapest tool and move up.
This page covers print and logging, the Error Log, the interactive debugger, and
the test flags that help.

## print and logging

A plain `print()` works, but by default the test runner buffers stdout and only
shows it for failing tests. Run with `--debug` to disable the buffer and see
output as it happens (more on that flag below).

For longer-lived output, use a logger. `frappe.logger()` returns a named logger
that writes to files under the bench's `logs/` folder.

```python
import frappe

logger = frappe.logger("myapp.sync")
logger.info("starting sync for %s", doc.name)
logger.debug("payload: %s", payload)
```

## frappe.log_error

To record an error with its full traceback into the Error Log DocType, call
`frappe.log_error`. This is the right tool for failures inside background jobs,
scheduled tasks, and request handlers, where there is no console to watch.

```python
try:
    risky_operation()
except Exception:
    frappe.log_error(title="Sync failed", reference_doctype="Note", reference_name=doc.name)
```

Called with no arguments inside an `except` block, it captures the current
traceback automatically. View the entries in Desk under the Error Log list, or
query the `Error Log` DocType. The title should be a single short line; pass
longer detail as the `message`.

## pdb

For stepping through code, set a breakpoint and run the test with the runner's
debug mode so the debugger can attach:

```python
def test_thing(self):
    result = build_result()
    breakpoint()  # execution stops here
    self.assertEqual(result, expected)
```

```bash
bench --site mysite run-tests --module "myapp.myapp.doctype.note.test_note" --debug
```

`--debug` does two things: it turns off output buffering, and it attaches `pdb`
on a breakpoint or an unhandled exception. Without it, `breakpoint()` does not
behave well because the runner captures stdin and stdout.

## debug_on

To stop in the debugger only when an assertion (or another exception) fails, wrap
the code with the `debug_on` context manager. It prints the traceback and then
drops you into a post-mortem `pdb` session at the point of failure.

```python
from frappe.tests import debug_on


class TestThing(UnitTestCase):
    @debug_on()
    def test_thing(self):
        self.assertEqual(compute(), 42)
```

By default it triggers on `AssertionError`. Pass other exception types to catch
them too, for example `@debug_on(ValueError)`.

`UnitTestCase` also exposes it as `self.debug_on()`, so you can use it as a
context manager inside a test without importing anything:

```python
def test_thing(self):
    with self.debug_on():
        self.assertEqual(compute(), 42)
```

## Verbose output

The global `--verbose` flag prints each test as it runs, so you can see exactly
which test hangs or fails:

```bash
bench --site mysite --verbose run-tests --app myapp
```

Combine it with `--failfast` to stop at the first failure and keep the output
short.
