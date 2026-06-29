---
title: Workspaces
---

# Workspaces

A Workspace is a landing page in the Desk sidebar. It groups shortcuts, links, charts, and number cards for one area of your app. Each entry in the sidebar is a record of the **Workspace** DocType, so you build and edit them inside Desk, not in code.

Open any Workspace and click **Edit** in the top right to rearrange it. Click **Create Workspace** at the bottom of the sidebar to add a new one.

## Public vs private workspaces

The `public` field decides who sees a Workspace:

- A **public** workspace shows in the sidebar for everyone (subject to roles). Only users with the **Workspace Manager** role can create or edit public workspaces.
- A **private** workspace is tied to one user through the `for_user` field. Any user can make their own private workspaces, and they only appear for that user.

Use the **Roles** tab on the Workspace to limit a public workspace to users who hold one of the listed roles. Leave it empty to show it to all Desk users.

## Content and blocks

A Workspace page is a grid of blocks. The layout is stored in the `content` field as a JSON list, where each block has a type, an id, and some data. You edit this visually, but it is useful to know what the block types are:

```json
[
  { "id": "T_8h_1kB6j", "type": "chart", "data": { "chart_name": "Login Activity", "col": 12 } },
  { "id": "Y9G8gIH9lP", "type": "number_card", "data": { "number_card_name": "System Users", "col": 4 } },
  { "id": "abc123", "type": "card", "data": { "card_name": "Reports", "col": 4 } }
]
```

`col` is the width in a 12-column grid, so `col: 4` is one third of the row. Common block types are `header`, `paragraph`, `card`, `chart`, `number_card`, `shortcut`, `quick_list`, and `onboarding`. Blocks reference records stored in the child tables described below.

## Shortcuts

Shortcuts are the big buttons at the top of a workspace. They live in the `shortcuts` child table (Workspace Shortcut). A shortcut points at a DocType, a Report, a Page, a URL, or a Dashboard, and can show a live count with a color filter (for example, open ToDos in red).

To add one in edit mode, drop a **Shortcut** block and pick the target. For a DocType shortcut you can set a filter so the count and the opened list both respect it.

## Cards (link groups)

Cards are lists of links grouped under a heading, like a menu. They are stored in the `links` child table (Workspace Link). The table is a flat list where a row of type `Card Break` starts a new card and the `Link` rows after it belong to that card:

```json
[
  { "type": "Card Break", "label": "Logs" },
  { "type": "Link", "link_type": "DocType", "link_to": "Activity Log", "label": "Activity Log" },
  { "type": "Link", "link_type": "DocType", "link_to": "Access Log", "label": "Access Log" }
]
```

Each link has a `link_type` of `DocType`, `Page`, or `Report`. For reports, set `is_query_report` when the target is a Query or Script Report rather than a Report Builder report. Check **Hide Custom DocTypes and Reports** on the Workspace to keep auto-added custom records out of the link cards.

## Charts and number cards

The **Dashboards** tab holds Dashboard Charts (the `charts` table) and the **Number Cards** tab holds Number Cards (the `number_cards` table). Both reference existing Dashboard Chart and Number Card records, which you create separately and then place as blocks on the page. The **Quick Lists** tab embeds a short, filtered list of a DocType inline on the workspace.

## Nesting and ordering

Set `parent_page` to nest a Workspace under another one in the sidebar. The `sequence_id` field controls order within the same level; the sidebar sorts ascending by it.

## Where workspaces are stored

When `developer_mode` is on, saving a public Workspace that belongs to a module exports it to the module's `workspace/` folder as JSON, so it ships with your app and is loaded on `bench migrate`. Private and user workspaces stay in the database only.
