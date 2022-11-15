/** @type {import('tailwindcss').Config} */
let frappeui_path = require.resolve("frappe-ui");
frappeui_path = frappeui_path.split("/src/index.js")[0];

module.exports = {
	presets: [require("frappe-ui/src/utils/tailwind.config")],
	content: [
		`${frappeui_path}/src/components/**/*.{vue,js,ts,jsx,tsx}`,
		`${__dirname}/**/*.{vue,js,ts,jsx,tsx}`,
	],
	theme: {
		extend: {},
	},
	plugins: [],
};
