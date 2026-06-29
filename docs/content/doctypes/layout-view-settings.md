---
title: Layout View Settings
tableFirstCol: 18rem
---

# Layout View Settings

A DocType controls two things about how its data looks: the **form layout** (how fields are arranged on the document page) and the **view settings** (how records appear in the list, report and other views). Both are configured with field properties and a few DocType-level settings, so you set them once and every client gets the same layout.

## Form layout

Fields render top to bottom in the order they appear in the DocType. You shape that flow with three layout field types. They store no data; they only group the fields that follow them.

| Fieldtype       | What it does                                                                        |
| --------------- | ----------------------------------------------------------------------------------- |
| `Section Break` | Starts a new section (a horizontal block). Its `label` becomes the section heading. |
| `Column Break`  | Splits the current section into columns. Fields after it move to the next column.   |
| `Tab Break`     | Starts a new tab at the top of the form. Fields after it live under that tab.       |

A typical layout in JSON looks like this:

```json
[
  { "fieldname": "details_tab", "fieldtype": "Tab Break", "label": "Details" },
  { "fieldname": "customer", "fieldtype": "Link", "options": "Customer" },
  { "fieldname": "column_break_1", "fieldtype": "Column Break" },
  { "fieldname": "posting_date", "fieldtype": "Date" },
  {
    "fieldname": "items_section",
    "fieldtype": "Section Break",
    "label": "Items"
  },
  {
    "fieldname": "items",
    "fieldtype": "Table",
    "options": "Sales Invoice Item"
  }
]
```

That gives you a "Details" tab with two columns (customer on the left, date on the right) and an "Items" section below holding a child table.

### Collapsible sections

A `Section Break` can start collapsed. Turn on `collapsible` on the section break. To collapse it conditionally, set `collapsible_depends_on` to an `eval:` expression:

```json
{
  "fieldname": "more_info",
  "fieldtype": "Section Break",
  "label": "More Info",
  "collapsible": 1,
  "collapsible_depends_on": "eval:doc.status == \"Draft\""
}
```

## Field visibility

These properties live on each field and decide whether and when it shows up.

| Property               | Effect                                                                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `hidden`               | Hides the field in the form. The value is still stored and submitted.                                                                                   |
| `depends_on`           | Show the field only when an `eval:` expression is true, for example `eval:doc.has_discount`.                                                            |
| `read_only`            | Render the field but block edits.                                                                                                                       |
| `read_only_depends_on` | Make the field read-only when the `eval:` expression is true.                                                                                           |
| `mandatory_depends_on` | Make the field required when the `eval:` expression is true.                                                                                            |
| `permlevel`            | Field permission level. Fields above level 0 are only visible to roles granted read access at that level. See [Customization](/doctypes/customization). |

`depends_on` expressions run on the client. They start with `eval:` and have access to `doc` (the current document):

```json
{
  "fieldname": "discount_amount",
  "fieldtype": "Currency",
  "depends_on": "eval:doc.apply_discount == 1"
}
```

## List view settings

The list view shows records in a table. You pick which columns appear and which filters are offered using field properties.

| Property             | Effect                                                                                                    |
| -------------------- | --------------------------------------------------------------------------------------------------------- |
| `in_list_view`       | Show this field as a column in the list view. For child tables this becomes "In Grid View".               |
| `columns`            | Column width in the list view, counted in grid units. Total across fields should stay under 11.           |
| `in_standard_filter` | Add this field to the filter bar at the top of the list.                                                  |
| `in_global_search`   | Include this field's value in global search. Not allowed for fields with no value, such as layout breaks. |
| `in_preview`         | Show this field in the hover preview popup.                                                               |
| `in_filter`          | Index the field so it can be used as a filter (older setting).                                            |

Frappe validates these when you save the DocType. `in_list_view` is rejected for field types that cannot render in a list (such as text editors and layout breaks), and `in_global_search` is rejected for fields that hold no value.

```json
{
  "fieldname": "status",
  "fieldtype": "Select",
  "options": "Draft\nSubmitted\nCancelled",
  "in_list_view": 1,
  "in_standard_filter": 1,
  "columns": 2
}
```

## DocType-level view settings

A few settings on the DocType itself control how records are presented across views.

| Setting                          | Effect                                                                                                     |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `title_field`                    | Field shown as the record's title instead of `name`.                                                       |
| `show_title_field_in_link`       | Show the title field (not the id) when this DocType is referenced in a Link field. Requires `title_field`. |
| `image_field`                    | Attach Image field used as the record's image in card and image views.                                     |
| `search_fields`                  | Comma-separated fields searched in the link/search dropdown.                                               |
| `sort_field` and `sort_order`    | Default sort field and direction (`ASC` or `DESC`) for the list.                                           |
| `default_view`                   | The view the list opens in by default.                                                                     |
| `force_re_route_to_default_view` | Always send users to `default_view`, even if they navigate to another view.                                |
| `show_preview_popup`             | Show a preview popup on hover in lists and link fields.                                                    |

## Other views

The list page is one of several views Frappe builds from the same DocType. The columns, filters and sort settings above feed into them:

- **List**: the default table view driven by `in_list_view` and `in_standard_filter`.
- **Report**: a spreadsheet-style view where users add and reorder any column.
- **Kanban**: cards grouped by a Select field. Users create Kanban boards on top of a DocType; the board picks the grouping field.
- Calendar, Gantt, Tree and other views are available depending on the DocType's configuration.

Set `default_view` to open the list in a specific one of these when the user first visits.
