---
title: Realtime
---

# Realtime

Realtime lets the server push messages to the browser without the browser asking for them. It is built on [Socket.IO](https://socket.io/) and a Redis pub/sub channel. You emit an event from Python with `frappe.publish_realtime`, and JavaScript in the browser listens for it with `frappe.realtime.on`.

Use it for progress bars on long jobs, live notifications, or telling open forms that a document changed.

## Publishing from Python

```python
frappe.publish_realtime(
    event="catalog_synced",
    message={"count": 42},
)
```

By default the message goes to every logged-in Desk user on the site. The parameters control who receives it:

- `event`: the event name the client listens for.
- `message`: a JSON-serializable dict of data.
- `user`: send only to this user.
- `doctype` and `docname`: send to everyone viewing that document.
- `after_commit`: if `True`, the message is held until the current database transaction commits. If it rolls back, the message is never sent. Use this so the browser does not hear about data that was not actually saved.

```python
# only to the current user
frappe.publish_realtime(
    "import_done",
    {"file": "books.csv"},
    user=frappe.session.user,
)

# to anyone with this document open
frappe.publish_realtime(
    "stock_changed",
    {"qty": 10},
    doctype="Item",
    docname="ITEM-0001",
    after_commit=True,
)
```

## Progress bars

`frappe.publish_progress` is a wrapper for showing a progress indicator. Call it from a loop in a background job to update the user as work proceeds.

```python
def import_books(rows):
    total = len(rows)
    for i, row in enumerate(rows):
        create_book(row)
        frappe.publish_progress(
            percent=(i + 1) / total * 100,
            title="Importing books",
            description=f"{i + 1} of {total}",
        )
```

The Desk shows this progress automatically. No client code is needed.

## Listening in the browser

On the client, register a handler with `frappe.realtime.on`. The callback gets the `message` dict you sent.

```javascript
frappe.realtime.on("catalog_synced", (data) => {
  frappe.show_alert(`Synced ${data.count} books`);
});
```

Stop listening with `frappe.realtime.off`:

```javascript
frappe.realtime.off("catalog_synced");
```

The client can also emit events back to the server:

```javascript
frappe.realtime.emit("open_in_editor", location);
```

A common pattern is to start a background job, then listen for the event the job will publish when it finishes:

```javascript
frappe.call("library.api.start_sync").then(() => {
  frappe.realtime.on("catalog_synced", (data) => {
    frappe.msgprint(`Done: ${data.count}`);
    frappe.realtime.off("catalog_synced");
  });
});
```

## How it works

`publish_realtime` serializes the event and publishes it to a Redis channel named `events`, tagged with the room and the site. A separate realtime server subscribes to that channel and forwards each message to the right browser connections. "Rooms" are how it targets a user, a document, or the whole site.

The realtime server is a standalone Python process, `python -m frappe.realtime.server`. It runs on gevent, speaks Socket.IO to the browser, and is fully separate from the web (gunicorn) process. (Older setups may still run the legacy Node.js Socket.IO server instead; the Redis-based publish API is the same either way.)

Because it relies on Redis and the realtime server, realtime is best-effort. If a user is offline, they miss the message. Do not use it as the only way to deliver something important; store it in the database too.

## Custom realtime handlers

Besides listening for events published from Python, an app can define its own server-side handlers for events emitted *by the client*. Add them in:

```text
your_app/your_app/realtime/handlers.py
```

```python
import frappe
from frappe.realtime import Socket, realtime

@realtime.on("project_subscribe")
def project_subscribe(socket: Socket, project: str) -> None:
    if socket.has_permission("Project", project):
        socket.join(f"project:{project}")
```

The realtime server imports `<app>/realtime/handlers.py` for every installed app at startup. The first argument is always the connecting `Socket`; the rest are the payload the client sent. A handler runs only for sockets on sites that have its owning app installed.

By default a handler does not open a database connection (`frappe_context=False`); use `socket.has_permission(doctype, name)` for permission checks, which asks the web process over HTTP instead. Pass `frappe_context=True` to get a full Frappe context (`frappe.has_permission`, DB queries, and so on) inside the handler, at the cost of a DB connection per event.

See `frappe/realtime/README.md` for the full guide, including the `publish_to_*` helpers and room mapping.

## See also

- [Background Jobs](/server-side/background-jobs): the usual source of realtime progress updates.
