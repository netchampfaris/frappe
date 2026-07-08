---
title: OAuth2
---

# OAuth2

Frappe speaks OAuth 2.0 in both directions:

- As an **authorization server (provider)**: let third-party apps act on behalf
  of your users, with scoped access and revocable tokens. It also supports OpenID
  Connect, so Frappe can be an identity provider.
- As a **client**: call another OAuth-protected API from your Frappe app using
  the **Connected App** DocType.

For server-to-server scripts you control, an [API key and secret](/rest-api/authentication)
is simpler. Reach for OAuth when a separate application needs delegated access to a
user's data.

## Frappe as an OAuth2 provider

### Endpoints

The provider endpoints are whitelisted methods (see
`frappe/integrations/oauth2.py`):

| Purpose       | Endpoint                                                  |
| ------------- | --------------------------------------------------------- |
| Authorization | `/api/method/frappe.integrations.oauth2.authorize`        |
| Token         | `/api/method/frappe.integrations.oauth2.get_token`        |
| Userinfo      | `/api/method/frappe.integrations.oauth2.openid_profile`   |
| Revocation    | `/api/method/frappe.integrations.oauth2.revoke_token`     |
| Introspection | `/api/method/frappe.integrations.oauth2.introspect_token` |

For OpenID Connect, the discovery document is served at
`/.well-known/openid-configuration`, and (when enabled in **OAuth Settings**) the
RFC 8414 metadata at `/.well-known/oauth-authorization-server`. ID tokens are
signed with `HS256`.

### Registering a client

Create an **OAuth Client** record. The important fields:

- **App Name**: display name shown on the consent screen.
- **Redirect URIs**: a **space-separated** allowlist. The `redirect_uri` in a
  request must match one of these **exactly**. The validator splits this field on
  spaces (`validate_redirect_uri` in `frappe/oauth.py`), so put each URI on the
  same line separated by a single space, not on separate lines.
- **Default Redirect URI**: used when none is supplied.
- **Scopes**: space-separated. Include `openid` to enable OIDC.
- **Grant Type** / **Response Type**: `Authorization Code` / `Code` for the
  standard web flow.
- **Skip Authorization**: skip the consent screen for trusted clients.

Saving the client gives you a **Client ID** and **Client Secret**.

### Authorization Code flow

The supported (and recommended) flow is authorization code; the implicit `token`
response type is intentionally not advertised in the server metadata. PKCE is
supported.

**1. Send the user to the authorization endpoint.** If they're not logged in,
Frappe redirects them to log in first, then shows a consent screen (unless skipped):

```text
https://example.com/api/method/frappe.integrations.oauth2.authorize
  ?client_id=<client_id>
  &response_type=code
  &redirect_uri=https://yourapp.com/callback
  &scope=openid%20all
  &state=<random_state>
```

**2. Frappe redirects back** to your `redirect_uri` with a `code` (and your
`state`):

```text
https://yourapp.com/callback?code=<authorization_code>&state=<random_state>
```

**3. Exchange the code for tokens** at the token endpoint:

```bash
curl -X POST https://example.com/api/method/frappe.integrations.oauth2.get_token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=<authorization_code>" \
  -d "redirect_uri=https://yourapp.com/callback" \
  -d "client_id=<client_id>" \
  -d "client_secret=<client_secret>"
```

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "scope": "openid all",
  "id_token": "..."
}
```

**4. Call the API** with the access token as a bearer token:

```bash
curl https://example.com/api/resource/ToDo \
  -H "Authorization: Bearer <access_token>"
```

The request runs as the user who authorized the client, limited to the granted
scopes (validated in `frappe.auth.validate_oauth`).

### PKCE

Public clients (mobile and single-page apps that can't keep a secret) should use
PKCE. Add two params to the authorization request in step 1:

- `code_challenge_method`: `S256` (recommended) or `plain`.
- `code_challenge`: for `S256`, the URL-safe base64 of `sha256(code_verifier)`;
  for `plain`, the `code_verifier` itself. See
  [RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636#appendix-A).

Then send the matching `code_verifier` (the original random string) when you
exchange the code in step 3:

```bash
curl -X POST https://example.com/api/method/frappe.integrations.oauth2.get_token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code" \
  -d "code=<authorization_code>" \
  -d "redirect_uri=https://yourapp.com/callback" \
  -d "client_id=<client_id>" \
  -d "code_verifier=<code_verifier>"
```

Only `S256` is advertised in the server metadata
(`code_challenge_methods_supported: ["S256"]`).

### Refreshing and revoking

Refresh an expired access token:

```bash
curl -X POST https://example.com/api/method/frappe.integrations.oauth2.get_token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token" \
  -d "refresh_token=<refresh_token>" \
  -d "client_id=<client_id>" \
  -d "client_secret=<client_secret>"
```

Revoke a token:

```bash
curl -X POST https://example.com/api/method/frappe.integrations.oauth2.revoke_token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=<access_or_refresh_token>"
```

Revocation always returns an empty body with HTTP 200, even for an unknown token.

### Introspecting a token

Check whether a token is active and read its metadata. Send the token and an
optional `token_type_hint` (`access_token` or `refresh_token`, defaults to
`access_token`):

```bash
curl -X POST https://example.com/api/method/frappe.integrations.oauth2.introspect_token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "token=<access_or_refresh_token>" \
  -d "token_type_hint=access_token"
```

For an active token it returns `client_id`, `trusted_client`, `active`, `exp`,
and `scope`. When the token carries the `openid` scope, the userinfo claims
(`sub`, `name`, `email`, `picture`, `roles`, `iss`, and so on) are included too:

```json
{
  "client_id": "<client_id>",
  "trusted_client": 1,
  "active": true,
  "exp": 1619523326,
  "scope": "openid all",
  "sub": "1234567890",
  "name": "J. Doe",
  "email": "j@doe.com",
  "roles": ["System Manager"],
  "iss": "https://example.com"
}
```

Otherwise it returns `{ "active": false }`.

### Userinfo (OpenID Connect)

With the `openid` scope, fetch the standard profile claims:

```bash
curl https://example.com/api/method/frappe.integrations.oauth2.openid_profile \
  -H "Authorization: Bearer <access_token>"
```

Returns `sub`, `name`, `email`, `picture`, `roles`, and `iss`.

### Decoding the ID token

When the `openid` scope is granted, the token response includes an `id_token`.
It is a JWT signed with the client's **client secret** using `HS256`
(`finalize_id_token` in `frappe/oauth.py`). Verify and read it with PyJWT:

```python
import jwt

payload = jwt.decode(
    id_token,
    key=client_secret,
    audience=client_id,
    algorithms=["HS256"],
)
print(payload)
```

The claims:

| Claim     | Description                                            |
| --------- | ------------------------------------------------------ |
| `aud`     | The client ID the token was issued for.                |
| `iss`     | The Frappe server URL.                                 |
| `sub`     | The user's `frappe` social login `userid`.             |
| `iat`     | Issued-at time.                                        |
| `exp`     | Expiry, `iat` plus the access token lifetime.          |
| `at_hash` | Hash of the access token.                              |
| `nonce`   | Echoed back if a `nonce` was sent in the auth request. |

With the `openid` scope the userinfo claims (`name`, `given_name`,
`family_name`, `email`, `picture`, `roles`) are merged in as well.

### Dynamic client registration

If **OAuth Settings &gt; Enable Dynamic Client Registration** is on, clients can
self-register (RFC 7591) by POSTing metadata to
`/api/method/frappe.integrations.oauth2.register_client`; the response includes a
freshly issued `client_id` and `client_secret`.

## Frappe as an OAuth2 client

To call an external OAuth-protected API _from_ Frappe, use the **Connected App**
DocType, Frappe's built-in OAuth client. It stores per-user tokens in a
**Token Cache** and refreshes them automatically. See
[Connected Apps](/rest-api/connected-apps) for setup and usage.

## See also

- [Connected Apps](/rest-api/connected-apps): using Frappe as an OAuth2 client
- [Authentication](/rest-api/authentication): API keys and bearer tokens
- [Whitelisted Methods](/server-side/whitelisted-methods): how these endpoints are exposed
- [Overview](/rest-api/overview): REST endpoint structure
