---
title: Reports
---

# Reports

A report is a tabular view of data. Frappe has three kinds, all stored as records of the **Report** DocType, set by the `report_type` field:

- **Report Builder**: built visually, no code. Picks columns, filters, and sorting on a single DocType.
- **Query Report**: a single SQL query that returns the rows.
- **Script Report**: a Python function that returns columns and data, for anything the other two cannot do.

There is also a **Custom Report**, which is a saved variation (different columns or filters) of an existing Query or Script Report.

Open any report from its list, or from the **Report** view of a DocType list.

## Report Builder

Report Builder needs no Report record to start. Open a DocType list and switch the view to **Report**. From there you add columns, set filters, sort, and group. Save the view as a named report and Frappe creates a Report record with `report_type` of `Report Builder`. The column and filter layout is stored in the report's `json` field, and the rows come straight from `frappe.get_list` on the reference DocType, so list-view permissions apply.

This is the right tool when you need a filtered, columnar view of one DocType and nothing more.

## Query Report

A Query Report runs one SQL query. Create a Report record, set **Report Type** to `Query Report`, pick the **Ref DocType** (used for permissions), and write the query in the **Query** field. Filters passed from the UI are available as named parameters:

```sql
SELECT
    name AS "Task:Link/Task:200",
    status AS "Status::120",
    exp_end_date AS "Due Date:Date:100"
FROM `tabTask`
WHERE status = %(status)s
ORDER BY exp_end_date
```

Column headers use the format `Label:Fieldtype/Options:Width`. So `name AS "Task:Link/Task:200"` makes a 200px column labelled "Task" that links to the Task DocType. Filter values are passed as a dict and bound with `%(fieldname)s` placeholders, which keeps the query safe from injection. Only `SELECT` queries are allowed, and the query runs in a read-only transaction.

## Script Report

A Script Report runs Python and returns the result. Use it when you need joins across documents, computed columns, or logic that SQL alone cannot express. Set **Report Type** to `Script Report`.

For a non-standard (database-only) report, write the body in the **Report Script** field. The script receives `filters` and sets `data` or `result`:

```python
columns = [
    {"label": "Task", "fieldname": "name", "fieldtype": "Link", "options": "Task", "width": 200},
    {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 120},
]
rows = frappe.get_all(
    "Task",
    filters={"status": filters.get("status")},
    fields=["name", "status"],
)
data = [columns, [list(r.values()) for r in rows]]
```

For a standard report (one that ships with an app), set **Is Standard** to `Yes` in `developer_mode`. Frappe then generates a module folder with a `.py` and `.js` file. The Python file defines an `execute(filters)` function that returns `columns, data`:

```python
import frappe

def execute(filters=None):
    columns = [
        {"label": "Task", "fieldname": "name", "fieldtype": "Link", "options": "Task", "width": 200},
        {"label": "Status", "fieldname": "status", "fieldtype": "Data", "width": 120},
    ]
    data = frappe.get_all("Task", filters=filters, fields=["name", "status"])
    return columns, data
```

Each column is a dict. `fieldname` and `label` are the basics; `fieldtype` and `options` control how the value renders, and `width` sets the column width in pixels:

```python
columns = [
    {"label": "Account", "fieldname": "account", "fieldtype": "Link", "options": "Account", "width": 200},
    {"label": "Balance", "fieldname": "balance", "fieldtype": "Currency", "options": "currency"},
]
```

If a label has no `fieldname`, Frappe derives one with `frappe.scrub(label)`. Rows in `data` can be a list of dicts keyed by `fieldname`, or a list of lists in column order.

### Optional return values

`execute` can return more than `columns, data`. The extra values are positional and must follow this order:

```python
return columns, data, message, chart, report_summary, skip_total_row
```

You only need to return as far as the values you set. The trailing values are:

- `message`: HTML shown above the table.
- `chart`: a chart config rendered above the report.
- `report_summary`: a list of dicts shown as summary cards at the top.
- `skip_total_row`: set truthy to suppress the auto total row when **Add Total Row** is on.

A `report_summary` entry looks like this:

```python
report_summary = [
    {
        "label": "Total Profit",
        "value": profit,
        "datatype": "Currency",
        "currency": "INR",
        "indicator": "Green" if profit > 0 else "Red",
    }
]
```

`indicator` accepts Green, Red, or Blue. Any other value renders in the default text color.

### Filter fields

The matching `.js` file defines `frappe.query_reports["Report Name"]` with the filter fields the user sees:

```javascript
frappe.query_reports["My Tasks"] = {
  filters: [
    {
      fieldname: "status",
      label: "Status",
      fieldtype: "Select",
      options: ["", "Open", "Working", "Completed"],
    },
    {
      fieldname: "company",
      label: "Company",
      fieldtype: "Link",
      options: "Company",
      default: frappe.defaults.get_user_default("company"),
      depends_on: 'eval:doc.status=="Completed"',
    },
  ],
};
```

Filter values arrive in `execute` as the `filters` dict, keyed by `fieldname`. Use `depends_on` with an `eval:` expression to show a filter only when another filter has a given value.

## Filters

Query and Script Reports show filters defined in the report's **Filters** table (or in the `.js` file for standard reports). Each filter becomes a control at the top of the report, and its value is passed into the query or script as part of `filters`.

## Prepared reports

Reports that take a while to run can use **Prepared Report**. Instead of blocking the UI, the report runs as a background job and the result is stored for later viewing. Frappe can switch a slow Script Report to prepared mode automatically after it crosses a time threshold, unless you disable that with **Disable Prepared Report Automation**.

## Permissions

A report respects two checks: the **Roles** table on the Report record (who may open this report) and the `report` permission on the **Ref DocType** (who may pull report data for that DocType). If the Roles table is empty, anyone with report access to the reference DocType can run it.

Writing or editing a non-standard Query Report or Script Report also requires the **Script Manager** role. Report Builder and Custom Reports are exempt, since they hold no code.

## Standard reports and exporting

When `developer_mode` is on, setting **Is Standard** to `Yes` exports the Report record to its module folder so it ships with your app. Only the Administrator can save a standard report. Reports can be exported to Excel and CSV from the report toolbar, and given a default [Print Format](/desk/print-formats) and Letter Head.
