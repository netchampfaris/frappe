---
title: Common Utilities
---

# Common Utilities

These are the small helpers you reach for in almost every form script: translating strings, formatting values for display, working with dates, and a grab bag of functions under `frappe.utils`.

## Translations

Wrap every user-facing string in `__()` so it can be translated. It looks up the translation for the current language and returns the original text when none exists.

```javascript
frappe.msgprint(__("Task saved"));
```

Pass an array as the second argument to fill in placeholders. Placeholders are `{0}`, `{1}`, and so on, in order.

```javascript
__("Hello {0}, you have {1} tasks", [user, count]);
```

Pass a context as the third argument when the same English word needs different translations in different places.

```javascript
__("Open", null, "Status of a task");
```

Always pass a plain string literal to `__()`, not a built-up variable, so the string can be picked up when translations are collected.

## Formatting values

`frappe.format(value, df, options, doc)` turns a raw value into its display form based on a docfield. The `df` needs at least a `fieldtype`; the formatter follows the user's number, currency, and date settings.

```javascript
frappe.format(1234.5, { fieldtype: "Currency", options: "USD" });
// "$ 1,234.50"

frappe.format("2026-06-27", { fieldtype: "Date" });
// formatted in the user's date format
```

On a form, `frm.get_formatted(fieldname)` gives the formatted value of a field straight from the current document.

For numbers specifically, `format_number(value, format, decimals)` and `format_currency(value, currency, decimals)` are global helpers.

```javascript
format_number(1234.567, null, 2);   // "1,234.57"
format_currency(1234.5, "USD");     // "$ 1,234.50"
```

`flt(value, decimals)` parses anything into a float (returning 0 for junk), and `cint(value)` parses into an integer. Both are global. Use them before doing math on field values, which may arrive as strings.

```javascript
let total = flt(frm.doc.qty) * flt(frm.doc.rate);
let count = cint(frm.doc.items_count);
```

## Dates and times

`frappe.datetime` handles dates in the system format (`YYYY-MM-DD` and `YYYY-MM-DD HH:mm:ss`). Use these strings when reading and writing field values.

```javascript
frappe.datetime.now_date(); // "2026-06-27"
frappe.datetime.now_datetime(); // "2026-06-27 14:30:00"
frappe.datetime.nowdate(); // same as now_date()
frappe.datetime.get_today(); // same as now_date()
```

Arithmetic and comparison helpers:

```javascript
frappe.datetime.add_days("2026-06-27", 7); // 7 days later
frappe.datetime.add_months("2026-06-27", 1); // 1 month later
frappe.datetime.get_day_diff("2026-06-30", "2026-06-27"); // 3
frappe.datetime.month_start(); // first day of this month
frappe.datetime.month_end();
```

Convert between the system format and the user's display format:

```javascript
frappe.datetime.str_to_user("2026-06-27 14:30:00"); // user date and time format
frappe.datetime.user_to_str("27-06-2026"); // back to system format
```

`comment_when(datetime)` returns a relative phrase like "2 hours ago", used in timelines.

```javascript
comment_when("2026-06-27 12:00:00"); // "2 hours ago"
```

## frappe.utils

`frappe.utils` holds general helpers. The ones you will use most:

```javascript
// build a route link to a record
frappe.utils.get_form_link("Task", "TASK-0001");
// "/desk/task/TASK-0001"

// escape user text before putting it in HTML
frappe.utils.escape_html(user_input);

// copy text to the clipboard
frappe.utils.copy_to_clipboard("hello");

// title case a string
frappe.utils.to_title_case("open task"); // "Open Task"

// check if a string contains HTML
frappe.utils.is_html(value);
```

`frappe.run_serially(tasks)` runs an array of functions one after another, waiting for each promise to resolve before the next. It is handy when several server calls must happen in order.

```javascript
frappe.run_serially([
  () => frappe.db.set_value("Task", "T1", "status", "Completed"),
  () => frappe.db.set_value("Task", "T2", "status", "Completed"),
]);
```
