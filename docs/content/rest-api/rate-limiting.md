---
title: Rate Limiting
---

# Rate Limiting

Frappe has two separate rate limiters:

- A site-wide limiter based on **processing time**, configured in site config.
- A per-endpoint **request-count** limiter you apply with the `@rate_limit`
  decorator.

Both store their counters in Redis cache. When a limit is hit, the client gets an
HTTP `429 Too Many Requests`.

## Site-wide rate limiting

The site-wide limiter caps how much total request processing time all requests
can use within a time window. It is off unless you set `rate_limit` in `site_config.json`:

```json
{
  "rate_limit": {
    "limit": 600,
    "window": 3600
  }
}
```

`window` is the window length in seconds. `limit` is the total request
processing time, in seconds, allowed across that window. The example above allows
600 seconds of request processing per hour. The limiter tracks the accumulated
duration of requests in the current window, so a few slow requests count more
than many fast ones.

It runs in `frappe/rate_limiter.py`: `apply()` rejects the request if the window
is already over budget, and `update()` adds the request's duration to the counter
after it finishes. Every response carries the current rate-limit status in its
headers:

```text
X-RateLimit-Limit: 600000000
X-RateLimit-Remaining: 540000000
X-RateLimit-Reset: 2400
```

| Header                  | Description                                                       |
| ----------------------- | ----------------------------------------------------------------- |
| `X-RateLimit-Limit`     | Processing time allowed in a window, in microseconds.             |
| `X-RateLimit-Remaining` | Processing time left in the current window, in microseconds.      |
| `X-RateLimit-Reset`     | Seconds until the current window resets.                          |
| `Retry-After`           | Seconds until the window resets. Sent only on a rejected request. |

When the window is over budget the request gets a `429` with the same headers
plus `Retry-After`.

## Per-endpoint rate limiting

To cap the number of requests to a single endpoint, use the `@rate_limit`
decorator from `frappe.rate_limiter`. This limits requests per endpoint to
`limit` within `seconds`:

```python
import frappe
from frappe.rate_limiter import rate_limit

@frappe.whitelist(allow_guest=True)
@rate_limit(key="email", limit=5, seconds=60 * 60)
def request_otp(email: str):
    ...
```

Parameters:

- `key`: a field from the form data used to make each caller unique, for example
  `email` or `web_form`. Optional.
- `limit`: the maximum number of requests in the window. Can be an integer or a
  callable that returns one (handy when the limit comes from a setting).
- `seconds`: the window length in seconds. Defaults to one day.
- `methods`: limit only these HTTP methods. Defaults to `"ALL"`.
- `ip_based`: include the caller's IP in the identity. Defaults to `True`.

The identity that gets counted is built from the IP and the `key` value. With
both set, callers are tracked per IP and per key value. You need at least one of
`key` or `ip_based`, otherwise the call throws. Going over the limit raises
`frappe.RateLimitExceededError`, which is returned to the client as a `429`.

## Website rate limiting

Public website endpoints use the same decorator. Web forms and help articles cap
submissions per caller, for example:

```python
@rate_limit(key="web_form", limit=10, seconds=60)
def accept(web_form, data):
    ...
```

You can see these in `frappe/website/doctype/web_form/web_form.py` and
`frappe/website/doctype/help_article/help_article.py`. Apply the same decorator
to your own whitelisted website methods to throttle abuse.

## See also

- [Authentication](/rest-api/authentication) for API keys and bearer tokens
- [Calling Methods](/rest-api/calling-methods) for whitelisted method endpoints
