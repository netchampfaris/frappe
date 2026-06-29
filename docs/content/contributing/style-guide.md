---
title: Style Guide
---

# Style Guide

Frappe enforces its code style with [pre-commit](https://pre-commit.com). Install the hooks once and they run on every commit, so you rarely have to think about formatting by hand.

```bash
pip install pre-commit
pre-commit install
```

The configuration lives in `.pre-commit-config.yaml` at the root of the repo. To run the checks across all files without committing:

```bash
pre-commit run --all-files
```

## Python

Python code is linted and formatted with [Ruff](https://docs.astral.sh/ruff/). The settings live in `pyproject.toml` under `[tool.ruff]`.

- Line length is 110.
- Indentation uses tabs, not spaces.
- Strings use double quotes.
- Imports are sorted by Ruff's import sorter (the `I` rule).
- The lint rule set is `F`, `E`, `W`, `I`, `UP`, `B`, and `RUF`, with a list of ignored rules in `pyproject.toml`.

Three Ruff hooks run in order: the import sorter, the linter, and the formatter. The formatter rewrites your code to the canonical style, so let it do the work instead of formatting manually.

## JavaScript, Vue, and SCSS

JavaScript, Vue, and SCSS files are formatted with [Prettier](https://prettier.io). JavaScript is also linted with [ESLint](https://eslint.org). Both run as pre-commit hooks. Generated bundles, vendored libraries, and Jinja-containing templates are excluded; see the `exclude` patterns in `.pre-commit-config.yaml`.

## Commit messages

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) and are checked by a `commitlint` hook at commit time. The subject must start with a lowercase type and a colon.

```text
feat: add bulk delete to list view
fix(api): handle missing fields in document.get
```

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`, `deprecate`.

## Other checks

The pre-commit config also runs general hooks on each commit: trailing whitespace removal, merge-conflict detection, a Python syntax check, and validation of JSON, TOML, and YAML files. One hook blocks direct commits to the `develop` branch, so do your work on a feature branch.
