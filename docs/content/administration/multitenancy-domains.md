---
title: Multitenancy Domains
---

# Multitenancy and Domains

One bench can serve many sites. Each site has its own database and files, and
nginx decides which site to serve based on the hostname in the request. There are
two ways to map hostnames to sites: by port (handy in development) or by DNS (the
production setup).

## How a request finds its site

When a request comes in, the framework picks the site by the `Host` header. So a
request for `customer-a.com` is served by the site folder named `customer-a.com`,
and `customer-b.com` by the folder named `customer-b.com`. The site name and the
hostname need to match.

In development, `bench start` instead reads the default site (set with
`bench use`), which is why local site names usually end in `.localhost`.

## DNS-based multitenancy

For production, turn on DNS multitenancy so nginx routes by hostname:

```bash
bench config dns_multitenant on
sudo bench setup nginx
sudo systemctl reload nginx
```

With this on, you create one site per domain, named after the domain:

```bash
bench new-site customer-a.com
bench new-site customer-b.com
```

Point each domain's DNS at the server, regenerate nginx, and reload. nginx now
serves each site by its hostname.

## Adding a custom domain to a site

Sometimes a site has a primary name but should also answer on another domain (for
example a site `customer-a.com` that should also serve `shop.customer-a.com`). Add
the extra domain to the site, then regenerate nginx:

```bash
bench setup add-domain shop.customer-a.com --site customer-a.com
sudo bench setup nginx
sudo systemctl reload nginx
```

Make sure the new domain's DNS points at the same server. After nginx reloads,
requests for the added domain are served by that site. To serve the domain over
HTTPS, request a certificate that covers it (see [HTTPS](/administration/https)).

## Port-based multitenancy

If you cannot use DNS (for instance, several sites on one machine reached by
different ports), Bench supports port-based routing instead:

```bash
bench config dns_multitenant off
bench --site customer-a.com set-config port 8000
sudo bench setup nginx
sudo systemctl reload nginx
```

DNS-based routing is the usual choice; reach for ports only when DNS is not an
option.
