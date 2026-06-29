---
title: Tree View
---

# Tree View

Frappe shows a Tree View for any DocType that has the `Is Tree` option enabled (the DocType has an `is_group` field and nested set fields `lft` and `rgt`). The default view lets you expand nodes, add children, rename, and delete.

You customize the Tree View by setting `frappe.treeview_settings[doctype]` to an object of options. Put this in the DocType's tree script file, named `{doctype}_tree.js` (for example `account_tree.js`).

```javascript
frappe.treeview_settings["Account"] = {
  breadcrumb: "Accounting",
  title: "Chart of Accounts",
  get_tree_nodes: "myapp.api.get_children",
  add_tree_node: "myapp.api.add_node",
  filters: [
    {
      fieldname: "company",
      fieldtype: "Link",
      options: "Company",
      label: __("Company"),
    },
  ],
  // fields shown in the "New" dialog
  fields: [
    {
      fieldtype: "Data",
      fieldname: "account_name",
      label: __("Account Name"),
      reqd: true,
    },
    { fieldtype: "Check", fieldname: "is_group", label: __("Is Group") },
  ],
};
```

## Options

| Option             | Description                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `title`            | Page title. Defaults to `{DocType} Tree`.                                                                                           |
| `breadcrumb`       | Breadcrumb label. Defaults to the DocType's module.                                                                                 |
| `root_label`       | Label used for the root node.                                                                                                       |
| `get_tree_nodes`   | Dotted path to a whitelisted method that returns the children of a node. Defaults to `frappe.desk.treeview.get_children`.           |
| `add_tree_node`    | Dotted path to a whitelisted method that creates a new node. Defaults to `frappe.desk.treeview.add_node`.                           |
| `filters`          | Array of field definitions rendered as filters above the tree. See [Filters](#filters).                                             |
| `fields`           | Array of field definitions for the "New" dialog. Mandatory DocType fields are added automatically unless listed in `ignore_fields`. |
| `ignore_fields`    | Array of fieldnames to leave out of the "New" dialog, even if they are mandatory.                                                   |
| `menu_items`       | Extra items for the page's `...` menu. See [Menu items](#menu-items).                                                               |
| `toolbar`          | Buttons shown beside each node. See [Toolbar](#toolbar).                                                                            |
| `extend_toolbar`   | If `true`, your `toolbar` buttons are added to the default buttons instead of replacing them.                                       |
| `disable_add_node` | If `true`, hides the primary "New" action.                                                                                          |

## Server methods

`get_tree_nodes` is called with the current `doctype`, the `parent` node, and any active filter values. It must return a list of nodes, where each node is a dict with these keys:

- `value`: the node's name (used as its id)
- `title`: the label shown in the tree
- `expandable`: `1` if the node can have children, else `0`

The default `frappe.desk.treeview.get_children` covers the common case. Write your own only when you need custom filtering or labels.

`add_tree_node` receives the values from the "New" dialog along with `parent`, `doctype`, and `is_root`, and is responsible for creating the document. The default is `frappe.desk.treeview.add_node`.

## Filters

Each filter is a control definition, the same shape used in [dialogs](/client-side/dialog-api). When a filter value changes, the tree is rebuilt with the new value passed to `get_tree_nodes`. Use `onchange` to run extra logic on change.

```javascript
filters: [
  {
    fieldname: "company",
    fieldtype: "Link",
    options: "Company",
    label: __("Company"),
    onchange: function () {
      // runs after the value changes, before the tree rebuilds
    },
  },
];
```

## Menu items

`menu_items` adds entries to the page's `...` menu. Each item has a `label` and an `action` function. An optional `condition` string is evaluated to decide whether the item shows.

```javascript
menu_items: [
  {
    label: __("New Company"),
    action: function () {
      frappe.new_doc("Company", true);
    },
    condition: "frappe.boot.user.can_create.indexOf('Company') !== -1",
  },
];
```

Note the `condition` is a string, and the inner string literal uses single quotes inside the double-quoted condition.

## Toolbar

`toolbar` defines buttons shown next to each node. Each button has a `label`, a `condition(node)` function that returns whether the button shows for that node, a `click(node)` handler, and an optional `btnClass`.

```javascript
toolbar: [
  {
    label: __("Add Child"),
    condition: function (node) {
      return node.expandable;
    },
    click: function (node) {
      // handle click
    },
    btnClass: "hidden-xs",
  },
];
```

By default your `toolbar` replaces the built-in Edit, Add Child, Rename, and Delete buttons. Set `extend_toolbar: true` to keep the defaults and add your buttons alongside them. A button with the same `label` as a default replaces that default.

## Lifecycle hooks

| Hook          | Argument   | When it runs                                             |
| ------------- | ---------- | -------------------------------------------------------- |
| `onload`      | `treeview` | When the Tree View is created, before the tree is built. |
| `post_render` | `treeview` | After the tree is rendered.                              |
| `onrender`    | `node`     | When a node is rendered.                                 |
| `on_get_node` | `nodes`    | After `get_tree_nodes` returns the nodes for a parent.   |

```javascript
frappe.treeview_settings["Account"] = {
  onload: function (treeview) {
    // treeview is the TreeView instance
  },
  post_render: function (treeview) {},
  onrender: function (node) {},
  on_get_node: function (nodes) {},
};
```
