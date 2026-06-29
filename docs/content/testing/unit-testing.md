---
title: Unit Testing
---

# Unit Testing

Use `UnitTestCase` to test a function or a piece of logic in isolation. It does
not open a database connection and does not load test records, so it runs fast.
Reach for it when the code under test does not read or write documents.

```python
from frappe.tests import UnitTestCase
from frappe.utils import cint


class TestCint(UnitTestCase):
    def test_cint_parses_strings(self):
        self.assertEqual(cint("42"), 42)
        self.assertEqual(cint("not a number"), 0)
        self.assertEqual(cint(None), 0)
```

`UnitTestCase` extends `unittest.TestCase`, so every standard assertion is
available: `assertEqual`, `assertTrue`, `assertRaises`, `assertIn`, and the rest.

## setUpClass and setUp

`UnitTestCase` runs some setup of its own in `setUpClass` (it sets the current
user to Administrator and figures out the DocType from the module path). If you
override `setUpClass` or `setUp`, call `super()` so that setup still happens.

```python
class TestThing(UnitTestCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.sample = build_sample()
```

## Frappe-specific assertions

On top of the standard ones, `UnitTestCase` adds a few helpers.

- `assertDocumentEqual(expected, actual)` compares a document against an expected
  dict or document. It compares field by field, rounds floats to the field's
  precision, and treats child tables correctly.
- `assertQueryEqual(first, second)` compares two SQL strings after normalizing
  whitespace and keyword case, so formatting differences do not fail the test.
- `assertSequenceSubset(larger, smaller)` checks that every item in `smaller` is
  present in `larger`.

```python
def test_query_builder_output(self):
    query = build_my_query()
    self.assertQueryEqual(query, "select name from `tabNote`")
```

There are also two static normalizers you can call directly:
`UnitTestCase.normalize_html(code)` and `UnitTestCase.normalize_sql(query)`.

## Context managers

`UnitTestCase` carries context managers that do not need a site connection. Use
them as `with` blocks or as decorators on a test method.

- `freeze_time(when)` freezes the clock with freezegun.
- `set_user(user)` switches the session user for the block, then restores it.
- `patch_hooks({...})` overrides app hooks temporarily.
- `enable_safe_exec()` turns on server-script execution for the block.
- `trace_fields(...)` watches a DocType field for forbidden values.

```python
class TestSchedule(UnitTestCase):
    def test_due_date(self):
        with self.freeze_time("2024-01-01"):
            self.assertEqual(compute_due_date(), "2024-01-08")

        with self.set_user("test@example.com"):
            self.assertEqual(frappe.session.user, "test@example.com")
```

## When you actually need the database

If your code reads or writes documents, runs queries, or relies on test records,
use `IntegrationTestCase` instead. See
[Integration Testing](/testing/integration-testing).
