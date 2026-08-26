---
title: Create the DocType
tableFirstCol: 10rem
pageClass: create-doctype-tables
---

# Create the DocType

You build the **Article** DocType in the Desk UI. With developer mode on, Frappe
writes the definition to disk as files in your app, so the schema is tracked in
version control. A DocType gives you the database table, the form, the list view,
and a Python controller all at once. See the
[DocTypes Overview](/doctypes/overview) for the bigger picture.

## Open the DocType builder

Go to the DocType list using the search bar (awesomebar) and click **+ Add DocType**:

```text
http://library.localhost:8000/desk/doctype/new
```

Fill in the top section:

- **Name**: `Article`
- **Module**: `Library Management`
- **Is Submittable**: leave unchecked

## Add fields

Use the DocType form builder to create the below fields. For each row set the **Type**, the
**Label**, and (where shown) the **Options**. The **Name** column (the
`fieldname`) is generated from the label, so `Article Name` becomes
`article_name`.

| Label        | Type         | Options / Notes                                                               |
| ------------ | ------------ | ----------------------------------------------------------------------------- |
| Article Name | Data         | Tick **Mandatory**                                                            |
| Image        | Attach Image |                                                                               |
| Author       | Data         |                                                                               |
| Description  | Text Editor  |                                                                               |
| ISBN         | Data         |                                                                               |
| Publisher    | Data         |                                                                               |
| Status       | Select       | Options (one per line): `Available`, `Issued`. Set **Default** to `Available` |

In the **Select** field's **Options**, put each choice on its own line:

```text
Available
Issued
```

You can also create/edit these fields using the table in the **Fields** section.

> This is the meta-data driven approach which differentiates Frappe Framework from traditional web development setups like Django. 

## Set the title field and naming

Open the **Settings** section (or the **Naming** section) of the DocType form:

- **Title Field**: `article_name`. This controls what shows as the document
  title in the form and lists.
- **Naming Rule**: choose **By fieldname** and set the field to `article_name`.
  The `name` (primary key) of each Article becomes its title. With this rule two
  articles cannot share the same name, which is fine for now.

See [Naming](/doctypes/naming) for the other naming rules.

## Save

Click **Save**. Frappe creates the `tabArticle` table and because developer mode is on, writes the DocType files to your app.

## The generated files

The new files live under the module folder of your app:

```text
apps/library_management/library_management/library_management/doctype/article/
├── __init__.py
├── article.json        # the schema: fields, naming, permissions
├── article.py          # the controller (Document subclass)
├── article.js          # the client script (form behaviour)
└── test_article.py     # a starter test
```

`article.json` is the source of truth for the schema. The relevant part looks
like this (trimmed):

```json
{
  "doctype": "DocType",
  "name": "Article",
  "module": "Library Management",
  "title_field": "article_name",
  "autoname": "field:article_name",
  "fields": [
    {
      "fieldname": "article_name",
      "label": "Article Name",
      "fieldtype": "Data",
      "reqd": 1
    },
    { "fieldname": "author", "label": "Author", "fieldtype": "Data" },
    { "fieldname": "isbn", "label": "ISBN", "fieldtype": "Data" },
    {
      "fieldname": "status",
      "label": "Status",
      "fieldtype": "Select",
      "options": "Available\nIssued",
      "default": "Available"
    }
  ]
}
```

The generated `article.py` is a near-empty controller. You add logic to it on the
[next page](/tutorial/controllers-and-business-logic):

```python
# Copyright (c) 2024, Your Company and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class Article(Document):
	pass
```

## Create a record

Go to the Article list and add one so you have data to work with:

```text
http://library.localhost:8000/desk/article/new
```

Enter an **Article Name** like `The Pragmatic Programmer`, an author, and save.

## Create the other two DocTypes

You need two more DocTypes for the later pages. Create them the same way.

**Library Member** with fields:

| Label     | Type | Options / Notes                   |
| --------- | ---- | --------------------------------- |
| Full Name | Data | Mandatory, set as **Title Field** |
| Email     | Data |                                   |
| Phone     | Data |                                   |

Set its **Naming Rule** to **By fieldname** on `full_name`.

**Library Transaction** with fields:

| Label          | Type   | Options / Notes                       |
| -------------- | ------ | ------------------------------------- |
| Article        | Link   | Options: `Article`. Mandatory         |
| Library Member | Link   | Options: `Library Member`. Mandatory  |
| Type           | Select | Options: `Issue`, `Return`. Mandatory |
| Date           | Date   |                                       |

A **Link** field stores the `name` of a record in another DocType and renders as
a searchable dropdown. Set Library Transaction's **Naming Rule** to
**Autoincrement** so each transaction gets a numeric `name`.

Add a couple of Library Transaction records with type `Issue` so the report on a
later page has something to show.

Continue to
[Controllers and Business Logic](/tutorial/controllers-and-business-logic).
