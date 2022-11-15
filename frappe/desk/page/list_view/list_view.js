frappe.pages["list-view"].on_page_load = function (wrapper) {
	let iframe = document.createElement("iframe");
	wrapper.appendChild(iframe);
	let body = iframe.contentDocument.body;
	let head = iframe.contentDocument.head;
	let css = Object.assign(document.createElement("link"), {
		rel: "stylesheet",
		href: "/assets/frappe/dist/css/listview.tailwind.css",
	});
	head.appendChild(css);
	let app = document.createElement("div");
	body.appendChild(app);

	frappe.require("listview.bundle.js", () => {
		frappe.ui.initializeListView(app);
	});
};
