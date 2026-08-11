---
title: Connected Apps
---

# Connected Apps

A **Connected App** is how Frappe acts as an OAuth2 _client_. Use it when your
server code needs to call an external API that is protected by OAuth2, such as a
user's Google Drive or a partner's REST API. Frappe runs the authorization flow,
stores the tokens per user in a **Token Cache** (document), and refreshes expired access
tokens for you.

This is different from being an OAuth2 _provider_. For letting other apps log in
to your site, see [OAuth2](/security/oauth2).

## Set up a Connected App

Create a **Connected App** record and fill in the details the provider gave you:

- **Provider Name**: a label for the app.
- **Client ID** and **Client Secret**: your credentials with the provider.
- **Authorization URI**: where the user is sent to grant access.
- **Token URI**: where Frappe exchanges the code for tokens.
- **Userinfo URI**, **Revocation URI**, **Introspection URI**: optional, set
  them if the provider supports them.
- **Scopes**: the scopes you need (child table).
- **Query Parameters**: extra params added to the authorization and token
  requests (child table).

Frappe fills in **Redirect URI** for you when you save. It points at the
Connected App callback on your site:

```text
https://example.com/api/method/frappe.integrations.doctype.connected_app.connected_app.callback/<app-name>
```

Register that exact URI with the provider.

If the provider publishes an OpenID Connect discovery document, paste its URL
into **OpenID Configuration** and use the "Get OpenID Configuration" action to
pull in the endpoints automatically.

If your integration ships its own settings doctype, add a Link field to
**Connected App** on it. An admin can then create the Connected App, enter the
credentials, and link it, and your code looks it up from your settings:

```python
import frappe

settings = frappe.get_single("My Integration Settings")
app = frappe.get_doc("Connected App", settings.connected_app)
```

## Authorize a user

A Connected App stores one token per user. The first time a user needs access,
send them through the web application flow. `get_user_token` returns a cached
token if one exists, otherwise it redirects the user to the provider to
authorize:

```python
import frappe

app = frappe.get_doc("Connected App", "my-provider")
# redirects the user to the provider if they have not authorized yet
app.get_user_token(user="jane@example.com", success_uri="/app/home")
```

The provider redirects back to the callback, which exchanges the code for tokens
and saves them in a **Token Cache** named `<app-name>-<user>`. The `state` value
is validated against the one stored at the start of the flow.

You can also start the flow yourself to get just the authorization URL:

```python
url = app.initiate_web_application_flow(user="jane@example.com", success_uri="/app/home")
```

## Make authenticated requests

Once a user is authorized, get an OAuth2 session and use it like a
`requests.Session`. The session attaches the bearer token and refreshes it
automatically when it expires:

```python
import frappe

app = frappe.get_doc("Connected App", "my-provider")
session = app.get_oauth2_session(user="jane@example.com")

resp = session.get(app.userinfo_uri)
resp.raise_for_status()
data = resp.json()
```

To check whether a user has a usable token before you try to call the API:

```python
from frappe.integrations.doctype.connected_app.connected_app import has_token

if has_token("my-provider", "jane@example.com"):
    ...
```

`get_active_token` returns the cached token and refreshes it if it has expired,
returning `None` if the refresh fails.

## Client credentials flow

For server-to-server access where there is no user, use the client credentials
(backend application) flow. This gets a token for the app itself:

```python
app = frappe.get_doc("Connected App", "my-provider")
token_cache = app.get_backend_app_token()
```

The token is stored under an empty user key and reused until it expires.

## See also

- [OAuth2](/security/oauth2) for using Frappe as an OAuth2 provider
- [Social Login OIDC](/security/social-login-oidc) for logging users in with an external provider
- [Third Party Integrations](/rest-api/third-party-integrations) for the built-in integrations
