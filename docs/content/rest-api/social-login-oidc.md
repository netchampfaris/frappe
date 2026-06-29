---
title: Social Login OIDC
---

# Social Login OIDC

Social login lets a user sign in to your site with an external identity provider
like Google, GitHub, or any OpenID Connect (OIDC) server. Frappe acts as the
OAuth2 client here: it sends the user to the provider, gets back an access token,
reads the user's profile, and logs them in (creating the user if sign-ups are
allowed).

You configure each provider with a **Social Login Key** DocType. Frappe ships
with presets for Google, GitHub, Facebook, Office 365, Salesforce, Frappe,
fairlogin, and Keycloak, and you can add your own.

## Add a provider

Create a new **Social Login Key**. Pick a value in **Social Login Provider** to
load a preset, or pick **Custom** to fill everything in by hand. The fields map
to a standard OAuth2 / OIDC flow:

- **Provider Name**: the document name (it gets scrubbed, so "My SSO" becomes
  `my_sso`). This name shows up in the callback URL.
- **Client ID** and **Client Secret**: the credentials the provider gave you.
- **Authorize URL**: where Frappe sends the user to log in.
- **Access Token URL**: where Frappe exchanges the code for a token.
- **API Endpoint**: the userinfo endpoint Frappe calls to read the profile.
- **Redirect URL**: the callback on your site that handles the response.
- **Base URL** and **Custom Base URL**: set a base URL when the authorize,
  token, and userinfo paths are relative to a single host (for example
  Keycloak).
- **Auth URL Data**: extra query params sent to the authorize URL, as JSON.
  For OIDC this includes the scope, for example
  `{"response_type": "code", "scope": "openid"}`.
- **API Endpoint Args**: extra query params for the userinfo call, as JSON.

Turn on **Enable Social Login** to show the provider's button on the login page.
Client ID and Client Secret are required before you can enable it.

After you save, register the redirect URL with the provider. For a provider named
`my_sso`, set the redirect URL to:

```text
https://example.com/api/method/frappe.integrations.oauth2_logins.custom/my_sso
```

The built-in providers use their own callback methods instead, for example
`frappe.integrations.oauth2_logins.login_via_google`.

## How the login works

Each provider has a whitelisted callback in
`frappe/integrations/oauth2_logins.py`. The provider redirects the user back to
that callback with a `code` and `state`, and the callback finishes the login:

```python
@frappe.whitelist(allow_guest=True)
def login_via_google(code: str, state: str):
    login_via_oauth2("google", code, state, decoder=decoder_compat)
```

Custom providers go through one shared callback that looks up your Social Login
Key by name:

```python
@frappe.whitelist(allow_guest=True)
def custom(code: str, state: str):
    # called as .../oauth2_logins.custom/<provider>
    path = frappe.request.path[1:].split("/")
    if len(path) == 4 and path[3]:
        provider = path[3]
        if frappe.db.exists("Social Login Key", provider):
            login_via_oauth2(provider, code, state, decoder=decoder_compat)
```

`login_via_oauth2` reads the user profile from the API Endpoint and matches the
user by email. Providers that return the profile inside the OIDC ID token (like
Office 365) use `login_via_oauth2_id_token` instead, which decodes the
`id_token` rather than calling a separate userinfo endpoint.

## OpenID Connect providers

Any OIDC-compliant server works as a Custom provider. Add `openid` to the scope
in **Auth URL Data**, point **Authorize URL**, **Access Token URL**, and
**API Endpoint** at the provider's `authorization_endpoint`, `token_endpoint`,
and `userinfo_endpoint` (you can find these at the provider's
`/.well-known/openid-configuration`).

By default Frappe matches the user by email. If the provider returns the
identity under a different claim, set **User ID Property** to that claim name.
Keycloak's preset, for example, uses `preferred_username`.

## Sign-ups

The **Sign-ups** field controls whether a successful login can create a new user:

- **Allow**: create the user if they don't exist yet.
- **Deny**: only let existing users log in.
- Blank: fall back to the site's global sign-up setting (`is_signup_disabled`).

This is checked by `provider_allows_signup` in
`frappe/integrations/doctype/social_login_key/social_login_key.py`.

## See also

- [OAuth2](/rest-api/oauth2) for using Frappe as an OAuth2 provider or client
- [Connected Apps](/rest-api/connected-apps) for calling external OAuth2 APIs
- [Authentication](/rest-api/authentication) for API keys and bearer tokens
