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

A Permission Query example, set Reference Document Type to `Task`:

```python
conditions = f"`tabTask`.owner = {frappe.db.escape(frappe.session.user)}"
```

### The sandbox

Server Scripts run through `safe_exec`, a restricted Python environment. You do not get arbitrary imports or filesystem access. You get `frappe` and a curated set of helpers (`frappe.get_all`, `frappe.get_doc`, `frappe.utils`, and more), which is enough for most automation. The editor autocompletes the available names. Writing Server Scripts requires the **Script Manager** role, and `server_script_enabled` must be set in the site config for them to run.

For API scripts you can turn on **Enable Rate Limit** and set a request count and time window to throttle calls.

## Which one to use

- Need to change how a form behaves in Desk: **Client Script**.
- Need to validate, compute, or react on the server when a document changes: **Server Script** (DocType Event).
- Need a custom endpoint or a scheduled job without shipping app code: **Server Script** (API or Scheduler Event).
- The logic belongs to your app and should be version-controlled: write a [controller method or hook](/doctypes/controllers-lifecycle) instead.
