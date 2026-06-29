---
title: Print Formats
---

# Print Formats

A Print Format controls how a document looks when you print it or download it as a PDF. Each one is a record of the **Print Format** DocType, tied to a DocType through the `doc_type` field (or to a Report when `print_format_for` is `Report`). A DocType can have many print formats, and one of them is the default.

Open any document, click the print icon, and pick a format. To build a new one, go to the **Print Format** list and create a record, or use the Print Format Builder from the print view.

## Types of print format

The `print_format_type` field decides how the format is rendered:

- **Jinja**: the format is a server-side HTML template rendered with Jinja. This is what most custom formats use.
- **JS**: the format is rendered on the client, used by report print formats.

There are also two ways the HTML gets authored:

- **Builder formats**: drag-and-drop, no HTML. Frappe stores the layout and generates the HTML for you.
- **Custom formats**: you write the HTML yourself. Set the **Custom Format** check and fill in the **HTML** field.

## Jinja and HTML formats

A custom Jinja format gives you a `doc` object for the current document and the `frappe` module for helpers. Write plain HTML with Bootstrap classes for layout:

```jinja
<h3>{{ doc.select_print_heading or "Invoice" }}</h3>
<div class="row">
    <div class="col-md-3 text-right">Customer</div>
    <div class="col-md-9">{{ doc.customer_name }}</div>
</div>
<div class="row">
    <div class="col-md-3 text-right">Date</div>
    <div class="col-md-9">{{ doc.get_formatted("invoice_date") }}</div>
</div>

<table class="table table-bordered">
    {%- for row in doc.items %}
    <tr>
        <td>{{ row.idx }}</td>
        <td>{{ row.item_name }}</td>
        <td class="text-right">{{ row.get_formatted("amount", doc) }}</td>
    </tr>
    {%- endfor %}
</table>
```

Two helpers come up a lot:

- `doc.get_formatted("fieldname")` renders a value the way the field is typed (dates, currency, and so on). Pass the parent `doc` for currency fields on child rows: `row.get_formatted("amount", doc)`.
- `frappe.db.get_value("DocType", "name", "fieldname")` pulls a value from another document.

Put CSS in the **CSS** field. The renderer tags each field group with `data-fieldname` and `data-fieldtype`, gives values the class `value`, and gives section and column breaks the classes `section-break` and `column-break`, so you can target them:

```css
[data-fieldtype="Int"] .value {
  text-align: left;
}
.section-break {
  padding: 30px 0;
  border-bottom: 1px solid #eee;
}
```

## Print Format Builder

The builder is the no-code way to make a format. Open a document, go to the print view, and choose **Customize** to launch it, or create a new format and pick the builder. You drag fields onto the page, add custom HTML blocks, columns, and headings, and the layout is saved without you writing a template. New non-custom formats default to the builder and use Chrome for PDF generation.

## PDF generation

The `pdf_generator` field selects the engine: `wkhtmltopdf` (the older default) or `chrome` (used by builder formats). Page margins, font, font size, and page numbering are set on the Print Format record under the layout fields.

## Letter heads and language

A format can be combined with a **Letter Head** (the header and footer block, usually a logo and address) chosen at print time or set as the document's default. Set **Default Print Language** to render the format in a specific language when translations exist.

## Making a format the default

Use **Make Default** from the Print Format form. For a custom DocType it sets `default_print_format` on the DocType; for a standard DocType it creates a Property Setter so the change survives migrations.

## Standard print formats

When `developer_mode` is on, setting **Standard** to `Yes` exports the format to its module folder so it ships with the app. Standard formats cannot be edited on a normal site; duplicate one to customize it.
