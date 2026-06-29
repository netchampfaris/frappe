---
title: Form Scripts
---

# Form Scripts

A **form script** (or client script) runs in the browser and controls how the
Article form behaves: reacting to field changes, adding buttons, showing
messages. It lives in `article.js` next to the controller. The controller runs on
the server and is the source of truth; the form script is for a responsive
experience while the user types.

Open the generated file:

```text
apps/library_management/library_management/library_management/doctype/article/article.js
```

## Hook into form events

You register handlers with `frappe.ui.form.on(doctype, handlers)`. The object key
is the event name, and `frm` is the current form.

```javascript
frappe.ui.form.on("Article", {
  refresh(frm) {
    if (frm.doc.status === "Issued") {
      frm.dashboard.set_headline("This article is currently issued.");
    }

    frm.add_custom_button("View Transactions", () => {
      frappe.set_route("List", "Library Transaction", {
        article: frm.doc.name,
      });
    });
  },

  isbn(frm) {
    if (frm.doc.isbn) {
      frm.set_value("isbn", frm.doc.isbn.replace(/-/g, ""));
    }
  },
});
```

Three things are happening:

- `refresh` runs every time the form loads or reloads. It is where you set up
  buttons and indicators. Here it shows a headline when the article is issued.
- `frm.add_custom_button(label, fn)` adds a button to the form toolbar. This one
  routes to the Library Transaction list filtered to the current article.
- A handler named after a fieldname (`isbn`) runs when that field changes. This
  strips dashes from the ISBN as the user types, matching what the controller does
  on save.

`frm.doc` is the document on screen. Read fields from it, but change values with
`frm.set_value(fieldname, value)` so the form updates and marks itself dirty.

## Load the new script

A doctype's `.js` file is read straight from disk and sent with the form on every
load, so you do not need `bench build` for it. Just hard-refresh the Article form
in the browser to pick up your changes.

`bench build` is only needed for JavaScript and CSS you place in an app's `public`
folder and reference as bundles (for example through the `app_include_js` or
`web_include_js` hooks). Those files are bundled by the asset build, while form
scripts next to the controller are not.

## Try it

Open an Article whose status is `Issued`: the headline appears at the top of the
form. Type an ISBN with dashes and watch them disappear. Click **View
Transactions** to jump to the filtered list.

## Server-side stays in charge

The form script improves the form, but it does not replace the controller. A
record created through the REST API or a data import skips the browser entirely,
so the dash-stripping and ISBN length check in `validate` still matter. Keep real
rules in the controller and use the form script for convenience.

For the full set of form events and `frm` methods, see the
[Form API](/client-side/form-api).

Continue to [Permissions and Roles](/tutorial/permissions-and-roles).
