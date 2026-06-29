---
title: Attachments
---

# Attachments

Every uploaded file in Frappe is a record of the **File** DocType. Files can stand on their own (in the File Manager) or be attached to another document. The sidebar of any form shows its attachments, and you add one with the **Attach** button.

## The File DocType

A File record holds the metadata, not the bytes inline. The important fields:

- `file_name`: the original name.
- `file_url`: the URL to fetch the file, like `/files/report.pdf` for public or `/private/files/report.pdf` for private.
- `is_private`: when set, the file lives under `/private/files` and is only served to users who can read the document it is attached to. Public files under `/files` are served to anyone with the URL.
- `attached_to_doctype` and `attached_to_name`: link the file to a document. Empty for standalone files.
- `attached_to_field`: set when the file fills a specific Attach field on the document.
- `folder`: File records can be organized into folders (a File with `is_folder` set). The root is **Home**.
- `content_hash`: a hash of the contents, used to deduplicate identical uploads.

Create a file from code by passing the content:

```python
file = frappe.get_doc({
    "doctype": "File",
    "file_name": "notes.txt",
    "attached_to_doctype": "Task",
    "attached_to_name": "TASK-0001",
    "is_private": 1,
    "content": "some text content",
}).insert()

file.file_url  # use this to link to the file
```

`content` can be a string or bytes. For base64 data set `decode=True`. The file is written to disk on insert and `file_url` is filled in.

## Attach and Attach Image fields

To let users attach a file to a record through a field, add an **Attach** or **Attach Image** field to the DocType. The field stores the `file_url` as its value, and Frappe creates the backing File record linked through `attached_to_field`.

- **Attach**: any file type. The value is the URL string.
- **Attach Image**: same, but the form shows an image preview and the upload UI is image-focused.

```python
doc.image          # e.g. "/files/photo.png"
doc.get("image")
```

Because the field value is the URL, you can render it directly in templates and print formats. For example, in a Jinja template:

```html
<img src="{{ doc.image }}" />
```

## Public vs private

The `is_private` flag is the access control. A private file is only delivered to a user who has read permission on the document it is attached to, so a private Attach field inherits the document's permissions. A public file is reachable by anyone who has the URL. Choose private for anything that should not be world-readable.

## Attachment limits

A DocType can cap how many files may be attached to one record with the **Max Attachments** setting in its definition. Exceeding it raises an error on upload.

## Images and optimization

For image uploads, Frappe can strip EXIF data and optimize the image to reduce size. Thumbnails are stored in `thumbnail_url`. PDFs that contain embedded JavaScript are rejected as a safety measure.

## Working with files in code

Read the bytes back, or get the on-disk path:

```python
file = frappe.get_doc("File", file_name)
content = file.get_content()          # bytes for binary files, str for text
path = file.get_full_path()           # absolute path on disk
```

To attach an uploaded file programmatically there is also `frappe.utils.file_manager.save_file(fname, content, dt, dn)`, which is a shortcut for creating the File record and linking it to a document.
