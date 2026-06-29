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

## Request lifecycle

Every request hits `application()` in `frappe/app.py`, which splits traffic by path before the website router runs:

- `/api/...` goes to the REST and RPC handler in `frappe/api`.
- `/backups` and `/private/files/...` return downloadable files.
- `/.well-known/...` serves well-known files.
- Everything else on GET, HEAD, or POST goes to `get_response()`, which runs the website router.

Public files under `/files` are served by static middleware (NGINX in production), so they never reach the Python router.

## Path resolver stages

`PathResolver.resolve()` returns the final endpoint and a renderer instance. It works in three stages:

1. Redirect resolution. `resolve_redirect()` checks the `website_redirects` hook and the Route Redirects table in Website Settings. A match raises `frappe.Redirect` and the resolver returns a `RedirectPage`.
2. Route resolution. With no redirect, `resolve_path()` maps the incoming path to an endpoint using `website_route_rules` and the dynamic routes of DocTypes that have a web view. A `website_path_resolver` hook can replace this step.
3. Renderer selection. The endpoint is passed to each renderer in order. The first one whose `can_render()` returns true is used. If none match, the resolver returns a `NotFoundPage`.

## Page renderers

A page renderer is a class that knows how to respond for a given endpoint. Each renderer has two methods:

- `can_render()`: return true if this renderer can handle the path.
- `render()`: build and return the response.

The base class is `BaseRenderer` in `frappe/website/page_renderers/base_renderer.py`. It provides `build_response()` and leaves `can_render` and `render` for subclasses.

The standard renderers are tried in this order (see `PathResolver.resolve()`):

- `StaticPage`: serves non-text files (anything that is not html, md, js, xml, css, txt, or py) from the `www` folder of an app. Prefer the app's `public` folder for static assets so NGINX serves them directly.
- `WebFormPage`: renders a Web Form when the path matches a Web Form route.
- `DocumentPage`: renders a generator document. It looks for a template in the DocType's `templates` folder named after the DocType, for example `doctype/blog_post/templates/blog_post.html`.
- `TemplatePage`: serves an HTML or markdown file from any app's `www` folder. For a folder, it serves `index.html` or `index.md`.
- `PrintPage`: renders the print view of a document, using the standard print format unless the DocType sets a `default_print_format`.
- `ListPage`: renders a DocType list template from the DocType's `templates` folder when one exists.

Two more renderers handle errors: `NotFoundPage` responds with 404, and `NotPermittedPage` responds with 403.

## Custom page renderer

For cases the standard renderers do not cover, register your own with the `page_renderer` hook. Custom renderers are checked before the standard ones.

```python
# your_app/hooks.py
page_renderer = "your_app.renderers.CustomPage"
```

```python
# your_app/renderers.py
from frappe.website.page_renderers.base_renderer import BaseRenderer

class CustomPage(BaseRenderer):
    def can_render(self):
        return self.path.startswith("custom/")

    def render(self):
        return self.build_response("<div>Custom Response</div>")
```

The class must define `can_render` and `render`. You can also subclass a standard renderer to reuse its behavior.

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

## Dynamic routes with www pages

You can serve dynamic URLs without a DocType by combining a `www/` template, its
Python controller, and a `website_route_rules` entry. The rule maps a URL pattern
to a static template, and the captured segment is read in `get_context`.

To render a page per project at `/project/<name>`, add the rule:

```python
# your_app/hooks.py
website_route_rules = [
    {"from_route": "/project/<name>", "to_route": "project"},
]
```

Add the template and its controller next to each other in `www/`:

```html
<!-- your_app/www/project.html -->
<h1>Project: {{ name }}</h1>
```

```python
# your_app/www/project.py
import frappe

def get_context(context):
    # the <name> segment from the URL is available in form_dict
    context.name = frappe.form_dict.name
```

A request to `/project/website-revamp` matches the rule, runs `project.py`'s
`get_context`, and renders `project.html` with `frappe.form_dict.name` set to
`website-revamp`.

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
