---
title: Virtual DocTypes
---

# Virtual DocTypes

A **Virtual DocType** has no database table. You provide the storage backend yourself by implementing a set of methods on the controller. This is how Frappe exposes external systems, in-memory data or non-SQL sources (Redis jobs, files, third-party APIs) as if they were ordinary documents, with forms, list views and the same `frappe.get_doc` API.

Set the `is_virtual` flag to `1` to make a DocType virtual.

```json
{
  "doctype": "DocType",
  "name": "Redis Queue Job",
  "is_virtual": 1,
  "fields": [
    {"fieldname": "job_id", "label": "Job ID", "fieldtype": "Data"},
    {"fieldname": "status", "label": "Status", "fieldtype": "Data"}
  ]
}
```

## Backend methods you must implement

Because there is no table, Frappe cannot read or write rows for you. Override these methods on the controller. The base `Document` does not implement them for virtual types:

| Method | Called when | Responsibility |
|--------|-------------|----------------|
| `load_from_db(self)` | A document is fetched. | Populate `self` from your backend (use `super(Document, self).__init__(values)`). |
| `db_insert(self, *args, **kwargs)` | A new document is saved. | Persist a new record. |
| `db_update(self)` | An existing document is saved. | Persist changes. |
| `delete(self)` | A document is deleted. | Remove the record. |
| `get_list(filters, page_length, **kwargs)` | The list view loads. | Return a list of row dicts (static method). |
| `get_count(filters, **kwargs)` | The list view counts. | Return total count (static method). |
| `get_stats(**kwargs)` | Sidebar stats load. | Return group-by stats (static method). |

## A minimal example

```python
import frappe
from frappe.model.document import Document

class RedisQueueJob(Document):
    def db_insert(self, *args, **kwargs):
        # Persist `self` to your backend here
        raise NotImplementedError

    def load_from_db(self):
        # Fetch from the backend and hydrate this document
        job = fetch_job_from_redis(self.name)
        super(Document, self).__init__(job)

    def db_update(self):
        # Save changes to the backend
        raise NotImplementedError

    def delete(self):
        # Remove from the backend
        raise NotImplementedError

    @staticmethod
    def get_list(filters=None, page_length=20, **kwargs):
        return fetch_jobs_from_redis(filters, page_length)

    @staticmethod
    def get_count(filters=None, **kwargs):
        return count_jobs_in_redis(filters)

    @staticmethod
    def get_stats(**kwargs):
        return {}
```

Real examples in the Frappe source: `frappe/core/doctype/rq_job/rq_job.py` (Redis jobs) and `frappe/core/doctype/recorder_suggested_index/recorder_suggested_index.py`.

## Behaviour notes

- The normal lifecycle hooks still run (`validate`, `before_insert`, `on_update`, …). See [Controllers & Lifecycle](/doctypes/controllers-lifecycle). Your `db_insert`/`db_update` is what actually stores data; Frappe skips its SQL writes.
- Virtual DocTypes **cannot be fetched in bulk** with `frappe.get_docs`. Each document is loaded individually.
- A child table can be virtual too; the parent then manages those rows through your backend methods.

## See also

- [Controllers & Lifecycle](/doctypes/controllers-lifecycle): hooks that run around your backend methods.
- [Single DocTypes](/doctypes/single-doctypes): the other non-standard storage model.
