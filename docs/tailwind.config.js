import frappeUIPreset from "frappe-ui/tailwind";

/** @type {import('tailwindcss').Config} */
export default {
	presets: [frappeUIPreset],
	content: [
		"./.vitepress/**/*.{js,ts,vue}",
		"./content/**/*.md",
		"../../frappe-ui/vitepress/**/*.{js,ts,vue}",
		"../../frappe-ui/src/**/*.{js,ts,vue}",
	],
};
