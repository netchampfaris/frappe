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
        cy.click_listview_primary_button("ToDo");
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
- `--spec <path>` runs a single spec file.
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
- `cy.click_listview_primary_button(doctype)` and `cy.click_doc_primary_button()`
  click the main action buttons.
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
