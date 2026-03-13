import functools


@functools.lru_cache(maxsize=1024)
def get_first_party_apps():
	"""Get list of all apps under orgs: frappe. erpnext from GitHub"""
	import requests

	apps = []
	for org in ["frappe", "erpnext"]:
		req = requests.get(f"https://api.github.com/users/{org}/repos", {"type": "sources", "per_page": 200})
		if req.ok:
			apps.extend([x["name"] for x in req.json()])
	return apps


def render_table(data):
	import shutil
	from textwrap import wrap

	from terminaltables import AsciiTable

	# Get terminal width, default to 80 if not available
	try:
		terminal_width = shutil.get_terminal_size().columns
	except Exception:
		terminal_width = 80

	table = AsciiTable(data)

	# Check if table fits in terminal
	if table.table_width <= terminal_width:
		print(table.table)
		return

	# Adaptive formatting currently targets key/value style tables only.
	# For all other table shapes, preserve full columns and let terminal wrap happen naturally.
	if not data or max(len(row) for row in data) != 2:
		print(table.table)
		return

	if len(data) > 1:
		decoration_width = 7  # "| ", " | ", " |"
		min_value_width = 20

		max_key_length = max(len(str(row[0])) for row in data)
		available_value_width = terminal_width - decoration_width - max_key_length

		if available_value_width < min_value_width:
			max_key_length = max(3, terminal_width - decoration_width - min_value_width)
			available_value_width = terminal_width - decoration_width - max_key_length

		available_value_width = max(5, available_value_width)
		max_key_length = max(3, max_key_length)

		adjusted_data = []
		for i, row in enumerate(data):
			if len(row) >= 2:
				key = str(row[0])
				value = str(row[1])

				if i == 0:
					adjusted_data.append([key, value])
					continue

				key_lines = wrap(key, width=max_key_length, break_long_words=True, break_on_hyphens=False) or [""]
				value_lines = wrap(
					value,
					width=available_value_width,
					break_long_words=True,
					break_on_hyphens=False,
				) or [""]

				row_count = max(len(key_lines), len(value_lines))
				for line_no in range(row_count):
					adjusted_data.append(
						[
							key_lines[line_no] if line_no < len(key_lines) else "",
							value_lines[line_no] if line_no < len(value_lines) else "",
						]
					)
			else:
				adjusted_data.append(row)

		table = AsciiTable(adjusted_data)

	print(table.table)


def add_line_after(function):
	"""Adds an extra line to STDOUT after the execution of a function this decorates"""

	def empty_line(*args, **kwargs):
		result = function(*args, **kwargs)
		print()
		return result

	return empty_line


def add_line_before(function):
	"""Adds an extra line to STDOUT before the execution of a function this decorates"""

	def empty_line(*args, **kwargs):
		print()
		result = function(*args, **kwargs)
		return result

	return empty_line


def log(message, colour=""):
	"""Coloured log outputs to STDOUT"""
	colours = {
		"nc": "\033[0m",
		"blue": "\033[94m",
		"green": "\033[92m",
		"yellow": "\033[93m",
		"red": "\033[91m",
		"silver": "\033[90m",
	}
	colour = colours.get(colour, "")
	end_line = "\033[0m"
	print(colour + message + end_line)


def warn(message, category=None, stacklevel=3):
	from warnings import warn

	warn(message=message, category=category, stacklevel=stacklevel)
