---
title: Authentication
---

# Authentication

Every API request runs as a Frappe user. If you send no credentials, the request
runs as `Guest` and only sees what Guest is allowed to see. To act as a real user
you must authenticate. Frappe supports four mechanisms, resolved in
`frappe/auth.py`:

- **API key + secret** (token or basic): best for server-to-server scripts
- **Session cookie**: for browser clients that have logged in
- **OAuth 2.0 bearer token**: for third-party apps (see [OAuth2](/security/oauth2))
- **Custom auth hooks**: for your own schemes via the [`auth_hooks`](/server-side/hooks) hook

For most integrations, use an **API key and secret**.

## API key and secret

Each User can hold an `api_key` and an `api_secret`. You pass them in the
`Authorization` header. Two header formats are accepted (both handled by
`validate_auth_via_api_keys`).

### Token format (recommended)

Send `api_key:api_secret` after the literal word `token`:

```bash
curl https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>"
```

The key and secret are joined by a colon, in plain text (use HTTPS).

### Basic auth format

The same key and secret, base64-encoded after `Basic`:

```bash
# base64("<api_key>:<api_secret>")
curl https://example.com/api/resource/ToDo \
  -H "Authorization: Basic <base64 of api_key:api_secret>"
```

`curl -u <api_key>:<api_secret>` produces this header for you:

```bash
curl -u <api_key>:<api_secret> https://example.com/api/resource/ToDo
```

> If the `Authorization` header is present but the credentials are invalid, the
> request fails with an authentication error. It does **not** silently fall back
> to Guest.

### Authenticating against a non-User DocType

By default the key/secret are looked up on the **User** DocType. If you store API
credentials on a different DocType (with `api_key` and `api_secret` fields and a
`user` link), point the lookup at it with the `Frappe-Authorization-Source`
header:

```bash
curl https://example.com/api/resource/ToDo \
  -H "Authorization: token <api_key>:<api_secret>" \
  -H "Frappe-Authorization-Source: My Integration"
```

## Generating API keys

The secret is shown only once, at generation time. Generate keys for a user via
the whitelisted method `frappe.core.doctype.user.user.generate_keys` (requires
**System Manager**):

```bash
curl -X POST https://example.com/api/method/frappe.core.doctype.user.user.generate_keys \
  -H "Authorization: token <admin_api_key>:<admin_api_secret>" \
  -H "Content-Type: application/json" \
  -d '{"user": "jane@example.com"}'
```

```json
{
  "message": { "api_key": "b1a2c3...", "api_secret": "9f8e7d..." }
}
```

If the user already has an `api_key`, only the secret is regenerated. In the Desk
UI you can do the same from the User form, under **Settings &gt; API Access &gt;
Generate Keys**.

In Python:

```python
import frappe

user = frappe.get_doc("User", "jane@example.com")
api_secret = frappe.generate_hash(length=15)
if not user.api_key:
    user.api_key = frappe.generate_hash(length=15)
user.api_secret = api_secret
user.save()
# api_secret is the plaintext to hand to the client; it cannot be read back later
```

## Session / cookie auth

Browser clients log in once and reuse a session cookie (`sid`). Log in with the
`login` method, passing `usr` and `pwd`:

```bash
curl -c cookies.txt -X POST https://example.com/api/method/login \
  -H "Content-Type: application/json" \
  -d '{"usr": "jane@example.com", "pwd": "secret"}'

# reuse the cookie jar on subsequent calls
curl -b cookies.txt https://example.com/api/resource/ToDo
```

### CSRF for cookie-authenticated writes

Unsafe methods (`POST`, `PUT`, `DELETE`, `PATCH`) made with a **session cookie**
are CSRF-protected. Send the session's CSRF token in the `X-Frappe-CSRF-Token`
header (it's available client-side as `frappe.csrf_token`). Token/OAuth requests
are exempt, since CSRF only applies to cookie-based sessions.

```bash
curl -b cookies.txt -X POST https://example.com/api/resource/ToDo \
  -H "X-Frappe-CSRF-Token: <token>" \
  -H "Content-Type: application/json" \
  -d '{"description": "Buy milk"}'
```

Log out with:

```bash
curl -b cookies.txt -X POST https://example.com/api/method/logout
```

## Checking who you are

A quick way to confirm your credentials work:

```bash
curl https://example.com/api/method/frappe.auth.get_logged_user \
  -H "Authorization: token <api_key>:<api_secret>"
```

It returns the resolved user; `Guest` means authentication didn't take effect.

## See also

- [OAuth2](/security/oauth2): for third-party apps acting on behalf of users
- [Permissions in code](/server-side/permissions-in-code): what an authenticated user can access
- [Overview](/rest-api/overview): endpoint structure
