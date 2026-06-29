---
title: Client Server Scripts
---

# Client and Server Scripts

Client Scripts and Server Scripts let you add logic to a site without deploying app code. You write them as records inside Desk, they are stored in the database, and they take effect right away. This is the no-code (well, low-code) path: good for site-specific tweaks, quick automation, and customizations on a managed site where you cannot push a new app version.

When logic belongs to your app and should ship with it, write it in app code instead: [controllers and hooks](/doctypes/controllers-lifecycle) for the server, and [form scripts](/client-side/form-api) for the client. Client and Server Scripts are the in-database equivalents.

## Client Script

A **Client Script** is JavaScript that runs in Desk for one DocType. It is the same code you would put in a form script file, but stored as a record. Each script has a **DocType** (`dt`), an **Apply To** (`view`) of `Form` or `List`, and an **Enabled** check.

```javascript
frappe.ui.form.on("Task", {
  refresh(frm) {
    if (frm.doc.status === "Overdue") {
      frm.dashboard.set_headline("This task is overdue");
    }
  },
  status(frm) {
    if (frm.doc.status === "Completed") {
      frm.set_value("progress", 100);
    }
  },
});
```

For a list view, use the `frappe.listview_settings` form:

```javascript
frappe.listview_settings["Task"] = {
  get_indicator(doc) {
    if (doc.status === "Overdue") {
      return [__("Overdue"), "red", "status,=,Overdue"];
    }
  },
};
```

Client Scripts need the **System Manager** role to create. They run only in Desk, so they cannot enforce anything; treat them as UI behavior, not validation. Saving or deleting a Client Script clears the cache for its DocType so the change shows up on the next load. See the [Form API](/client-side/form-api) for the full set of `frm` methods.

## Server Script

A **Server Script** is Python that runs on the server in a restricted sandbox. The **Script Type** decides when it runs:

- **DocType Event**: runs on a document event (Before Save, After Insert, Before Submit, and so on) for a chosen DocType. You get a `doc` variable.
- **API**: exposes a whitelisted endpoint at `/api/method/<name>`. Set output on `frappe.response`.
- **Scheduler Event**: runs on a schedule (hourly, daily, or a cron expression). Frappe creates a Scheduled Job Type for it.
- **Permission Query**: returns SQL conditions that filter list and report results for a DocType. Set the `conditions` variable.
- **Workflow Task**: runs as a step in a workflow action.

A DocType Event example, set Reference Document Type to `Task` and DocType Event to `Before Save`:

```python
if doc.status == "Completed" and not doc.completed_on:
    doc.completed_on = frappe.utils.now_datetime()
```

An API example, set Script Type to `API` and API Method to `get_open_tasks`, then call `/api/method/get_open_tasks`:

```python
frappe.response["message"] = frappe.get_all(
    "Task",
    filters={"status": "Open"},
    fields=["name", "subject"],
)
```

The endpoint name comes from the **API Method** field, and the path is always prefixed with `/api/method`. From client code you call it with `frappe.call("get_open_tasks")`. By default the endpoint needs a logged-in user. Check **Allow Guest** to let unauthenticated requests reach it.

A Permission Query example, set Reference Document Type to `Task`:

```python
conditions = f"`tabTask`.owner = {frappe.db.escape(frappe.session.user)}"
```

### Enabling server scripts

Server Scripts are off by default. Turn them on in the bench config:

```bash
bench set-config -g server_script_enabled true
```

The flag lives in `common_site_config.json`, so it applies to every site on the bench. Without it, running a script throws a `ServerScriptNotEnabled` error. Writing Server Scripts also requires the **Script Manager** role.

### DocType events

For a DocType Event script, set the **Reference Document Type** and the **DocType Event**. The event picks the document lifecycle hook the script runs on:

- Before Insert, Before Validate, Before Save, After Insert, After Save
- Before Rename, After Rename
- Before Submit, After Submit
- Before Cancel, After Cancel
- Before Discard, After Discard
- Before Delete, After Delete
- Before Save (Submitted Document), After Save (Submitted Document)
- Before Print

These map to the same [document events](/doctypes/controllers-lifecycle) you would use from a controller. The script gets a `doc` variable for the document being processed.

### The sandbox

Server Scripts run through `safe_exec`, a restricted Python environment built on RestrictedPython. You do not get arbitrary imports or filesystem access. You get `frappe` and a curated allow-list of helpers, which is enough for most automation. The editor autocompletes the available names.

The allow-list, grouped by what it does:

- **Documents (ORM):** `frappe.get_doc`, `frappe.new_doc`, `frappe.get_cached_doc`, `frappe.get_last_doc`, `frappe.get_meta`, `frappe.copy_doc`, `frappe.get_mapped_doc`, `frappe.rename_doc`, `frappe.delete_doc`, `frappe.get_system_settings`
- **Database:** `frappe.db.get_list`, `frappe.db.get_all`, `frappe.db.get_value`, `frappe.db.set_value`, `frappe.db.get_single_value`, `frappe.db.exists`, `frappe.db.count`, `frappe.db.escape`, `frappe.db.commit`, `frappe.db.rollback`, `frappe.db.add_index`, the query builder `frappe.qb`, and `frappe.db.sql` for read-only `SELECT` and `EXPLAIN` queries
- **Session and request:** `frappe.session.user`, `frappe.session.csrf_token`, `frappe.form_dict`, `frappe.request`, `frappe.response`, `frappe.user`, `frappe.get_fullname`
- **Email and printing:** `frappe.sendmail`, `frappe.get_print`, `frappe.attach_print`
- **Background jobs:** `frappe.enqueue`, `frappe.is_job_queued`
- **HTTP requests:** `frappe.make_get_request`, `frappe.make_post_request`, `frappe.make_put_request`, `frappe.make_patch_request`, `frappe.make_delete_request`
- **Utilities:** `frappe.utils` (date and number helpers), `frappe.format`, `frappe.render_template`, `frappe.msgprint`, `frappe.throw`, `frappe.log_error`, `frappe.get_hooks`, `frappe.get_url`, `_` for translation, and `frappe.call` to run a whitelisted method

Inside a DocType Event script, `frappe.db.commit`, `frappe.db.rollback`, and `frappe.db.add_index` are removed, since the framework manages the transaction around the event. They are available in API and Scheduler scripts.

For API scripts you can turn on **Enable Rate Limit** and set a request count and time window to throttle calls.

### Reusing a script as a library

One Server Script can call another with `run_script`, which runs the named script and returns the values it left on `frappe.flags`. This lets you share logic between scripts. The reused script must be of type **API**.

In the API script you want to reuse, set a flag:

```python
frappe.flags.tax_rate = 0.18
```

In another script, call it and read the value back:

```python
tax_rate = run_script("compute_tax").get("tax_rate")
```

## Which one to use

- Need to change how a form behaves in Desk: **Client Script**.
- Need to validate, compute, or react on the server when a document changes: **Server Script** (DocType Event).
- Need a custom endpoint or a scheduled job without shipping app code: **Server Script** (API or Scheduler Event).
- The logic belongs to your app and should be version-controlled: write a [controller method or hook](/doctypes/controllers-lifecycle) instead.
