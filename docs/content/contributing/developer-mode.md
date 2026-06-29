---
title: Developer Mode
---

# Developer Mode

Developer mode is a flag in your site config that tells Frappe you are building an app, not just using one. Its main job is to write metadata changes back to disk as JSON files so they can be committed to your app and shared.

Turn it on with bench.

```bash
bench --site mysite.localhost set-config developer_mode 1
bench --site mysite.localhost clear-cache
```

This sets `developer_mode` in the site's `site_config.json`.

```json
{
 "developer_mode": 1
}
```

## What it enables

When developer mode is on, saving a standard DocType, Page, Report, Print Format, or similar metadata document exports it to the source files of its app. For example, editing a standard DocType writes the updated definition to `<app>/<module>/doctype/<name>/<name>.json`. Without developer mode, these documents are stored only in the database and are not written to disk.

Some actions are only allowed in developer mode. Creating or editing standard DocTypes is one. Exporting customizations (Custom Fields and Property Setters) to an app folder with `export_customizations` is another; outside developer mode it raises an error.

Developer mode also changes how errors are reported. Frappe shows fuller tracebacks instead of a generic error page, which helps while debugging but is not safe to expose on a production site.

## When to use it

Use developer mode on your local development bench while you build DocTypes and other metadata for an app. The exported JSON files are what get version-controlled and installed on other sites.

Do not enable developer mode on production. It exposes more error detail and assumes the app source is writable, which is not how a production deployment is set up.
