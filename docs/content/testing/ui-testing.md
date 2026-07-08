---
title: UI Testing
---

# UI Testing

Frappe uses [Cypress](https://www.cypress.io/) for end-to-end browser tests.
These tests drive a real browser against a running site: they log in, visit
pages, click around, and assert on what they see. Use them to test Desk
behaviour, forms, and client scripts that you cannot cover from Python.

Specs live in `cypress/integration/` and are plain JavaScript files. A spec looks
like this:

```javascript
context("ToDo", () => {
  before(() => {
    cy.login();
    cy.visit("/app/todo");
  });

  it("creates a new ToDo", () => {
    cy.click_listview_primary_button("Add ToDo");
    cy.fill_field("description", "Write docs", "Text Editor");
    cy.click_doc_primary_button("Save");
    cy.get(".title-text").should("contain", "Write docs");
  });
});
```

## Running UI tests

The site needs `allow_tests` enabled (see [Overview](/testing/overview)). Start
the bench in one terminal:

```bash
bench start
```

Then run the tests for an app:

```bash
bench --site mysite run-ui-tests myapp
```

Useful options:

- `--headless` runs without opening the interactive Cypress window, which is what
  CI uses.
- `--browser chrome` picks the browser (Chrome is the default).
- `--spec <path>` runs a single spec file. Only takes effect together with
  `--headless`; without it, `--spec` is silently ignored and the full Cypress
  window opens with every spec.
- `--parallel` runs specs in parallel.
- `--with-coverage` generates a coverage report.

```bash
bench --site mysite run-ui-tests myapp --headless --spec cypress/integration/todo.js
```

The first run installs Cypress and its plugins if they are missing. Without
`--headless` the Cypress app opens so you can watch tests run and debug them
step by step.

## Custom commands

Frappe registers helper commands on `cy` so specs read clearly. Common ones:

- `cy.login(email, password)` logs in (defaults to the test user).
- `cy.visit("/app/todo")` opens a Desk route.
- `cy.fill_field(fieldname, value, fieldtype)` fills a form field.
- `cy.get_field(fieldname)` returns a field's control.
- `cy.click_listview_primary_button(label)` and `cy.click_doc_primary_button(label)`
  click the primary action button matching that label (it matches on visible
  text, not the doctype), for example `cy.click_listview_primary_button("Add ToDo")`.
- `cy.insert_doc(doctype, args)` and `cy.remove_doc(doctype, name)` create and
  delete documents over the API for test setup.
- `cy.clear_filters()` resets list view filters so state does not bleed into the
  next spec.

The full list is in `cypress/support/`. Configuration such as timeouts, the test
user, and the viewport size lives in `cypress.config.js` at the app root.

## Setting up test data

For data your spec needs, call the whitelisted helpers in
`frappe/tests/ui_test_helpers.py`, for example `create_if_not_exists`, through
`cy.call`. These endpoints only work when the site runs in test mode, so they are
safe to leave in place.

## Code coverage

Coverage tells you which lines of JavaScript ran during the tests. The source is
instrumented with [Istanbul](https://istanbul.js.org/), and the
[Cypress code-coverage plugin](https://github.com/cypress-io/code-coverage)
merges the results from every spec into one report.

To generate a report locally:

1. Instrument the source with [nyc](https://github.com/istanbuljs/nyc). This
   rewrites the files in place to add counters, so do it on a throwaway checkout.

   ```bash
   npx nyc instrument -x 'frappe/public/dist/**' -x 'frappe/public/js/lib/**' -x '**/*.bundle.js' --compact=false --in-place frappe
   ```

   The `-x` flag excludes paths; use `-n` to include specific paths instead.

2. Run the tests with coverage enabled:

   ```bash
   bench --site mysite run-ui-tests frappe --with-coverage
   ```

3. Print the report:

   ```bash
   npx nyc report --reporter=text
   ```

   See [alternative reporters](https://istanbul.js.org/docs/advanced/alternative-reporters/)
   for other output formats. The HTML and clover reports are written to
   `.cypress-coverage/` (set by the `nyc` config in `package.json`).

## Testing Library queries

You can use [Testing Library](https://testing-library.com/) queries inside specs.
They find elements the way a user would, by role, label, or visible text, instead
of by CSS selectors that break on refactors. See the
[queries docs](https://testing-library.com/docs/queries/about) for the full list.

`findByRole` is the one to reach for first.
[This table](https://www.w3.org/TR/html-aria/#docconformance) maps HTML elements
to their default roles.

| Query                                  | Matches                                  |
| -------------------------------------- | ---------------------------------------- |
| `findByRole('button', {name: 'Save'})` | a button whose accessible name is 'Save' |
| `findByRole('checkbox')`               | `input type=checkbox`                    |
| `findByRole('textbox')`                | `input type=text`, `textarea`            |
| `findByRole('searchbox')`              | `input type=search`                      |
| `findByRole('listbox')`                | `select`, `datalist`                     |

Other queries target an element by a specific attribute or its text:

| Query                            | Matches                                      |
| -------------------------------- | -------------------------------------------- |
| `findByLabelText('Optimize')`    | element tied to the label 'Optimize'         |
| `findByPlaceholderText('Name')`  | element with `placeholder='Name'`            |
| `findByText('example.json')`     | element whose text content is 'example.json' |
| `findByDisplayValue('Option 1')` | input, textarea, or select with that value   |
| `findByTitle('Open Link')`       | element with `title='Open Link'`             |
