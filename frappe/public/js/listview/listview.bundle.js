import { createApp } from "vue";
import ListView from "./ListView.vue";

frappe.ui.initializeListView = function (element) {
	let app = createApp(ListView);
	app.mount(element);
};
