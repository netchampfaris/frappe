---
title: What's Next
---

# What's Next

You built a working Library Management app: three DocTypes, a controller with
server-side validation, a form script, role permissions, a query report, and a
print format. From here you can go deeper into any part of the framework.

## Build out the data model

- [DocTypes Overview](/doctypes/overview): the full data model, standard fields,
  and special DocType kinds.
- [Fields](/doctypes/fields): every field type and its key properties.
- [Child Tables](/doctypes/child-tables): rows embedded in a parent document, for
  example a list of fines on a transaction.
- [Naming](/doctypes/naming): all the ways the `name` primary key gets generated.
- [Links and Actions](/doctypes/links-actions): connect DocTypes and add document
  actions.

## Write more server-side logic

- [Controllers and Lifecycle](/doctypes/controllers-lifecycle): the complete list
  of lifecycle hooks, including submit, cancel and delete.
- [Document API](/server-side/document-api): reading and writing documents in
  code.
- [Querying Data](/server-side/querying-data) and the
  [Query Builder](/server-side/query-builder): fetch and filter records.
- [Whitelisted Methods](/server-side/whitelisted-methods): expose Python functions
  to the browser and the REST API.
- [Background Jobs](/server-side/background-jobs): run slow work off the request,
  for example sending overdue notices.
- [Hooks](/server-side/hooks): plug into other apps' DocTypes and framework
  events.

## Do more on the client

- [Form API](/client-side/form-api): the full set of form events and `frm`
  methods.
- [Dialog API](/client-side/dialog-api) and [Controls](/client-side/controls):
  build custom dialogs and inputs.
- [Server Calls](/client-side/server-calls): call your whitelisted methods from
  the browser.

## Ship it

- [REST API](/rest-api/overview): read and write your data over HTTP.
- [Testing](/testing/overview): write tests for your controllers.
- [Production Setup](/administration/production-setup): deploy your app and site.

If you get stuck, the [Frappe forum](https://discuss.frappe.io) and the
[source code](https://github.com/frappe/frappe) are good places to look next.
