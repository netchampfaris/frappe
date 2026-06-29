---
title: Generators Routing
---

# Generators Routing

Static files in `www/` cover fixed pages. When you want one web page per record of a DocType (one page per blog post, per product, per help article), use a Website Generator. The DocType drives the pages, and each published record gets its own URL.

## Has Web View

A DocType becomes a generator when you enable "Has Web View" in the DocType form. Frappe then adds a few standard fields and expects the controller to subclass `WebsiteGenerator` instead of `Document`.

```python
# your_app/your_app/doctype/blog_post/blog_post.py
from frappe.website.website_generator import WebsiteGenerator

class BlogPost(WebsiteGenerator):
    def get_context(self, context):
        context.parents = [{"title": "Blog", "route": "/blog"}]
        # add anything else the template needs
```

When "Has Web View" is on, the DocType has these fields:

- `route`: the URL path for the record, like `blog/my-first-post`.
- An "is published" field (you choose which field). The record is only served when this field is true.
- "Allow Guest to View" so visitors who are not logged in can open the page.

The web template lives in the DocType folder as `blog_post.html` next to the controller.

## Route field

Each published record needs a `route`. If you leave it blank, `WebsiteGenerator.set_route()` fills it from the title when the record is published. See `make_route()` in `frappe/website/website_generator.py`.

The default route is the scrubbed title. If the DocType's `route` property is set in the DocType definition, the route becomes `that_prefix/scrubbed-title`. Scrubbing lowercases the text and replaces spaces and underscores with hyphens.

```python
# title "My First Post" with DocType route prefix "blog"
# becomes route: blog/my-first-post
```

You can override `route` per record. Frappe strips leading and trailing slashes and dots and caps the length at 139 characters.

## is_published

A generator page is served only when the record counts as published. `WebsiteGenerator.is_website_published()` checks the "is published" field you configured on the DocType (`is_published_field`). If a record has that field set to false, its route returns a 404.

You can override the logic. For example, the Web Form DocType uses its own `condition_field` through website properties. The default is: published if the condition field is truthy, otherwise always published when no condition field is set.

```python
class BlogPost(WebsiteGenerator):
    def is_website_published(self):
        return bool(self.published) and self.published_on <= frappe.utils.today()
```

## How a route resolves to a page

When a request comes in, `PathResolver.resolve()` in `frappe/website/path_resolver.py` works through the path:

1. Check redirects.
2. Turn dynamic routes into a target using `resolve_from_map()`.
3. Try each renderer in order: static file, web form, document (generator), template page, print, list. The first one whose `can_render()` returns true wins.

For a generator, the document renderer matches a route to a published record of a DocType that has a web view.

## website_route_rules

`website_route_rules` is a hook for mapping a URL pattern to a target route. Use it for dynamic segments or to alias one path to another. Frappe evaluates these with Werkzeug routing, so you can capture parts of the path.

```python
# your_app/hooks.py
website_route_rules = [
    {"from_route": "/kb/<category>", "to_route": "Help Article"},
    {"from_route": "/profile", "to_route": "me"},
]
```

The captured value (`category` above) lands in `frappe.form_dict`, so the target page or controller can read it. Rules are collected in `get_website_rules()` in `path_resolver.py`, which also adds a rule for every DocType that has a web view and a `route` set in its definition.

In development the rules are not cached, so changes show up immediately. In production they are cached and cleared when website cache is cleared.

## Dynamic routes on Web Page

The Web Page DocType supports dynamic routes directly. Tick "Dynamic Route" on a Web Page and put a pattern in its `route`, like `project/<name>`. At request time `get_page_info_from_web_page_with_dynamic_routes()` builds a Werkzeug rule per dynamic Web Page and matches the incoming path. Matched arguments are merged into `frappe.form_dict`, and the page is rendered with those values available in `get_context`.

```text
route: project/<name>
```

A request to `/project/website-revamp` matches, and `frappe.form_dict.name` is set to `website-revamp`.

## Redirects

Two ways to redirect a route:

Hooks, for app-level redirects. Source can be a plain path or a regex, and the target can reference regex groups.

```python
# your_app/hooks.py
website_redirects = [
    {"source": "/app", "target": "/desk"},
    {"source": r"/old/(.*)", "target": r"/new/\1", "forward_query_parameters": True},
]
```

Website Settings, for redirects an admin can edit without touching code. Add rows under "Route Redirects" in Website Settings (the `route_redirects` child table). These are merged with the hook redirects in `resolve_redirect()`.

Redirects default to HTTP 301. Set `redirect_http_status` (in settings) to change it, and `forward_query_parameters` to carry the query string over to the target.
