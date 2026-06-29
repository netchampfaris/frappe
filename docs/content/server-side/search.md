---
title: Search
---

# Search

Frappe has two kinds of search you can call from server code: link search, which powers the dropdowns on Link fields, and global search, which looks across many doctypes for a phrase. They live in different modules and serve different needs.

## Link search

Link fields in the Desk show a dropdown of matching records as you type. That dropdown is served by `frappe.desk.search.search_link`. You can call it from server code to get the same results.

```python
from frappe.desk.search import search_link

results = search_link(doctype="Library Member", txt="asha")
```

It returns a list of suggestions, each with the record name and a label, formatted the way the Desk dropdown expects.

Parameters worth knowing:

- `doctype`: the doctype to search in.
- `txt`: the text the user typed.
- `filters`: restrict results, as a dict or filter list.
- `page_length`: how many results to return (default 10).
- `searchfield`: which field to match against. Defaults to `name`.

```python
search_link(
    "Library Member",
    "asha",
    filters={"status": "Active"},
    page_length=5,
)
```

`search_link` is whitelisted, so the client calls it directly. It respects permissions and user permissions, so a user only sees records they are allowed to see.

### Customizing link search per doctype

To change how a doctype's link field searches (for example, to also match by email), register a `standard_queries` hook pointing at a query function:

```python
# hooks.py
standard_queries = {"Library Member": "library.queries.member_query"}
```

See [Hooks](/server-side/hooks#jinja-queries-and-fixtures) for the shape of that function.

## Global search

Global search looks for a phrase across all doctypes that are configured for it. It reads from the `__global_search` table, which is kept up to date in the background. The entry point is `frappe.utils.global_search.search`.

```python
from frappe.utils.global_search import search

results = search("overdue", limit=20)
```

Each result has the matching `doctype`, the record `name`, and a snippet of `content`. Results are ranked by relevance and filtered by what the current user can read, so it is safe to expose.

- `text`: the phrase to search for.
- `doctype`: optional, to restrict to one doctype.
- `start` and `limit`: for paging.

```python
search("overdue", doctype="Library Loan", start=0, limit=10)
```

Which doctypes are searchable is controlled by **Global Search Settings** in the Desk. The index is populated by a scheduled job, so a brand new record may take a short while to appear in global search results.

For public website pages there is `web_search`, which searches only published content and is available to guests.

## Choosing between them

- Use **link search** when you want suggestions within one doctype, like an autocomplete.
- Use **global search** when you want to find a phrase across many doctypes at once, like the awesomebar.

## See also

- [Querying Data](/server-side/querying-data): direct queries when you know exactly what you want.
- [Hooks](/server-side/hooks#jinja-queries-and-fixtures): customizing link search with `standard_queries`.
