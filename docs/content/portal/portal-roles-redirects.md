---
title: Portal Roles and Redirects
---

# Portal Roles and Redirects

This page covers what happens around the portal: the site-wide settings, the portal sidebar menu, and how Frappe decides where to send a user after login.

## Website Settings

Website Settings is a Single DocType that holds site-wide configuration for the public site. Open it at `/app/website-settings`. The values here are merged into every web page through `get_website_settings()`, so they are available in any template.

What you set here:

- Top bar and footer items: the navigation menus (`top_bar_items`, `footer_items`). Items can have child items for dropdowns.
- Branding: `app_name`, `app_logo`, `brand_html`, `favicon`, `splash_image`, `banner_html`, `copyright`.
- `home_page`: the default landing route for the site (more below).
- `disable_signup` and `hide_login`: control account self-service.
- `head_html`: raw HTML injected into the page head, for analytics or meta tags.
- `route_redirects`: a table of source/target redirects an admin can edit without code. See the redirects section in [Generators Routing](/portal/generators-routing).
- Google integration: `google_analytics_id`, `enable_google_indexing`.

Saving Website Settings clears the website cache, including the cached menus and role-based home pages.

## Portal menu

The portal sidebar (shown to logged-in portal users) comes from Portal Settings, another Single DocType at `/app/portal-settings`. It has two tables:

- `menu`: the standard items, synced from the `standard_portal_menu_items` hook.
- `custom_menu`: items you add manually.

Each menu item can be limited to a role. `get_portal_sidebar_items()` in `frappe/website/utils.py` only shows an item when it is enabled and either has no role or the user has that role.

```python
# your_app/hooks.py
standard_portal_menu_items = [
    {"title": "Orders", "route": "/orders", "reference_doctype": "Order", "role": "Customer"},
    {"title": "Invoices", "route": "/invoices", "reference_doctype": "Invoice", "role": "Customer"},
]
```

Click "Reset" in Portal Settings (or call `sync_menu()`) to pull in items from the hook. If the hook names a role that does not exist yet, Frappe creates it. Tick "Hide Standard Menu" to drop the standard items and show only your custom ones.

You can also add menu items from a hook at render time with `portal_menu_items`, which are always treated as enabled.

## Home page and role-based redirects

After login, Frappe needs to decide where to send the user. `get_home_page()` in `frappe/website/utils.py` resolves it in this order:

1. A per-request override (`frappe.local.flags.home_page`), if set.
2. For a logged-in user, the `home_page` set on any of the user's Roles. The first role with a home page wins.
3. The `default_portal_home` from Portal Settings.
4. Home page from hooks (`get_website_user_home_page`, `role_home_page`, or `home_page`).
5. The global `home_page` from Website Settings.
6. A fallback: `login` for guests, `me` for logged-in users.

So to send everyone with the "Customer" role to a custom dashboard, set the home page on the Role record.

```text
Role: Customer
Home Page: customer-dashboard
```

There are two special cases at the end of resolution: a System User whose home page resolves to `me` is sent to `desk`, and a portal user whose home page resolves to `me` is sent to `portal`. If the user has a default workspace, that takes over and they land on the workspace.

## Setting the home page from hooks

When you want code to decide the landing page, use one of these hooks. They are checked in `get_home_page_via_hooks()`.

```python
# your_app/hooks.py

# a fixed page for everyone
home_page = "welcome"

# a page per role
role_home_page = {
    "Customer": ["customer-dashboard"],
    "Supplier": ["supplier-portal"],
}

# full control via a function that receives the user
get_website_user_home_page = "your_app.utils.get_home_page"
```

```python
# your_app/utils.py
def get_home_page(user):
    if "Customer" in frappe.get_roles(user):
        return "customer-dashboard"
    return "me"
```

The home page result is cached per user (except on a dev server), and the cache is cleared when Website Settings or Portal Settings are saved.

## Validation

When you set a home page or `default_portal_home`, Frappe validates that the path actually resolves to a page through `PathResolver`. An invalid home page in Website Settings is cleared with a warning, and an invalid `default_portal_home` raises an error on save.
