---
title: Asset Bundling
---

# Asset Bundling

Desk and many website pages are written in modern JavaScript and SCSS that the browser cannot run directly. Frappe ships a bundler (esbuild) that compiles these source files into plain `.js` and `.css` before they are served.

The bundler compiles these inputs:

- `.js` and `.jsx` (modern syntax with `import` and `export`)
- `.ts` (TypeScript)
- `.vue` (Vue single file components)
- `.css` (processed with PostCSS)
- `.scss` and `.sass` (Sass)
- `.less` (Less)
- `.styl` (Stylus)

Each input compiles to `.js` or `.css` depending on its type.

## Bundle files

A bundle file is an entry point that the bundler picks up. Any file matching `*.bundle.{js,ts,jsx,css,scss,sass,less,styl}` inside an app's `public` folder is treated as an entry point.

For example, `myapp/public/main.bundle.js` compiles to `myapp/public/dist/js/main.bundle.[hash].js` and is served at `/assets/myapp/dist/js/main.bundle.[hash].js`. A hash computed from the output contents is added to the file name for cache busting.

Style files change extension because browsers understand CSS but not Sass, Less, or Stylus. So `style.bundle.scss` compiles to `style.bundle.[hash].css`.

Bundle files can sit at any depth inside `public`, but the output always lands in `dist/js` or `dist/css` based on type. The output name uses only the file's base name, so two entry points with the same base name (for example `public/main.bundle.js` and `public/src/main.bundle.js`) collide. The bundler prints a warning when this happens.

Some inputs and their served paths:

| Input                                    | Served path                                     |
| ---------------------------------------- | ----------------------------------------------- |
| `[app]/public/main.bundle.js`            | `/assets/[app]/dist/js/main.bundle.[hash].js`   |
| `[app]/public/src/main.bundle.js`        | `/assets/[app]/dist/js/main.bundle.[hash].js`   |
| `[app]/public/src/utils/utils.bundle.js` | `/assets/[app]/dist/js/utils.bundle.[hash].js`  |
| `[app]/public/main.bundle.ts`            | `/assets/[app]/dist/js/main.bundle.[hash].js`   |
| `[app]/public/main.bundle.css`           | `/assets/[app]/dist/css/main.bundle.[hash].css` |
| `[app]/public/main.bundle.scss`          | `/assets/[app]/dist/css/main.bundle.[hash].css` |
| `[app]/public/main.bundle.less`          | `/assets/[app]/dist/css/main.bundle.[hash].css` |
| `[app]/public/main.bundle.styl`          | `/assets/[app]/dist/css/main.bundle.[hash].css` |

The mapping from each bundle name to its hashed output is written to `assets.json` (and `assets-rtl.json` for right-to-left styles). The helpers below read from this file, so you never hardcode a hashed path.

## Building assets

Run the build from the `frappe-bench` folder:

```sh
bench build
```

Limit it to specific apps with `--apps`:

```sh
# build only frappe assets
bench build --apps frappe

# build frappe and erpnext assets
bench build --apps frappe,erpnext
```

## Watch mode

While developing you want assets to rebuild on every change. Watch mode runs a long-lived process that listens for file changes and rebuilds.

```sh
bench watch
```

It logs a line such as `Compiled 2 files...` after each rebuild.

Desk reloads automatically when assets rebuild in watch mode. Toggle this with the `LIVE_RELOAD` environment variable or the `live_reload` key in [`common_site_config.json`](/administration/site-config).

## Importing libraries from npm

You can install third-party libraries and import them in bundle files. Add the dependency from the app folder:

```sh
cd frappe-bench/apps/myapp
yarn add dayjs
```

Then import it in a source file:

```js
// myapp/public/main.bundle.js
import dayjs from "dayjs";

console.log(dayjs());
```

## Including bundled assets in HTML

Because the output path contains a content hash, you cannot hardcode it. Frappe provides helpers that resolve the current path for you.

### In custom HTML files

The Jinja methods `include_script` and `include_style` return the full markup for a script or stylesheet.

```html
<!-- index.html -->
<head>
  {% raw -%} {{ include_style('style.bundle.css') }} {%- endraw %}
</head>
<body>
  <div id="myapp"></div>
  {% raw -%} {{ include_script('main.bundle.js') }} {%- endraw %}
</body>
```

This renders to:

```html
<link
  type="text/css"
  rel="stylesheet"
  href="/assets/myapp/dist/css/style.bundle.SYKETW5P.css"
/>
<script
  type="text/javascript"
  src="/assets/myapp/dist/js/main.bundle.BYJXV4LB.js"
></script>
```

### In Desk (app.html)

To load an app's bundles into Desk, list them under `app_include_js` and `app_include_css` in `hooks.py`.

```py
# [app]/hooks.py
app_include_js = ["main.bundle.js"]
app_include_css = ["style.bundle.css"]
```

For website pages, the equivalent hooks are `web_include_js` and `web_include_css`.

### Get the path only

When you need just the resolved path, use `bundled_asset`.

```
{% raw -%}{{ bundled_asset('main.bundle.js') }}{%- endraw %}
```

This renders to `/assets/myapp/dist/js/main.bundle.BYJXV4LB.js`.

These helpers are also available in Python:

```py
from frappe.utils.jinja_globals import bundled_asset, include_script, include_style

bundled_asset("main.bundle.js")
```

## Lazy loading in Desk

To load a bundle on demand inside Desk, use `frappe.require`. It resolves the hashed path, injects the asset, and returns a promise.

```js
frappe.require("main.bundle.js").then(() => {
  // main.bundle.js is now loaded
});
```

This keeps the asset off the first page load, which helps when the code is only needed under some condition. You can also pass an array of bundle names to load several at once.

## Production mode

When building for production, pass `--production` so the output is minified.

```sh
bench build --production
```
