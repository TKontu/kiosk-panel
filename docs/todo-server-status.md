# View: homelab / server status

Temperatures, capacity and alerts across the homelab.

**Status:** not started. Depends on the tiles renderer and, ideally, alert
takeover (`todo-view-mechanisms.md`).

---

## Resist the gauge dashboard

CPU, RAM and GPU graphs are what you open Grafana for **while investigating**. On
a wall they are wallpaper: they move constantly, mean nothing at a glance, and
you stop seeing them within a week.

The wall version should be **boring 99 % of the time and loud when it is not**:

```
   all good - 14 services, 3 hosts
```

...replaced by the exception when there is one:

- disk nearly full (the most common homelab failure)
- SMART warning on a drive
- a container or service down
- **last night's backup failed** - low frequency, high consequence, and the one
  nobody notices until they need it
- a host unreachable
- thermal throttling

Capacity numbers do belong here, but as a small strip rather than the headline,
and only the ones with a real ceiling: pool free space, not instantaneous CPU.

## Data path

Everything here is LAN-side, so it is the Node-RED -> retained MQTT path
(`todo-view-mechanisms.md`). Options for the collector end:

- Node-RED polling each host over SSH or an exporter endpoint
- an existing Prometheus / Netdata / Glances instance, with Node-RED subscribing
  to its alert webhook and republishing
- system temperature sensors already on the broker

Publish a single retained summary the panel can render without logic - for
example `wallpanel/status/summary` carrying `{ok, services, hosts}` plus a list
of current exceptions. Keeping the judgement on the Pi rather than in the page
means the same summary can drive an alert takeover and a phone notification
later.

## Relationship to the alert takeover

This view and the takeover are the same idea at two urgencies. A failed backup
belongs in this view; a host on fire belongs on the screen immediately whatever
else is showing. Build the takeover first and this view becomes the calm
"everything else" list.
