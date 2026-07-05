import frappeUIPreset from "frappe-ui/tailwind";

/** @type {import('tailwindcss').Config} */
export default {
	presets: [frappeUIPreset],
	content: [
		"./.vitepress/**/*.{js,ts,vue}",
		"./content/**/*.md",
		"./node_modules/frappe-ui/vitepress/**/*.{js,ts,vue}",
		"./node_modules/frappe-ui/src/**/*.{js,ts,vue}",
		"../../frappe-ui/vitepress/**/*.{js,ts,vue}",
		"../../frappe-ui/src/**/*.{js,ts,vue}",
	],
};
