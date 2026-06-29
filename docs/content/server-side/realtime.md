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

`publish_realtime` serializes the event and publishes it to a Redis channel named `events`, tagged with the room and the site. A separate Node process (the Socket.IO server, started by `bench start`) subscribes to that channel and forwards each message to the right browser connections. "Rooms" are how it targets a user, a document, or the whole site.

Because it relies on Redis and the Socket.IO server, realtime is best-effort. If a user is offline, they miss the message. Do not use it as the only way to deliver something important; store it in the database too.

## See also

- [Background Jobs](/server-side/background-jobs): the usual source of realtime progress updates.
