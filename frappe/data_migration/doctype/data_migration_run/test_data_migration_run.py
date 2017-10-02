# -*- coding: utf-8 -*-
# Copyright (c) 2017, Frappe Technologies and Contributors
# See license.txt
from __future__ import unicode_literals
import frappe, unittest

class TestDataMigrationRun(unittest.TestCase):
	def test_run(self):
		create_plan()

		description = 'Data migration todo'
		new_todo = frappe.get_doc({
			'doctype': 'ToDo',
			'description': description
		}).insert()

		event_subject = 'Data migration event'
		frappe.get_doc(dict(
			doctype='Event',
			subject=event_subject,
			repeat_on='Every Month',
			starts_on=frappe.utils.now_datetime()
		)).insert()

		run = frappe.get_doc({
			'doctype': 'Data Migration Run',
			'data_migration_plan': 'ToDo Sync',
			'data_migration_connector': 'Local Connector'
		}).insert()

		run.run()
		self.assertEqual(run.db_get('status'), 'Success')

		run_push_count = run.db_get('push_insert') + run.db_get('pull_insert')
		todo_count = frappe.db.count('ToDo', filters={'todo_sync_id': ('!=', '')})
		self.assertEqual(run_push_count, todo_count)

		todo = frappe.get_doc('ToDo', new_todo.name)
		self.assertTrue(todo.todo_sync_id)

		# Pushed Event
		event = frappe.get_doc('Event', todo.todo_sync_id)
		self.assertEqual(event.subject, description)

		# Pulled ToDo
		created_todo = frappe.get_doc('ToDo', {'description': event_subject})
		self.assertEqual(created_todo.description, event_subject)

		todo_list = frappe.get_list('ToDo', filters={'description': 'Data migration todo'}, fields=['name'])
		todo_name = todo_list[0].name

		todo = frappe.get_doc('ToDo', todo_name)
		todo.description = 'Data migration todo updated'
		todo.save()

		run = frappe.get_doc({
			'doctype': 'Data Migration Run',
			'data_migration_plan': 'ToDo Sync',
			'data_migration_connector': 'Local Connector'
		}).insert()

		run.run()

		# Update
		self.assertEqual(run.db_get('status'), 'Success')
		self.assertEqual(run.db_get('push_update'), 1)

def create_plan():
	frappe.get_doc({
		'doctype': 'Data Migration Mapping',
		'mapping_name': 'Todo to Event',
		'remote_objectname': 'Event',
		'remote_primary_key': 'name',
		'mapping_type': 'Push',
		'local_doctype': 'ToDo',
		'fields': [
			{ 'remote_fieldname': 'subject', 'local_fieldname': 'description' },
			{ 'remote_fieldname': 'starts_on', 'local_fieldname': 'eval:frappe.utils.get_datetime_str(frappe.utils.get_datetime())' }
		]
	}).insert()

	frappe.get_doc({
		'doctype': 'Data Migration Mapping',
		'mapping_name': 'Event to ToDo',
		'remote_objectname': 'Event',
		'remote_primary_key': 'name',
		'local_doctype': 'ToDo',
		'local_primary_key': 'name',
		'mapping_type': 'Pull',
		'condition': '{"subject": "Data migration event"}',
		'fields': [
			{ 'remote_fieldname': 'subject', 'local_fieldname': 'description' }
		]
	}).insert()

	frappe.get_doc({
		'doctype': 'Data Migration Plan',
		'plan_name': 'ToDo sync',
		'module': 'Core',
		'mappings': [
			{ 'mapping': 'Todo to Event' },
			{ 'mapping': 'Event to ToDo' }
		]
	}).insert()

	frappe.get_doc({
		'doctype': 'Data Migration Connector',
		'connector_name': 'Local Connector',
		'connector_type': 'Frappe',
		'hostname': 'http://frappe.test:8000',
		'username': 'Administrator',
		'password': 'qwe'
	}).insert()
