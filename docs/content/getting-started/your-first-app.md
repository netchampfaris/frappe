---
title: Your First App
---

# Your First App

An **app** is an installable Python package that adds DocTypes, controllers,
hooks, and assets to Frappe. This page scaffolds a new app and explains the files
that get generated.

You should already have a [bench set up](/getting-started/installation).

## Create the app

From inside your bench directory, run:

```bash
bench new-app library_management
```

This command is interactive. It asks for the app title, description, publisher,
email, and license, then generates the app under `apps/library_management` and
adds it to the bench. (`bench new-app` calls the framework's boilerplate
generator. Pass `--no-git` to skip initializing a Git repo.)

Use a valid Python module name: lowercase, words separated by underscores.

## App structure

A freshly generated app looks like this:

```text
apps/library_management/
├── library_management/            # the Python package (importable)
│   ├── __init__.py                # holds __version__
│   ├── hooks.py                   # how the app plugs into Frappe
│   ├── modules.txt                # list of modules in this app
│   ├── patches.txt                # data-migration patches, run on `bench migrate`
│   ├── public/                    # static assets (js, css, images)
│   ├── templates/                 # Jinja templates for web pages
│   ├── www/                       # file-based website routes
│   └── library_management/        # default module folder (holds doctypes)
├── pyproject.toml                 # Python package metadata & dependencies
├── license.txt
└── README.md
```

Note the **nested folder of the same name**: the outer folder is the repo, the
inner `library_management/` is the importable Python package, and the innermost
`library_management/` is the default **module** where your DocTypes live.

### `__init__.py`

Holds the app version, read by the framework and shown in the UI:

```python
__version__ = "0.0.1"
```

### `hooks.py`

The app's configuration file. It starts with metadata and then declares how the
app extends Frappe. The generated header looks like:

```python
app_name = "library_management"
app_title = "Library Management"
app_publisher = "Your Company"
app_description = "Manage books and members"
app_email = "you@example.com"
app_license = "mit"
```

Below that, `hooks.py` is where you register things like document event handlers,
scheduled jobs, and asset includes. For example, to run code on document events:

```python
doc_events = {
    "Library Member": {
        "validate": "library_management.api.validate_member",
    }
}
```

See [Hooks](/server-side/hooks) for the full list of available hooks.

### `modules.txt`

A newline-separated list of the [modules](/getting-started/key-concepts#module)
in the app. The generator adds one module named after the app. DocTypes are
grouped under modules:

```text
Library Management
```

### `pyproject.toml`

Standard Python packaging metadata. Add Python dependencies here under
`[project].dependencies`; they are installed into the bench's virtualenv when the
app is installed.

## What's next

Creating the app does not put it on a site yet. Continue to
[Your First Site](/getting-started/your-first-site) to create a site, install the
app, and enable developer mode so you can start building DocTypes.

## See also

- [Modules & App Structure](/doctypes/modules-app-structure)
- [Hooks](/server-side/hooks)
- [DocTypes Overview](/doctypes/overview)
