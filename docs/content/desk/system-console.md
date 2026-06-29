---
title: System Console
---

# System Console

The System Console runs Python or SQL against your site from inside Desk. It is the quickest way to inspect data, try an API, or run a one-off fix without opening a `bench console` on the server. Open it from the Awesomebar by typing **System Console**.

Only the **System Manager** and **Administrator** roles can run it. Because it executes code on the server, keep that role list short.

## Running Python

Set **Type** to `Python`, write your code in the console, and click **Execute**. Output is whatever you print with `print` (or `log`), shown below the editor:

```python
tasks = frappe.get_all("Task", filters={"status": "Open"}, fields=["name", "subject"])
print(len(tasks))
for t in tasks:
    print(t.name, t.subject)
```

The console runs through the same `safe_exec` sandbox as [Server Scripts](/desk/client-server-scripts), so you get `frappe` and its whitelisted helpers but not arbitrary imports or filesystem access. `print` output is collected and returned as the result.

## Running SQL

Set **Type** to `SQL` to run a query instead. The query runs in a read-only transaction and the result comes back as JSON:

```sql
SELECT status, count(*) AS count
FROM `tabTask`
GROUP BY status
```

Only read queries are meant to run here; the transaction is rolled back unless you commit (see below).

## Commit

By default the console rolls back the transaction after running, so a Python snippet that creates or edits documents leaves nothing behind. Tick **Commit** before executing to keep the changes. Use it carefully: a committed change to data is permanent.

```python
doc = frappe.get_doc("Task", "TASK-0001")
doc.status = "Completed"
doc.save()
# tick "Commit" so this is actually written
```

If the script raises an error, the console catches it, shows the traceback in the output, and forces a rollback so a half-finished script cannot leave inconsistent data.

## Process list

The **Show Processlist** check displays the database's running queries (on MariaDB and Postgres). It is handy when a query is hanging and you want to see what the database is doing.

## Console Log

Every run is recorded as a **Console Log** record, including the script, the type, and whether it was committed. This gives you an audit trail of what was executed through the console and by whom.

## When to use the bench console instead

The System Console is convenient but sandboxed. For full Python access (imports, long-running scripts, debugging), use `bench --site your-site console` on the server, which gives you an unrestricted shell with `frappe` already initialized.
