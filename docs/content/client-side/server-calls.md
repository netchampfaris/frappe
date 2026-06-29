---
title: Server Calls
---

# Server Calls

Client code talks to the server by calling whitelisted Python methods. The two main helpers are `frappe.call` (callback style) and `frappe.xcall` (promise style). For reading and writing documents there is `frappe.db`, a thin wrapper over the standard client endpoints.

These helpers are part of the Desk JavaScript bundle, so they are only available on Desk pages (served at `/desk`). For calls from outside Desk, use the [REST API](/rest-api/overview).

```javascript
// promise style, returns the method's return value directly
let count = await frappe.xcall("frappe.client.get_count", {
  doctype: "Task",
  filters: { status: "Open" },
});
```

## frappe.call

`frappe.call(opts)` is the base helper. It posts to `/api/method/<method>` and runs your callback with the response.

```javascript
frappe.call({
  method: "myapp.api.do_something",
  args: { task: "TASK-0001", reason: "late" },
  callback(r) {
    // r.message is the method's return value
    console.log(r.message);
  },
  error(r) {
    // called on a server error
  },
});
```

The method you call must be decorated with `@frappe.whitelist()` on the server. See [Whitelisted Methods](/server-side/whitelisted-methods). The callback receives the full response object, where `r.message` holds the return value.

Useful options:

- `args`: arguments passed to the method.
- `type`: `"POST"` (default) or `"GET"`. Use `GET` for read-only calls so they can be cached.
- `freeze`: set true to block the UI with an overlay while the call runs.
- `freeze_message`: the text shown on that overlay.
- `callback` and `error`: success and failure handlers.
- `always`: runs after the call whether it succeeded or failed.
- `btn`: a button element to disable while the call is in flight.

```javascript
frappe.call({
  method: "myapp.api.generate_report",
  args: { month: "2026-06" },
  freeze: true,
  freeze_message: __("Generating report..."),
  callback(r) {
    frappe.msgprint(r.message);
  },
});
```

## frappe.xcall

`frappe.xcall(method, args, type, opts)` is the promise version. It resolves with `r.message` directly, so you do not unwrap the response yourself. Use it with `await` or `.then`.

```javascript
try {
  let result = await frappe.xcall("myapp.api.do_something", {
    task: "TASK-0001",
  });
  console.log(result);
} catch (err) {
  // server errors reject the promise
}
```

## frappe.db

`frappe.db` covers the common document operations against the built-in client endpoints. Each method returns a promise.

### get_list

`frappe.db.get_list(doctype, options)` reads a list of records. Defaults to the `name` field and a limit of 20.

```javascript
let tasks = await frappe.db.get_list("Task", {
  filters: { status: "Open" },
  fields: ["name", "subject", "priority"],
  order_by: "creation desc",
  limit: 50,
});
```

### get_value and get_single_value

`frappe.db.get_value(doctype, filters, fieldname)` reads one or more fields from a single matching record.

```javascript
let { message } = await frappe.db.get_value("Task", "TASK-0001", "status");
message.status;

// multiple fields, matched by filters
let r = await frappe.db.get_value("Task", { subject: "Write docs" }, [
  "name",
  "status",
]);
```

`frappe.db.get_single_value(doctype, field)` reads a field from a [Single DocType](/doctypes/single-doctypes).

```javascript
let timezone = await frappe.db.get_single_value("System Settings", "time_zone");
```

### get_doc

`frappe.db.get_doc(doctype, name)` loads a full document.

```javascript
let doc = await frappe.db.get_doc("Task", "TASK-0001");
doc.subject;
```

### set_value, insert, delete

`frappe.db.set_value` updates fields on an existing record. `frappe.db.insert` creates a new one. `frappe.db.delete_doc` removes one.

```javascript
await frappe.db.set_value("Task", "TASK-0001", "status", "Completed");

// update several fields at once
await frappe.db.set_value("Task", "TASK-0001", {
  status: "Completed",
  priority: "Low",
});

let doc = await frappe.db.insert({
  doctype: "Task",
  subject: "New task",
});

await frappe.db.delete_doc("Task", "TASK-0001");
```

### count and exists

```javascript
let open = await frappe.db.count("Task", { filters: { status: "Open" } });
let there = await frappe.db.exists("Task", "TASK-0001"); // true or false
```

These calls run with the logged-in user's permissions, the same as the [REST API](/rest-api/overview). A user can only read or write what their roles allow.
