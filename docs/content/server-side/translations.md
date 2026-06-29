---
title: Translations
---

# Translations

Frappe has a built-in translation system. You mark strings as translatable in your
code, extract them into translation files per language, and Frappe swaps in the
translated string at runtime based on the current language.

## How it works

There are four steps:

1. **Mark** translatable strings in code with `_()` in Python and `__()` in JavaScript.
   Many DocType strings (field labels, descriptions, select options) are picked up
   automatically without any marker.
2. **Extract** the marked strings into a `main.pot` template file with `bench generate-pot-file`.
3. **Translate** each string into a target language inside a per-language `.po` file.
4. **Compile** the `.po` files into binary `.mo` files with `bench compile-po-to-mo`.
   Frappe loads these at runtime.

At runtime, calling `_("Some text")` looks up the compiled translations for the
current language. If a translation exists it is returned, otherwise the original
string is returned unchanged.

## Marking strings

### Python

Use `frappe._`, usually imported as `_`:

```python
import frappe
from frappe import _

frappe.msgprint(_("You don't have permission to access this file"))
```

The signature is `_(msg, lang=None, context=None)`.

### JavaScript

Use the global `__` function:

```js
frappe.msgprint(__("You don't have permission to access this file"));
```

The signature is `__(text, replace, context)`, where `replace` is an array or
object used to fill placeholders.

### Context

The same string can mean different things in different places. Pass a context so
each meaning can be translated separately. For example, "Change" can mean "to make
different" or it can mean coins.

```python
_("Change", context="Coins")
```

```js
__("Change", null, "Coins");
```

## Rules for translatable strings

The extractor reads your source with a regex, so the string has to follow a few
rules to be picked up correctly.

### Use literal strings

The argument must be a literal string, not a variable or an expression.

```python
# Works
frappe.msgprint(_("Document submitted successfully"))

# Does not work, the extractor cannot read a variable
message = "Document submitted successfully"
frappe.msgprint(_(message))
```

### Use positional placeholders for variables

Insert variables with `{0}`, `{1}` and format the result after translating. Other
formatting styles are not supported, and formatting before translating breaks the
lookup.

```python
# Works
_("Welcome {0}, get started in a few clicks.").format(full_name)

# Does not work
_("Welcome %s, get started in a few clicks." % full_name)
_("Welcome {0}, get started in a few clicks.".format(full_name))
```

```js
// Works
__("Welcome {0}, get started in a few clicks.", [full_name]);

// Does not work
__(`Welcome ${full_name}, get started in a few clicks.`);
```

### Keep each string in one piece

Do not concatenate or split strings, and do not write multiline strings. Word
order differs across languages, so a translator needs the whole sentence.

```python
# Works
_("You have {0} subscribers in your mailing list.").format(len(subscribers))

# Do not split
_("You have ") + str(len(subscribers)) + _(" subscribers in your mailing list.")
```

### Do not build plurals with logic

Plural forms differ across languages. Write each form as its own string instead of
appending an "s".

```python
if invoice_count == 1:
    msg = _("You have {0} pending invoice").format(invoice_count)
else:
    msg = _("You have {0} pending invoices").format(invoice_count)
```

### No leading or trailing spaces

Leading and trailing spaces get trimmed, so add any spacing outside the call.

```python
msg = " " + _("You have pending invoices") + " "
```

A string is only considered translatable if it contains at least one letter and is
not an icon class (`fa fa-...`), a pixel value (ends with `px`), or an `eval:`
expression.

## Where translation files live

Each app keeps its translation sources under `locale/`:

- `<app>/<app>/locale/main.pot` is the extracted template of all source strings.
- `<app>/<app>/locale/<lang>.po` holds the translations for one language, for
  example `de.po` for German.

Compiled `.mo` files are written to `sites/assets/locale/<lang>/LC_MESSAGES/<app>.mo`.
These are build artifacts, not committed to the app.

Frappe uses dashes in language codes (`zh-TW`) while the underlying files use
underscores (`zh_TW`).

## Adding or updating a language

The commands below operate on all installed apps by default. Pass `--app <name>`
to limit them to one app.

Extract or refresh the template after changing marked strings:

```sh
bench generate-pot-file --app myapp
```

Create a `.po` file for a new language:

```sh
bench create-po-file de --app myapp
```

Sync existing `.po` files with new strings from the template:

```sh
bench update-po-files --app myapp
```

Then fill in the translations in the `.po` file and compile:

```sh
bench compile-po-to-mo --app myapp
```

If your app still has old `.csv` translation files, migrate them once to the `.po`
format:

```sh
bench migrate-csv-to-po --app myapp
```

When you add a brand new language, also enable it in `frappe/geo/languages.csv`,
which lists each `language_code`, `language_name`, and whether it is enabled.

Translations can also be added or overridden at runtime from the **Translation**
DocType in Desk, which is useful for site-specific wording without editing files.

## How the language is resolved

The session language is stored in `frappe.local.lang`. Frappe resolves it in this
order, taking the first one that is set:

1. **Form Dict `_lang`** has the highest priority. Setting `_lang` in a request
   updates every translatable component in that request. Frappe uses this for email
   templates and print views.
2. **Cookie `preferred_language`**, considered for guest users only. This is how
   the website language switcher persists a choice per client.
3. **`Accept-Language` request header**, considered for guest users only. Frappe
   reads the client's ordered list of acceptable languages.
4. **User document `language`**. A logged-in user's choice follows them across
   devices and clients.
5. **System Settings `language`** is the lowest priority and acts as the fallback
   for the whole site.

Steps 2 and 3 are ignored for logged-in users, whose language comes from their User
document.
