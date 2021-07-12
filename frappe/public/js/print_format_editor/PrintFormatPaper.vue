<template>
	<div class="print-format-paper" :style="paper_styles">
		<div class="paper-page-number" :style="page_number_styles">Page 1 of 2</div>

		<div class="paper-letterhead" v-if="layout.letterhead">
			<div v-html="layout.letterhead.content"></div>
			<button class="btn btn-default btn-xs btn-corner">
				{{ __("Change Letter Head") }}
				<span>
					<svg class="icon icon-xs"><use xlink:href="#icon-edit"></use></svg>
				</span>
			</button>
		</div>
		<div class="paper-header">
			<div v-html="layout.header.html"></div>
			<button class="btn btn-default btn-xs btn-corner" @click="edit_header">
				{{ __("Edit Header") }}
				<span>
					<svg class="icon icon-xs"><use xlink:href="#icon-edit"></use></svg>
				</span>
			</button>
		</div>
		<draggable
			v-model="layout.sections"
			group="sections"
			:animation="200"
			handle=".paper-section-heading"
		>
			<template v-for="section in layout.sections">
				<div class="paper-section">
					<div class="paper-section-heading">
						<div class="paper-section-label">
							<input
								class="paper-section-label-input"
								type="text"
								placeholder="Section Title"
								:value="section.label"
								@change="e => update_section_label(section, e.target.value)"
							/>
						</div>
						<div class="nav-item dropdown">
							<button
								class="btn btn-xs btn-section-settings"
								data-toggle="dropdown"
							>
								<svg class="icon icon-sm">
									<use xlink:href="#icon-dot-horizontal"></use>
								</svg>
							</button>
							<div class="dropdown-menu dropdown-menu-right" role="menu">
								<button
									class="dropdown-item"
									type="button"
									@click="add_column(section)"
									v-if="section.columns.length < 4"
								>
									{{ __("Add column") }}
								</button>
								<button
									class="dropdown-item"
									type="button"
									@click="remove_column(section)"
									v-if="section.columns.length > 1"
								>
									{{ __("Remove column") }}
								</button>
								<button
									class="dropdown-item"
									type="button"
									@click="add_section_above(section)"
								>
									{{ __("Add section above") }}
								</button>
								<button
									class="dropdown-item"
									type="button"
									@click="add_page_break(section)"
									v-if="!section.page_break"
								>
									{{ __("Add page break") }}
								</button>
								<button
									class="dropdown-item"
									type="button"
									@click="remove_page_break(section)"
									v-if="section.page_break"
								>
									{{ __("Remove page break") }}
								</button>
								<button
									class="dropdown-item"
									type="button"
									@click="delete_section(section)"
								>
									{{ __("Delete this section") }}
								</button>
							</div>
						</div>
					</div>
					<div class="paper-section-columns row">
						<div class="col" v-for="(column, i) in section.columns">
							<div class="paper-column">
								<div class="paper-column-title">{{ column.label || "" }}</div>
								<div class="paper-column-fields">
									<draggable
										v-model="column.fields"
										group="fields"
										:animation="150"
										:style="{ height: '100%' }"
									>
										<template v-for="df in column.fields">
											<button class="paper-field">
												<span>
													{{ df.label }}
												</span>
												<button
													class="btn btn-xs btn-remove-field"
													@click="remove_field(df)"
												>
													<svg class="icon icon-sm">
														<use xlink:href="#icon-close"></use>
													</svg>
												</button>
											</button>

											<div
												class="paper-field-table-columns"
												v-if="df.fieldtype == 'Table'"
											>
												<div
													class="nav-item dropdown"
													v-for="column in df.table_fields"
												>
													<button
														class="paper-table-column"
														data-toggle="dropdown"
													>
														{{ column.label }}
													</button>
													<div
														class="dropdown-menu dropdown-menu-right"
														role="menu"
													>
														<button class="dropdown-item" type="button">
															{{ __("Delete") }}
														</button>
													</div>
												</div>
											</div>
										</template>
									</draggable>
								</div>
							</div>
						</div>
					</div>
				</div>
				<div class="section-page-break" v-if="section.page_break">
					{{ __("Page Break") }}
				</div>
			</template>
		</draggable>
		<div class="paper-footer">
			<div v-html="layout.footer.html"></div>
			<button class="btn btn-default btn-xs btn-corner" @click="edit_footer">
				Edit Footer
				<span>
					<svg class="icon icon-xs"><use xlink:href="#icon-edit"></use></svg>
				</span>
			</button>
		</div>
	</div>
</template>
<script>
import draggable from "vuedraggable";

export default {
	name: "PrintFormatPaper",
	props: ["layout"],
	components: {
		draggable
	},
	methods: {
		edit_html(title, current_value, on_change) {
			let d = new frappe.ui.Dialog({
				title,
				fields: [
					{
						label: title,
						fieldname: "html",
						fieldtype: "Code",
						options: "HTML",
						description: `You can add dynamic properties from the document by using Jinja templating. For example: If you want to include the document ID, use {{ doc.name }}`
					}
				],
				primary_action: ({ html }) => {
					on_change(html);
					d.hide();
				}
			});
			d.set_value("html", current_value);
			d.show();
		},
		edit_header() {
			this.edit_html(__("Edit Header"), this.layout.header?.html, html => {
				this.$emit("update:layout", {
					...this.layout,
					header: {
						html
					}
				});
			});
		},
		edit_footer() {
			this.edit_html(__("Edit Footer"), this.layout.footer?.html, html => {
				this.$emit("update:layout", {
					...this.layout,
					footer: {
						html
					}
				});
			});
		},
		update_section_label(section, label) {
			let sections = this.layout.sections.map(_section => {
				if (_section === section) {
					_section.label = label;
				}
				return _section;
			});
			this.$emit("update:layout", {
				...this.layout,
				sections
			});
		},
		delete_section(section) {
			let sections = this.layout.sections.filter(
				_section => _section != section
			);
			this.$emit("update:layout", {
				...this.layout,
				sections
			});
		},
		add_section_above(section) {
			let sections = [...this.layout.sections];
			let index = sections.indexOf(section);
			sections.splice(index, 0, {
				label: "",
				columns: [{ fields: [] }, { fields: [] }]
			});

			this.$emit("update:layout", {
				...this.layout,
				sections
			});
		},
		add_page_break(section) {
			let sections = this.layout.sections.map(_section => {
				if (_section === section) {
					_section.page_break = true;
				}
				return _section;
			});
			this.$emit("update:layout", {
				...this.layout,
				sections
			});
		},
		remove_page_break(section) {
			let sections = this.layout.sections.map(_section => {
				if (_section === section) {
					_section.page_break = false;
				}
				return _section;
			});
			this.$emit("update:layout", {
				...this.layout,
				sections
			});
		},
		add_column(section) {
			let sections = this.layout.sections.map(_section => {
				if (_section === section) {
					_section.columns.push({
						fields: []
					});
				}
				return _section;
			});
			this.$emit("update:layout", {
				...this.layout,
				sections
			});
		},
		remove_column(section) {
			let sections = this.layout.sections.map(_section => {
				if (_section === section) {
					let last_column = _section.columns.slice(-1)[0];

					_section.columns = _section.columns
						.map((column, i) => {
							// move fields to 2nd last column
							if (i == _section.columns.length - 2) {
								column.fields = [...column.fields, ...last_column.fields];
							}
							if (i == _section.columns.length - 1) {
								return false;
							}
							return column;
						})
						.filter(Boolean);
				}
				return _section;
			});
			this.$emit("update:layout", {
				...this.layout,
				sections
			});
		},
		remove_field(df) {
			let sections = this.layout.sections.map(section => {
				section.columns = section.columns.map(column => {
					column.fields = column.fields.filter(_df => df !== _df);
					return column;
				});
				return section;
			});
			this.$emit("update:layout", {
				...this.layout,
				sections
			});
		}
	},
	computed: {
		paper_styles() {
			let margins = [
				this.layout.margin_top,
				this.layout.margin_right,
				this.layout.margin_bottom,
				this.layout.margin_left
			]
				.map(val => `${val}mm`)
				.join(" ");

			let paper_width = {
				A4: 210,
				Letter: 216
			}[this.layout.size || "A4"];

			return {
				padding: margins,
				maxWidth: `${paper_width}mm`
			};
		},
		page_number_styles() {
			let top, left, right, bottom, display;
			let translate = [0, 0];
			let position = this.layout.page_number_position;
			if (!position) return { display: "none" };

			if (position.includes("Top")) {
				top = `${this.layout.margin_top / 2}mm`;
				translate[1] = '-50%';
			}
			if (position.includes("Bottom")) {
				bottom = `${this.layout.margin_top / 2}mm`;
				translate[1] = '50%';
			}
			if (position.includes("Left")) {
				left = `${this.layout.margin_left}mm`;
			}
			if (position.includes("Right")) {
				right = `${this.layout.margin_right}mm`;
			}
			if (position.includes("Center")) {
				right = `50%`;
				translate[0] = '50%';
			}
			if (position == 'Hide') {
				display = 'none';
			}

			return {
				top,
				left,
				right,
				bottom,
				transform: `translate(${translate[0]}, ${translate[1]})`,
				display
			};
		}
	}
};
</script>
<style scoped>
.print-format-paper {
	position: relative;
	background-color: white;
	border-radius: 8px;
	min-height: 11.69in;
	margin-left: auto;
	color: var(--gray-900);
	box-shadow: var(--shadow-sm);
}

.paper-letterhead,
.paper-header,
.paper-footer {
	position: relative;
	border: 1px solid var(--dark-border-color);
	border-radius: var(--border-radius);
	margin-bottom: 1rem;
	padding: 1rem;
	min-height: 4rem;
}

.paper-footer {
	margin-bottom: 0;
}

.btn-corner {
	position: absolute;
	top: 1rem;
	right: 1rem;
}

.paper-section {
	background-color: white;
	border: 1px solid var(--dark-border-color);
	border-radius: var(--border-radius);
	margin-bottom: 1rem;
}

.paper-section-heading {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 1rem 1rem 0.75rem 1rem;
	cursor: grab;
}

.paper-section-label {
	min-width: 50%;
}

.paper-section-label-input {
	font-weight: 600;
	border: 1px solid transparent;
	width: 100%;
}
.paper-section-label-input::placeholder {
	color: var(--text-muted);
	font-weight: 400;
	font-style: italic;
}

.paper-section-label-input:focus {
	outline: none;
	border-color: var(--gray-200);
}

.paper-section-label-input {
	font-weight: 600;
}

.paper-section-columns {
	display: flex;
	padding: 0 1rem 1rem 1rem;
	min-height: 3rem;
}

.section-page-break {
	text-align: center;
	margin-bottom: 1rem;
	font-style: italic;
	color: var(--text-muted);
}

.paper-column,
.paper-column-fields {
	height: 100%;
}

.btn-section-settings {
	background: transparent;
	border: none;
	box-shadow: none;
	padding: var(--padding-xs);
}

.btn-section-settings:hover {
	background: var(--bg-light-gray);
}

.paper-field + .paper-field {
	margin-top: 0.5rem;
}

.paper-field {
	display: flex;
	align-items: center;
	justify-content: space-between;
	width: 100%;
	border: 1px dashed var(--dark-border-color);
	padding: 0.5rem 0.5rem 0.5rem 0.75rem;
	background: var(--bg-light-gray);
	border-radius: var(--border-radius);
	text-align: left;
	font-size: var(--text-md);
	color: var(--text-color);
}

.paper-field:hover .btn-remove-field {
	opacity: 1;
	pointer-events: auto;
}

.btn-remove-field {
	background: transparent;
	border: none;
	box-shadow: none;
	padding: 2px;
	opacity: 0;
	pointer-events: none;
}

.btn-remove-field:hover {
	background: white;
}

.paper-page-number {
	position: absolute;
}
</style>
