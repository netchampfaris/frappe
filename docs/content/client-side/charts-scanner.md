---
title: Charts, Barcode & QR
---

# Charts, Barcode & QR

This page covers two browser widgets you can drop into a custom Desk page or dialog: charts via `frappe.Chart`, and the camera-based barcode and QR scanner via `frappe.ui.Scanner`.

## Charts

`frappe.Chart` is the [Frappe Charts](https://frappe.io/charts) library, exposed on the global `frappe` object. Create one by passing a target element (a selector or DOM node) and a config object.

```javascript
let chart = new frappe.Chart("#chart", {
  title: __("Tasks by Status"),
  type: "bar", // bar, line, pie, percentage, donut, heatmap
  height: 300,
  data: {
    labels: ["Open", "In Progress", "Completed"],
    datasets: [{ name: __("Tasks"), values: [12, 5, 30] }],
  },
  colors: ["#7cd6fd", "#743ee2", "#5e64ff"],
});
```

The `data` object holds `labels` (the x-axis) and `datasets` (one or more series of `values`). After creating the chart, update it without rebuilding:

```javascript
chart.update({
  labels: ["Open", "In Progress", "Completed"],
  datasets: [{ name: __("Tasks"), values: [8, 9, 33] }],
});

chart.addDataPoint(__("Cancelled"), [2]); // append a point
chart.removeDataPoint(0); // remove the first point
```

You usually fetch the numbers from the server first, then feed them in. See [Server Calls](/client-side/server-calls).

```javascript
let rows = await frappe.xcall("myapp.api.task_counts");
new frappe.Chart("#chart", {
  type: "pie",
  data: {
    labels: rows.map((r) => r.status),
    datasets: [{ values: rows.map((r) => r.count) }],
  },
});
```

### Live charts

`frappe.ui.RealtimeChart` extends the chart and updates it from a realtime socket event.

```javascript
new frappe.ui.RealtimeChart(element, event_name, max_label_points, data);
```

- `element`: selector or DOM node to render into.
- `event_name`: the realtime event to listen on for new data.
- `max_label_points`: maximum number of points to keep on the x-axis. The chart drops the oldest point once it is full. Defaults to 8.
- `data`: the same config object you pass to `frappe.Chart`, including `data.datasets`. The initial values array must not be longer than `max_label_points`.

```javascript
let chart = new frappe.ui.RealtimeChart("#live", "task_update", 8, {
  title: __("Tasks per minute"),
  type: "line",
  height: 250,
  data: {
    labels: ["t0"],
    datasets: [{ name: __("Tasks"), values: [0] }],
  },
});
chart.start_updating();
```

Methods:

- `start_updating()`: listen on `event_name` and append each payload to the chart.
- `stop_updating()`: stop listening on that event.
- `update_chart(label, points)`: append a point by hand. `label` is the new x-axis label and `points` is the array of values, one per dataset.

Publish events from the server with `frappe.publish_realtime`. The payload must carry a `label` and a `points` array, with one value per dataset on the chart. See [Realtime](/server-side/realtime) for more.

```python
frappe.publish_realtime("task_update", {"label": "t1", "points": [10]})
```

## Barcode and QR scanner

`frappe.ui.Scanner` opens the device camera and reads barcodes and QR codes. Set `dialog: true` to show it in a modal, and pass an `on_scan` callback. The callback receives the decoded result; the text is at `result.result.text`.

```javascript
new frappe.ui.Scanner({
  dialog: true,
  multiple: false,
  on_scan(result) {
    if (result && result.result && result.result.text) {
      let code = result.result.text;
      frappe.show_alert(__("Scanned: {0}", [code]));
    }
  },
});
```

Options:

- `dialog`: set true to open the scanner in a modal. Without it, pass `container` (a selector or element) to render the camera inline.
- `multiple`: set true to keep scanning after each read. The default stops after the first code.
- `on_scan(result)`: called with each decoded result.

```javascript
// inline, scanning many codes into a list
let codes = [];
let scanner = new frappe.ui.Scanner({
  container: "#scan-area",
  multiple: true,
  on_scan(result) {
    codes.push(result.result.text);
  },
});
// inline mode does not auto-start; call scan() to begin
scanner.scan();
```

Any Data field with the scan option turned on already shows a scan button that uses this same scanner and writes the result into the field, so you do not need to wire it up by hand for that case.

### Drawing barcodes

To render (not read) a barcode, use a field with the `Barcode` fieldtype. The control draws an SVG barcode from the field value automatically, so set the value and the image follows.
