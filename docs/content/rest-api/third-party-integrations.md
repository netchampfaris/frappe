---
title: Third Party Integrations
---

# Third Party Integrations

Frappe ships with several integrations to outside services. They all live under
`frappe/integrations/`, and most of them are configured through a settings
DocType in the Desk. This page is a map of what is built in and where to find it.

## Google

Set your Google API project credentials once in **Google Settings**
(`frappe/integrations/doctype/google_settings/`). That client ID and secret are
shared by the Google integrations:

- **Google Calendar** (`.../doctype/google_calendar/`): two-way sync of events.
- **Google Contacts** (`.../doctype/google_contacts/`): import contacts.
- **Google Drive** (`.../doctype/google_drive/`): store backups on Drive.

The OAuth handling for these lives in `frappe/integrations/google_oauth.py`.
For "Login with Google" on the login page, see
[Social Login OIDC](/security/social-login-oidc) instead, which uses a separate
**Social Login Key**.

## Dropbox

**Dropbox Settings** (`frappe/integrations/doctype/dropbox_settings/`) backs up
your site files to a Dropbox account. You authorize the app once, then a
scheduled job uploads the database and file backups.

## S3 backups

**S3 Backup Settings** (`frappe/integrations/doctype/s3_backup_settings/`)
uploads site backups to an Amazon S3 bucket (or any S3-compatible store). Set the
bucket, region, and access keys, and a scheduled job pushes backups on the
interval you choose.

> Google Drive, Dropbox, and S3 backup integrations have been moved to [a separate app](https://github.com/frappe/offsite_backups) as of Version 16.

## LDAP

**LDAP Settings** (`frappe/integrations/doctype/ldap_settings/`) authenticates
users against an LDAP or Active Directory server. It supports both OpenLDAP and
Active Directory, and **LDAP Group Mapping**
(`.../doctype/ldap_group_mapping/`) maps LDAP groups to Frappe roles so group
membership controls what a user can do.

## Webhooks

Outgoing webhooks let your site POST to an external URL when a document event
fires. They are configured with the **Webhook** DocType. See
[Webhooks](/rest-api/webhooks) for the details.

## Slack

**Slack Webhook URL** (`frappe/integrations/doctype/slack_webhook_url/`) stores
an incoming webhook URL for a Slack channel. The **Notification** DocType uses
it to post messages to Slack.

## Push notifications

**Push Notification Settings** (`frappe/integrations/doctype/push_notification_settings/`)
configures the service used to send mobile push notifications from the site.

## Helper utilities

Shared request helpers live in `frappe/integrations/utils.py`, including
`make_get_request`, `make_post_request`, and `create_request_log`. Use these when
you build your own integration so calls are logged consistently in **Integration
Request**.

## See also

- [Connected Apps](/rest-api/connected-apps) for calling any external OAuth2 API
- [Social Login OIDC](/security/social-login-oidc) for external login providers
- [Webhooks](/rest-api/webhooks) for outgoing event notifications
