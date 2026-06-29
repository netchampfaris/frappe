---
title: HTTPS
---

# HTTPS

Once a site is reachable over a real domain, you want it served over HTTPS. Bench
wraps Certbot to get a free certificate from Let's Encrypt and wire it into the
generated nginx config. You need a production setup first (see
[Production Setup](/administration/production-setup)).

```bash
sudo bench setup lets-encrypt mysite.com
```

## Before you run it

A few things must be true or the certificate request will fail:

- The site's domain points at this server (an A record for `mysite.com`).
- Port 80 is open to the internet, Let's Encrypt validates over HTTP.
- You have already run `bench setup production`, so nginx is serving the site.
- The site name in the bench matches the domain you are requesting, or you have
  added it as a custom domain (see
  [Multitenancy and Domains](/administration/multitenancy-domains)).

## What it does

`bench setup lets-encrypt` runs Certbot to obtain the certificate, then
regenerates the nginx config so the site listens on 443 with the certificate and
redirects HTTP to HTTPS. It also installs a renewal hook so the certificate
renews automatically before it expires.

## Renewal

Certbot installs a system timer (or cron entry) that renews certificates
automatically. To renew by hand and reload nginx:

```bash
sudo certbot renew
sudo systemctl reload nginx
```

## Wildcard certificates

For DNS-based multitenancy where many subdomains share one bench, you want a
wildcard certificate (`*.mysite.com`). Wildcards require a DNS challenge, so use
the dedicated command, which runs Certbot with `certonly --manual
--preferred-challenges=dns`:

```bash
sudo bench setup wildcard-ssl '*.mysite.com' --email you@example.com
```

This needs `dns_multitenant` enabled in your bench config. Run
`bench setup wildcard-ssl --help` for options.
