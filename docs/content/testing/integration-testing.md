---
title: Integration Testing
---

# Integration Testing

`IntegrationTestCase` is the class you will use most. It extends `UnitTestCase`
and adds everything you need to test code against a real site: a database
connection, automatic loading of test records, and a rollback after each test so
nothing leaks between tests.

```python
import frappe
from frappe.tests import IntegrationTestCase


class TestNote(IntegrationTestCase):
    def test_create_and_read(self):
        note = frappe.get_doc(doctype="Note", title="Meeting").insert()
        fetched = frappe.get_doc("Note", note.name)
        self.assertEqual(fetched.title, "Meeting")
```

You do not need to delete the Note afterwards. The class rolls back the database
after every test, so each test starts from the same state.

## setUpClass and tearDown

The class does its work in `setUpClass`: it connects to the site, loads the test
records your DocType depends on, and registers a rollback to run when the class
finishes. If you override `setUpClass`, `setUp`, or `tearDown`, call `super()` so
that this still runs.

```python
class TestInvoice(IntegrationTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.customer = frappe.get_doc(doctype="Customer", customer_name="ACME").insert()
```

## Test records

When a test class for a DocType runs, Frappe automatically creates the records
that DocType links to, then the records they link to, and so on. This means you
can assume linked masters already exist.

Define records in a `test_records.toml` file next to the DocType:

```toml
[[Note]]
name = "_Test Note 1"
title = "Test Note Title"
```

The older format is a `test_records.json` file in the same folder:

```json
[
  {
    "doctype": "Note",
    "name": "_Test Note 1",
    "title": "Test Note Title"
  }
]
```

By convention test record names start with `_Test` so they are easy to spot and
do not collide with real data. If a record sets `"docstatus": 1`, it is submitted
after insert.

Inside a test, the loaded records are available as `self.globalTestRecords`, a
read-only mapping keyed by DocType.

### Controlling dependencies

If the automatic dependency discovery misses a DocType, or pulls in one you do
not want, add module-level overrides in your `test_*.py` file:

```python
EXTRA_TEST_RECORD_DEPENDENCIES = ["Currency"]
IGNORE_TEST_RECORD_DEPENDENCIES = ["Company"]
```

For full control, define `_make_test_records()` in the test module to generate
records yourself, or call `frappe.tests.utils` helpers like `make_test_records`.

## Fixtures inside a test

Create whatever extra data a test needs with normal `frappe` calls in `setUp` or
in the test body. The rollback cleans it up. For temporary changes to a Settings
DocType, use the `change_settings` context manager, which restores the old values
afterwards:

```python
class TestSystem(IntegrationTestCase):
    def test_with_setting(self):
        with self.change_settings("System Settings", {"disable_user_pass_login": 1}):
            self.assertTrue(login_is_disabled())
```

`change_settings` also works as a decorator:

```python
from frappe.tests.utils import change_settings


class TestSystem(IntegrationTestCase):
    @change_settings("System Settings", disable_user_pass_login=1)
    def test_with_setting(self):
        self.assertTrue(login_is_disabled())
```

Other context managers that need a connection: `switch_site(site)` switches to a
different site for the block, and the inherited `set_user`, `freeze_time`, and
`patch_hooks` are available too.

## Assertions for the database layer

`IntegrationTestCase` adds context managers that assert how your code talks to
the database and cache. They are handy for catching performance regressions in a
test.

- `assertQueryCount(n)` fails if more than `n` SQL queries run in the block.
- `assertRowsRead(n)` fails if more than `n` rows are read.
- `assertRedisCallCounts(n)` fails if more than `n` Redis commands run (pass
  `exact=True` to require exactly `n`).

```python
def test_list_is_efficient(self):
    with self.assertQueryCount(5):
        get_dashboard_data()
```

All the assertions and helpers from `UnitTestCase` are still available here,
including `assertDocumentEqual`.

## Two connections

To simulate two users or two transactions at once, switch between the primary and
a secondary database connection with the `primary_connection()` and
`secondary_connection()` context managers. This is useful for testing document
locks and concurrent writes.

## The deprecated FrappeTestCase

You may see older code that uses `FrappeTestCase`:

```python
from frappe.tests.utils import FrappeTestCase
```

It still runs but is deprecated. It behaves like `IntegrationTestCase`. Use
`IntegrationTestCase` for new tests, and migrate old ones when you touch them.
