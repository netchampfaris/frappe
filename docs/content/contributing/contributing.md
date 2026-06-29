---
title: Contributing
---

# Contributing

Frappe is developed in the open on GitHub at [github.com/frappe/frappe](https://github.com/frappe/frappe). You contribute code by forking the repository, making your change on a branch, and opening a pull request.

## Set up for development

Get a working bench first. See [Installation](/getting-started/installation) for the full setup. Run your bench in [developer mode](/contributing/developer-mode) so DocType changes are written back to disk.

The default development branch is `develop`. New features and most fixes go there.

## Make your change

Fork the repo on GitHub, then add your fork as a remote and create a branch off `develop`.

```bash
git clone https://github.com/frappe/frappe.git
cd frappe
git remote add fork https://github.com/<your-username>/frappe.git
git checkout develop
git checkout -b my-fix
```

Install the pre-commit hooks once. They run the linters and formatters on every commit, and check your commit message.

```bash
pip install pre-commit
pre-commit install
```

See the [Style Guide](/contributing/style-guide) for the Python and JavaScript conventions these hooks enforce.

## Commit messages

Frappe uses [Conventional Commits](https://www.conventionalcommits.org). The commit message subject must start with a type, written in lowercase, followed by a colon and a short description.

```text
fix: prevent recursion when saving linked document
feat(web form): add one-time access links
```

The allowed types are `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`, and `deprecate`. A `commitlint` pre-commit hook rejects messages that do not follow this format.

## Run the tests

Run the relevant tests before you push.

```bash
bench --site test_site run-tests --app frappe
```

You can scope a run to one module or DocType while you work.

```bash
bench --site test_site run-tests --module frappe.tests.test_api
bench --site test_site run-tests --doctype "User"
```

See [Testing](/testing/overview) for how to write and run tests.

## Open the pull request

Push your branch to your fork and open a pull request against `develop`.

```bash
git push fork my-fix
```

In the pull request description, explain what the change does and why. If it fixes an open issue, add `closes #1234` so the issue is closed automatically when the PR is merged. Keep business logic and validations on the server side, and update the docs if your change affects documented behavior.

Maintainers cherry-pick merged fixes into the supported version branches using a backport bot, so you usually only target `develop`. See the [Release Process](/contributing/release-process) for how version branches work.

## Reporting issues

Bugs and feature requests go in the [issue tracker](https://github.com/frappe/frappe/issues). For a bug report, include the steps to reproduce, the version number, and screenshots where they help. Search the existing issues first so you do not file a duplicate. Use [Stack Overflow](https://stackoverflow.com/questions/tagged/frappe) tagged `frappe` for questions and general discussion, not the issue tracker.
