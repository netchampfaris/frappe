---
title: Setup
---

# Setup

This tutorial builds one small app from start to finish: a **Library Management**
app. Over the next pages you create DocTypes for articles, members and
transactions, add server-side validation, write a client script, set role
permissions, and build a report and a print format.

Each page continues from the previous one, so follow them in order.

## What you need first

You need a working bench, a site, and the app installed with developer mode on.
The [Getting Started](/getting-started/introduction) guide covers all of this in
detail. Here is the short version.

Create the app:

```bash
bench new-app library_management
```

Create a site and install the app on it:

```bash
bench new-site library.localhost
bench --site library.localhost install-app library_management
```

Turn on developer mode, then clear the cache. See
[Developer Mode](/tutorial/developer-mode) for what this does and why:

```bash
bench set-config -g developer_mode 1
bench --site library.localhost clear-cache
```

For the full explanation of each command, read
[Your First App](/getting-started/your-first-app) and
[Your First Site](/getting-started/your-first-site) before continuing.

## Start the server

```bash
bench start
```

Open the site in your browser and log in as `Administrator`:

```text
http://library.localhost:8000
```

A fresh site redirects to the setup wizard until it is completed. Go through it
(or click through the steps quickly) before continuing.

If the hostname does not resolve, register it locally:

```bash
bench --site library.localhost add-to-hosts
```

## What you will build

A small data model with three DocTypes:

- **Article**: a book or item the library lends out.
- **Library Member**: a person who can borrow articles.
- **Library Transaction**: a record of an article being issued or returned.

You build **Article** in full first, then add the other two the same way.

Continue to [Developer Mode](/tutorial/developer-mode).
