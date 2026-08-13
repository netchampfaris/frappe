---
title: Web Forms
---

# Web Forms

A Web Form is a public form that creates or edits records of a DocType from the website. You pick a DocType, choose which fields to show, give it a route, and Frappe renders the form, handles validation, saves the record, and (optionally) lists the submissions. No template work needed for the common case.

Create one from the Desk by opening the Web Form list and adding a new Web Form, or by going to `/desk/web-form/new`.

## The basics

Three fields get a Web Form working:

- `doc_type`: the DocType records are saved to.
- `route`: the public URL, like `support-ticket`. The form is served at `/support-ticket`.
- `published`: the form is only reachable when this is checked.

Then add rows to "Web Form Fields", one per DocType field you want on the form. Each field references a `fieldname` from the DocType, and you can override its label, mark it required, hide it, set a default, or add a description. `validate_fields()` checks every field you list actually exists on the DocType.

Web Form is a Website Generator, so the `route` and `published` behavior described in the generators page applies here too.

## Form routes

A single Web Form responds at several paths, wired up in `get_page_info_from_web_form()` in `frappe/website/router.py`:

```text
/support-ticket          ->  redirects to /new or /list
/support-ticket/new      ->  blank form to create a record
/support-ticket/list     ->  list of the user's submissions (if Show List is on)
/support-ticket/<name>   ->  view a single submission
/support-ticket/<name>/edit  ->  edit a submission (if Allow Edit is on)
```

Hitting the bare route redirects to `/list` when "Show List" is on, otherwise to `/new`.

## Access control

Who can use the form depends on three settings.

Open form. Neither "Login Required" nor "Key Required" is set. Anyone, including guests, can submit. Good for contact and signup forms. Guests create records with permissions ignored on the server, so only expose forms you intend to be public.

Login required. Set "Login Required". Visitors must sign in. A logged-in user sees and edits their own submissions (filtered by `owner`). Guests get a login prompt dialog before the form shows.

Key required. Set "Key Required" to hand out one-time access links. Each link carries a `web_form_request_key` that binds the holder to specific documents through a Web Form Request record. The key holder can view, edit, or list only the documents tied to their key, even as a guest. This is how you let someone fill or update a form without making them create an account.

Other access options:

- "Anonymous": records are saved as the Guest user even if someone is logged in.
- "Apply Document Permissions": enforce the DocType's normal permission rules instead of the simpler owner check.
- "Allow Edit", "Allow Delete", "Allow Multiple": control whether users can change, remove, or submit more than one record.
- "Allow Incomplete": skip mandatory-field checks so a form can be saved partially.

## Showing submissions

Turn on "Show List" to give users a list of their own records at `/your-form/list`. Define "List Columns" to choose which fields appear. If you leave it blank, Frappe picks fields marked "In List View" on the DocType (`get_in_list_view_fields()`).

## Submission flow

When the form is submitted, the browser calls the `accept` method (`frappe.website.doctype.web_form.web_form.accept`). It builds or loads the document, sets the values from the listed fields, saves attachments, and applies the access rules above. This endpoint is rate limited to 10 requests per minute per form.

After a successful save you can:

- Show a success message and title (`success_message`, `success_title`).
- Redirect to a URL with `success_url`.

## Fields, sections, and tables

The Web Form supports most field types from the underlying DocType, including Link, Select, Attach, Date, Table, and Phone. A "Column Break" field renders a two-column layout. A "Page Break" turns the form into a multi-step form with Previous and Next buttons. Table fields render an editable grid, and Link fields become autocomplete inputs limited to the records the user is allowed to see.

## Presentation

Several fields control the look without any code:

- `introduction_text`: shown above the form.
- `banner_image`: header image.
- `button_label`: the submit button text.
- `breadcrumbs`: a Python list expression for the breadcrumb trail.
- `meta_title`, `meta_description`, `meta_image`: page metadata for sharing and SEO.
- `hide_navbar`, `hide_footer`, `show_sidebar` with a linked "Website Sidebar".

The `breadcrumbs` field holds a Python list of `{"label", "route"}` dicts, evaluated with `frappe.safe_eval`. The `_()` translation function is available, so wrap labels for translation:

```python
[{"label": _("Jobs"), "route": "jobs"}]
```

For scripts and styling beyond these, see [Customization](#customization).

## Customization

When the built-in options are not enough, add a client script for behavior and custom CSS for styling. Both are edited from the Web Form itself.

### Client script

Put JavaScript in the "Client script" field. The form exposes itself as `frappe.web_form`, and your script runs after the form is built (`frappe.init_client_script` is called from `make()` in the web form's JS class). The form object extends `frappe.ui.FieldGroup`, so you get the usual field helpers.

```javascript
frappe.ready(() => {
  // react to a field change
  frappe.web_form.on("country", (field, value) => {
    frappe.web_form.set_df_property("state", "hidden", value !== "India");
  });
});
```

Common methods on `frappe.web_form`:

- `get_value(fieldname)` and `get_values()`: read field values.
- `set_value(fieldname, value)`: set a value.
- `set_df_property(fieldname, property, value)`: change a field at runtime, for example `"hidden"`, `"reqd"`, or `"read_only"`.
- `on(fieldname, handler)`: run a handler when a field changes. The handler receives the field and its value.

### Validation

Set `frappe.web_form.validate` to a function that returns a falsy value to block the save. It runs in `save()` before the record is sent.

```javascript
frappe.web_form.validate = () => {
  let data = frappe.web_form.get_values();
  if (data.end_date < data.start_date) {
    frappe.msgprint(__("End date cannot be before start date"));
    return false;
  }
  return true;
};
```

### Events and lifecycle hooks

The form triggers events you can subscribe to, and supports two lifecycle callbacks: `after_load` and `after_save`.

```javascript
// run after the form loads
frappe.web_form.events.on("after_load", () => {
  console.log("form ready");
});

// run after a successful save
frappe.web_form.after_save = () => {
  frappe.msgprint(__("Thanks!"));
};
```

`after_load` fires once the form is built, and `after_save` fires in `save()` once the record is stored. Each has a matching event (`events.trigger("after_load")` and `events.trigger("after_save")`) and a matching callback you can set directly on `frappe.web_form`.

### Styling

Put CSS in the "Custom CSS" field. It is added to that form's page as a style block. The form markup gives you classes to target, like `.web-form-wrapper`, `.web-form`, and `.web-form-footer`.

```css
.web-form-wrapper {
  max-width: 640px;
  margin: 0 auto;
}

.web-form .form-section {
  margin-bottom: 2rem;
}
```

### Including code app-wide

The `webform_include_js` and `webform_include_css` hooks add JS or CSS to standard web forms across an app, keyed by DocType (`webform_include_js` also matches every form with `*`). They only apply to a standard Web Form, and only once that form's own colocated `.js` or `.css` file exists on disk (`add_custom_context_and_script()` in `frappe/website/doctype/web_form/web_form.py`). The hook files are appended after it, not on their own. Non-standard Web Forms are unaffected.

```python
# your_app/hooks.py
webform_include_js = {"Support Ticket": "public/js/support_ticket_web_form.js"}
webform_include_css = {"Support Ticket": "public/css/support_ticket_web_form.css"}
```

## Standard vs custom Web Forms

A Web Form created in developer mode with "Is Standard" checked is written to disk in your app (the `on_update` method exports a `.json`, `.js`, and `.py` file). Standard Web Forms ship with the app and can run a server-side `get_context` and a client script from those files. Non-standard Web Forms live only in the database and are edited entirely from the Desk.

For a standard Web Form, the `.py` file can define `get_context(context)` to add server-side context, which `add_custom_context_and_script()` merges in.

```python
# your_app/your_app/doctype/web_form/support_ticket/support_ticket.py
import frappe

def get_context(context):
    context.categories = frappe.get_all("Ticket Category", pluck="name")
```

The `.js` file is rendered as a template and injected as the page script, so the same `frappe.web_form` API applies there. A `.css` file with the form's scrubbed name in its app folder is picked up the same way.
