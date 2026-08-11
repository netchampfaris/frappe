---
title: Utilities
---

# Utilities

`frappe.utils` is a grab bag of small helper functions for dates, numbers, strings, and URLs. They handle the messy edge cases (a `None` here, a string that should be a number there) so your code stays short. The most common ones are also exported on `frappe` directly.

```python
from frappe.utils import nowdate, add_days, flt, fmt_money

due = add_days(nowdate(), 14)
total = flt("1,250.50")                     # -> 1250.5
label = fmt_money(total, currency="USD")    # -> "$ 1,250.50"
```

## Dates and times

Frappe stores dates as strings in `yyyy-mm-dd` format and datetimes as `yyyy-mm-dd hh:mm:ss`. These helpers produce and manipulate them.

```python
from frappe.utils import now, nowdate, getdate, add_days, add_months, date_diff

now()        # "2024-05-01 14:30:00"  current datetime as a string
nowdate()    # "2024-05-01"           today's date as a string
```

`getdate` parses a date string (or a date/datetime object) into a Python `date`. Use it whenever you need to do date math on a value that came in as a string.

```python
getdate("2024-05-01")          # datetime.date(2024, 5, 1)
getdate()                      # today's date object
```

`add_days` and `add_months` return a new date offset from the given one. They accept strings or date objects.

```python
add_days("2024-05-01", 14)     # date 14 days later
add_days(nowdate(), -7)        # a week ago
add_months("2024-05-01", 1)    # one month later
```

`date_diff` returns the number of days between two dates (first minus second).

```python
date_diff("2024-05-15", "2024-05-01")   # 14
```

## Numbers

`flt` ("float") converts anything to a float, returning `0.0` if it cannot. It also strips commas, which is handy for user input, and can round to a precision.

```python
from frappe.utils import flt

flt("1,250.50")        # 1250.5
flt(None)              # 0.0
flt("abc")             # 0.0
flt("42.567", 2)       # 42.57   (rounded to 2 places)
```

`cint` ("int") does the same for integers, returning `0` on failure.

```python
from frappe.utils import cint

cint("100")            # 100
cint(None)             # 0
cint("3.9")            # 3
```

Reach for `flt` and `cint` instead of `float()` and `int()` whenever a value might be `None`, empty, or a formatted string. They will not raise.

## Strings

`cstr` converts any value to a string, turning `None` into an empty string instead of the text `"None"`.

```python
from frappe.utils import cstr

cstr(None)             # ""
cstr(42)               # "42"
```

## Formatting money

`fmt_money` formats a number with thousands separators and a currency symbol, using the site's number format settings.

```python
from frappe.utils import fmt_money

fmt_money(1250.5, currency="USD")     # "$ 1,250.50"
fmt_money(1250.5, precision=0)        # "1,251"
```

For display in templates, prefer this over building the string yourself, so it respects the user's locale and currency settings.

## URLs

`get_url` builds an absolute URL for the current site. Pass a path to get a full link to it; call it with no arguments for the site's base URL.

```python
from frappe.utils import get_url

get_url()                          # "https://mysite.example.com"
get_url("/app/library-loan")       # full link to a Desk page
```

A related helper, `get_link_to_form`, returns an HTML anchor pointing at a document's form, useful in emails and messages.

```python
from frappe.utils import get_link_to_form

get_link_to_form("Library Loan", "LOAN-0001")
# <a href="...">LOAN-0001</a>
```

## More common helpers

`format_date` renders a date string in the user's date format, instead of the stored `yyyy-mm-dd`.

```python
from frappe.utils import format_date

format_date("2024-05-01")                   # "05-01-2024" (depends on user format)
format_date("2024-05-01", "dd MMM yyyy")    # "01 May 2024"
```

`pretty_date` turns a datetime into a relative string like "2 days ago", handy for activity feeds.

```python
from frappe.utils import pretty_date

pretty_date("2024-05-01 10:00:00")     # "2 days ago"
```

`comma_and` and `comma_or` join a list into a readable phrase.

```python
from frappe.utils import comma_and, comma_or

comma_and(["a", "b", "c"])             # "'a', 'b' and 'c'"
comma_or(["a", "b", "c"])              # "'a', 'b' or 'c'"
```

`strip_html` removes HTML tags from a string, useful when turning rich text into plain text.

```python
from frappe.utils import strip_html

strip_html("<h1>Hello</h1>")           # "Hello"
```

`validate_email_address` returns the valid addresses from a string. Pass `throw=True` to raise on an invalid one.

```python
from frappe.utils import validate_email_address

validate_email_address("john@example.com, bad")    # "john@example.com"
validate_email_address("bad", throw=True)          # raises InvalidEmailAddressError
```

`random_string` returns a random alphanumeric string of the given length, for tokens and test data.

```python
from frappe.utils import random_string

random_string(10)                      # e.g. "a8Kf2Lm9Qz"
```

## Finding more

These are some of the helpers you will reach for often, but there are many more in `frappe/utils/__init__.py` and `frappe/utils/data.py`: `get_datetime`, `now_datetime`, `add_to_date`, `get_fullname`, and so on. When you need a small transformation, check there before writing your own; it probably exists and already handles the edge cases.

For the full list, browse the source on GitHub:

- [`frappe/utils/data.py`](https://github.com/frappe/frappe/blob/develop/frappe/utils/data.py)
- [`frappe/utils/__init__.py`](https://github.com/frappe/frappe/blob/develop/frappe/utils/__init__.py)

## See also

- [Jinja SSR](/server-side/jinja-ssr): these helpers are available inside templates as `frappe.utils.*`.
