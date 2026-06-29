---
title: Production Setup
---

# Production Setup

`bench start` is fine for development, but it is not how you run a site in
production. In production you run the web server, background workers, scheduler,
and Redis under a process manager (supervisor), and you put nginx in front to
serve static files and proxy requests. Bench can generate and apply all of that
config for you.

```bash
sudo bench setup production frappe
```

Run this from inside the bench directory. The argument is the Linux user that
should own the processes (often the user that created the bench). The command
needs `sudo` because it writes to system locations and reloads system services.

## What `setup production` does

It runs three things together:

1. Generates a supervisor config so the processes start on boot and restart if
   they crash.
2. Generates an nginx config that serves the site and proxies dynamic requests to
   the web and realtime servers.
3. Enables the supervisor and nginx services and reloads them.

You can also run the pieces on their own:

```bash
sudo bench setup supervisor      # write config/supervisor.conf
sudo bench setup nginx           # write config/nginx.conf
sudo bench setup redis           # write the redis configs
```

After generating supervisor config, reload it so the new processes start:

```bash
sudo supervisorctl reread
sudo supervisorctl update
```

## The processes that run

In production the Procfile is not used. Supervisor runs these instead:

- `frappe-web`: the gunicorn web server. The worker count comes from
  `gunicorn_workers` in `common_site_config.json`.
- `frappe-schedule`: the scheduler, which enqueues scheduled jobs.
- `frappe-worker`: background job workers, one set per queue. The count comes from
  `background_workers`.
- `frappe-socketio`: the realtime (websocket) server.
- `redis-cache` and `redis-queue`: the Redis instances.

## Tuning worker counts

Set the counts in `common_site_config.json`, then regenerate supervisor config:

```bash
bench set-config -g gunicorn_workers 8
bench set-config -g background_workers 4
sudo bench setup supervisor
sudo supervisorctl reread
sudo supervisorctl update
```

A common starting point for gunicorn is `(2 * CPU cores) + 1`. Adjust based on
the load you see in [Monitoring](/administration/monitoring).

## Applying changes after an update

When you change worker counts, ports, or add sites, regenerate the affected
config and reload:

```bash
sudo bench setup nginx
sudo systemctl reload nginx
```

To restart all the bench processes (for example after deploying code), use:

```bash
bench restart
```

## Next steps

- [HTTPS](/administration/https): get a free TLS certificate
- [Multitenancy and Domains](/administration/multitenancy-domains): serve many sites from one bench
- [Zero Downtime Migrations](/administration/zero-downtime-migrations): deploy without dropping requests
