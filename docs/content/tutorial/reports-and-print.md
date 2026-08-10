---
title: Reports and Print
---

# Reports and Print

There are two ways to get data out of your app: a **report** to view and filter rows in a
table, and a **print format** to produce a printable document. You build one of
each, using the Library Transaction records you created earlier.

## A Query Report

A **Query Report** runs a single SQL query and shows the result as a table. It is
the quickest report to build because you write SQL and nothing else.

Create a new Report:

```text
http://library.localhost:8000/desk/report/new
```

Set:

- **Report Name**: `Articles Issued`
- **Report Type**: `Query Report`
- **Ref DocType**: `Library Transaction`

In the **Query** field, enter the SQL. The column labels use Frappe's
`Label:Fieldtype/Options:Width` syntax, which turns `article` into a clickable
link to the Article record:

```sql
SELECT
    article AS "Article:Link/Article:240",
    library_member AS "Member:Link/Library Member:240",
    type AS "Type:Data:100",
    date AS "Date:Date:120"
FROM `tabLibrary Transaction`
WHERE type = 'Issue'
ORDER BY date DESC
```

Save and open the report:

```text
http://library.localhost:8000/desk/query-report/Articles Issued
```

You see one row per issued transaction, with links you can click through. To let
the Librarian role run it, add `Librarian` under the report's **Roles** section.

Make sure you are logged in as `Administrator`: a report is only written to disk
when **Is Standard** is `Yes`, and that field is auto-set only when an
Administrator saves it with developer mode on. Check the report's **Is
Standard** field is `Yes` before continuing.

With developer mode on, the report is written to disk under your app:

```text
apps/library_management/library_management/library_management/report/articles_issued/
```

For more report types, including Script Reports written in Python, see
[Reports](/desk/reports).

## A Print Format

A **Print Format** controls how a single document looks when printed or saved as
PDF. You build a custom one for Library Member using Jinja and HTML.

Create a new Print Format:

```text
http://library.localhost:8000/desk/print-format/new
```

Set:

- **Name**: `Member Card`
- **DocType**: `Library Member`
- Tick **Custom Format**
- **Print Format Type**: `Jinja`

In the **HTML** field, write the template. `doc` is the document being printed, so
`doc.full_name` pulls the member's name:

```html
<div class="member-card">
  <h2>{{ doc.full_name }}</h2>
  <p><strong>Member ID:</strong> {{ doc.name }}</p>
  <p><strong>Email:</strong> {{ doc.email or "Not provided" }}</p>
  <p><strong>Phone:</strong> {{ doc.phone or "Not provided" }}</p>
  <p><strong>Joined:</strong> {{ frappe.utils.formatdate(doc.creation) }}</p>
</div>
```

The template is standard [Jinja](/server-side/jinja-ssr). `frappe.utils` helpers
like `formatdate` are available inside it. Use `or` to show a fallback when a
field is empty.

Save, then open any Library Member and click the Print icon (or go to
`/desk/print/library-member/<name>`), and pick **Member Card** from the format
dropdown. Use **PDF** to download it.

For the visual drag-and-drop builder and more on styling, see
[Print Formats](/desk/print-formats).

Continue to [What's Next](/tutorial/whats-next).
