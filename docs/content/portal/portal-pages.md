---
title: Portal Pages
---

# Portal Pages

A portal page is a file in the `www/` folder of any app. Drop an `.html` or `.md` file in there and it becomes a public URL. The file path maps directly to the route, so `your_app/www/about.html` is served at `/about`.

```text
your_app/
  your_app/
    www/
      about.html       ->  /about
      pricing.md       ->  /pricing
      support/
        index.html     ->  /support
        contact.html   ->  /support/contact
```

An `index.html` (or `index.md`) is served at the folder route. So `support/index.html` answers `/support`, not `/support/index`.

`www/` is the canonical folder for portal pages. `get_start_folders()` in `frappe/website/router.py` also scans `templates/pages`, an older location kept for backward compatibility. Use `www/` for new pages.

## A minimal page

Start with plain HTML. Frappe wraps it in the default web layout (`templates/web.html`), so you only write the page body.

```html
<!-- your_app/www/about.html -->
<h1>About Us</h1>
<p>We build things.</p>
```

To extend a different layout or override blocks, use `{% extends %}` yourself. When the source already extends a template, Frappe does not wrap it again.

```html
{% extends "templates/web.html" %} {% block page_content %}
<h1>About Us</h1>
<p>We build things.</p>
{% endblock %}
```

## Markdown pages

A `.md` file is converted to HTML for you. Add front matter at the top to set page properties.

```text
---
title: Pricing
show_sidebar: 1
---

# Pricing

Our plans start at $0.
```

## The get_context hook

For anything dynamic, add a Python file next to the template with the same name. `about.html` pairs with `about.py`. Hyphens in the file name become underscores in the Python module name, so `my-page.html` pairs with `my_page.py`.

Define a `get_context(context)` function. Whatever you set on `context` is available in the template.

```python
# your_app/www/about.py
import frappe

def get_context(context):
    context.doc = frappe.get_cached_doc("About Us Settings")
    context.team = frappe.get_all("Team Member", fields=["name", "role"])
```

```html
<!-- your_app/www/about.html -->
<h1>{{ doc.company_name }}</h1>
<ul>
  {% for member in team %}
  <li>{{ member.name }} - {{ member.role }}</li>
  {% endfor %}
</ul>
```

`context` is a `frappe._dict`, so `context.doc` and `context["doc"]` are the same thing. You can either mutate `context` in place or return a dict, both work. Frappe runs the function in `update_context()` (see `frappe/website/page_renderers/template_page.py`).

## Controlling the page from get_context

Set these on `context` to change how the page behaves:

- `context.no_cache = 1` to skip the page cache. Use this when output depends on the logged-in user.
- `context.show_sidebar = True` to render the portal sidebar.
- `context.title` to set the page title (otherwise it is taken from an `<h1>` or the file name).
- `context.parents = [{"title": "Home", "route": "/"}]` for breadcrumbs.

You can also set module-level variables in the `.py` file that Frappe reads as page properties: `no_cache`, `sitemap`, `condition_field`, `base_template_path`, and `template`.

```python
# your_app/www/me.py
import frappe
from frappe import _

no_cache = 1

def get_context(context):
    if frappe.session.user == "Guest":
        frappe.throw(_("You need to be logged in"), frappe.PermissionError)
    context.current_user = frappe.get_doc("User", frappe.session.user)
```

## Redirects and 404 from a page

Raise inside `get_context` to send the visitor somewhere else or to stop rendering.

```python
import frappe

def get_context(context):
    doc = frappe.get_cached_doc("About Us Settings")
    if doc.is_disabled:
        frappe.local.flags.redirect_location = "/404"
        raise frappe.Redirect
    context.doc = doc
```

Raise `frappe.PermissionError` to block access, or `frappe.PageDoesNotExistError` to return a 404.

## What is already in the context

By the time your template renders, Frappe has merged in website-wide values from `get_website_settings()` (top bar items, footer, theme, favicon, brand HTML) and user info (`fullname`, `user_image`, `user`). Use these in any page without setting them yourself.

## Co-located JS and CSS

A `.js` or `.css` file with the same base name as the template is loaded automatically. `about.html` picks up `about.js` and `about.css` if they exist. This is handled in `load_colocated_files()`, so you do not need to link them manually.

```text
www/
  about.html
  about.js
  about.css
```
