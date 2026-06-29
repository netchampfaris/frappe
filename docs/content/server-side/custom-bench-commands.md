---
title: Custom Bench Commands
---

# Custom Bench Commands

Your app can add its own `bench` subcommands. When you run a `bench` command, Frappe looks at every installed app for a `commands` module and collects the click commands it exports. This lets you script tasks like data fixes, one-off imports, or maintenance jobs and run them from the command line.

## How discovery works

For each installed app, Frappe imports `<app>.commands` and reads a list named `commands` from it. Every entry in that list must be a click command, and each command's name becomes the `bench` subcommand. This happens in `frappe/utils/bench_helper.py`:

```python
def get_app_commands(app: str) -> dict:
    ret = {}
    app_command_module = importlib.import_module(f"{app}.commands")
    for command in getattr(app_command_module, "commands", []):
        ret[command.name] = command
    return ret
```

If an app has no `commands` module, it is skipped. If the list is missing or empty, the app adds no commands.

## Directory layout

The `commands` module lives inside your app's Python package. For an app named `flags`, the package is `apps/flags/flags`, so the module path is `flags.commands`.

It can be a single file:

```bash
apps
└── flags
    └── flags
        ├── __init__.py
        └── commands.py        # exports `commands`
```

Or a package, if you want to split commands across files:

```bash
apps
└── flags
    └── flags
        └── commands
            ├── __init__.py    # exports `commands`
            └── reports.py
```

## A simple command

A command needs a click wrapper and an entry in the `commands` list. This one takes a single argument.

```python
# apps/flags/flags/commands.py
import click


@click.command("set-flags")
@click.argument("state", type=click.Choice(["on", "off"]))
def set_flags(state):
    "Turn feature flags on or off"
    from flags.utils import set_flags

    set_flags(state=state)


commands = [set_flags]
```

Run it:

```bash
$ bench set-flags on
```

## Working with a site

Most commands need a site so they can read or write the database. Use the `pass_context` decorator from `frappe.commands`. It gives you a context object with the sites passed on the command line, and you connect to each one yourself.

```python
# apps/flags/flags/commands.py
import click

import frappe
from frappe.commands import pass_context
from frappe.exceptions import SiteNotSpecifiedError


@click.command("count-flags")
@pass_context
def count_flags(context):
    "Print how many flags are set on each site"
    for site in context.sites:
        try:
            frappe.init(site)
            frappe.connect()
            count = frappe.db.count("Flag")
            click.echo(f"{site}: {count} flags")
        finally:
            frappe.destroy()

    if not context.sites:
        raise SiteNotSpecifiedError


commands = [count_flags]
```

Pass the site with the `--site` option:

```bash
$ bench --site mysite.localhost count-flags
```

The context object exposes `sites`, plus the `force`, `verbose`, and `profile` flags from the bench invocation. Always pair `frappe.init` and `frappe.connect` with `frappe.destroy` so the connection is closed even if the command fails. Raise `SiteNotSpecifiedError` when no site was given so bench prints a clear message instead of doing nothing.

## Splitting commands across files

When the `commands` module is a package, gather the commands in its `__init__.py`:

```python
# apps/flags/flags/commands/__init__.py
from flags.commands.reports import export_flags
from flags.commands.maintenance import purge_flags

commands = [export_flags, purge_flags]
```

Define each command in its own file and import them all into the `commands` list. Frappe only reads the `commands` attribute on the top-level module, so anything not in that list is ignored.
