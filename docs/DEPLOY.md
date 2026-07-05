# Deployment

## Frappe Server

Build the docs with the `/docs/` base path and let Frappe serve the generated
files through the `DocsPage` renderer.

```sh
cd apps/frappe/docs
yarn install --frozen-lockfile
yarn build:frappe
```

Then open `/docs` on any site where the `frappe` app is installed, for example:

```text
http://frappe.test:8000/docs
```

The build output is generated at `docs/.vitepress/dist` and should not be edited
manually.

## Static Site

If you deploy this docs app as a standalone static site on Frappe Cloud, use:

- Root directory: `docs`
- Install command: `yarn install --frozen-lockfile`
- Build command: `yarn build`
- Publish directory: `.vitepress/dist`
- Node version: `24` or newer

For a local production check, run:

```sh
yarn build
yarn preview
```
