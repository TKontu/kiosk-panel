# Wall Panel

A wall-mounted kiosk display. A headless HP EliteDesk boots straight into a
full-screen Chromium showing web views (a Frigate camera now; weather /
electricity / Grafana planned), in **portrait**, switched by a **time-of-day
schedule** and an existing **Zigbee remote**. All control is over MQTT via the
homelab's Raspberry Pi.

> **Status: built and running.** This repo is the source of truth for the
> browser-side shell, the Node-RED flow, and the design/ops docs. Some state
> lives on the kiosk in system files (see `architecture.md` → *System files*).

## Start here (for a fresh maintainer, human or Claude Code)

1. **`architecture.md`** — the as-built design, data flow, MQTT topics, and the
   hard-won display/WiFi/timezone gotchas. Read this first.
2. **`todo.md`** — what's done vs. what's open, with the exact next steps.
3. **This file** — deployment and day-to-day operation.

## Hardware / topology

- **Kiosk:** HP EliteDesk 800 G4 DM, Ubuntu Server, hostname `ubuntukiosk`.
- **Display:** Samsung Space 32", portrait (mounted 90° left), via a **passive
  DP→HDMI adapter** (marginal — see `architecture.md`). Running 1080p@60.
- **Broker + automation:** a Raspberry Pi — Mosquitto (MQTT 1883 + websockets
  9001), Node-RED, zigbee2mqtt.
- **Control:** a Zigbee remote (arrows + on/off).
- **Content:** Frigate (camera `tapo310`), future dashboards.

Addresses are deliberately absent from this repo: `<broker-host>`,
`<frigate-host>` and `0x<remote-ieee>` below are placeholders for your own, and
the real values live only in the gitignored `config.js`.

## Repo layout

```
wall-panel/
├── readme.md                   # this file
├── LICENSE                     # MIT
├── docs/
│   ├── architecture.md         #   as-built design + ops gotchas
│   └── todo.md                 #   done vs. remaining
├── shell/                      # the browser kiosk page (deploy to /opt/wallpanel/shell/)
│   ├── index.html              #   skeleton, loads the scripts in order
│   ├── config.example.js       #   copy to config.js and fill in (this one IS tracked)
│   ├── config.js               #   creds + LAN hosts + places  (SECRET, gitignored)
│   ├── views.js                #   VIEWS map — THE view list; add views here
│   ├── photo.html              #   full-bleed still image view (media/image.jpg)
│   ├── overview.html           #   the dial: spot price + weather on one clock
│   ├── media/                  #   images used by views (image.jpg — not tracked)
│   ├── schedule.js             #   time-of-day schedule
│   ├── app.js                  #   MQTT + schedule + override logic
│   ├── style.css               #   overlay/base styling
│   └── mqtt.min.js             #   bundled MQTT.js (on the kiosk already; not tracked)
└── node-red/
    └── wallpanel-nodered-flow.json   # Zigbee remote → panel view commands
```

## How it works (one paragraph)

Chromium loads `shell/index.html`, which connects to the Pi's broker over
websockets as the `wallpanel` user. `app.js` runs a clock-driven schedule
(`schedule.js`) that picks a default view per time-of-day, swapping an
`<iframe>` to the URL from `views.js`. A press on the Zigbee remote is
translated by the **Node-RED flow** into a publish on `wallpanel/view/set`
(manual override, held until the period ends) or a clear of `wallpanel/override`
(resume schedule). "Screen off" is a black page, not a real power-off. See
`architecture.md` for the full model, topics, and gotchas.

## Deploy / update the shell

The shell files live on the kiosk at **`/opt/wallpanel/shell/`** (owned by
`user`). Current workflow is WinSCP drop; the intended better workflow is Git
(see `todo.md`).

1. Copy the `shell/` files to `/opt/wallpanel/shell/` (don't overwrite
   `mqtt.min.js` — it's already there).
2. `cp config.example.js config.js` and fill in the broker, the `wallpanel`
   password, your `hosts` and your `places`, then `chmod 600 config.js`.
   Nothing else in the repo holds an address, a credential or a coordinate.
3. Apply: `sudo systemctl restart getty@tty1` (re-reads everything cleanly).

**Add a view:** add a line to `views.js` (`name: { url, rotate }`) and redeploy
the shell. That is the whole job — the arrow rotation is derived from `views.js`
at runtime, so **Node-RED never needs touching**. Landscape sources (cameras) use
`rotate: true`; to keep a view out of the arrow rotation give it `cycle: false`.

## Deploy / update the Node-RED flow

Import `node-red/wallpanel-nodered-flow.json` into Node-RED on the Pi
(☰ → Import), then two edits before Deploy:

- **Point both MQTT nodes at the existing authenticated broker config** (the
  broker needs auth; the bundled broker node has none — it ships as
  `BROKER_HOST`).
- **Set the `zigbee2mqtt` input topic to your remote's IEEE address** (it ships
  as `zigbee2mqtt/REMOTE_IEEE`).

You should only ever have to do this **once**. The flow maps remote buttons to
*intents* (`next` / `prev` / `blank`) and contains no view names, so adding or
removing views never requires re-importing it. See `architecture.md` →
*Physical control*.

## Operate it (MQTT cheatsheet)

From anything that can reach the broker (use the `wallpanel` creds):

```bash
# force a view by name (manual override, held for the current period):
mosquitto_pub -h <broker-host> -u wallpanel -P '***' -t wallpanel/view/set -m tapo

# step the rotation / blank, without naming a view (what the remote sends):
mosquitto_pub -h <broker-host> -u wallpanel -P '***' -t wallpanel/command -m next
mosquitto_pub -h <broker-host> -u wallpanel -P '***' -t wallpanel/command -m prev
mosquitto_pub -h <broker-host> -u wallpanel -P '***' -t wallpanel/command -m blank

# clear the override, resume the schedule:
mosquitto_pub -h <broker-host> -u wallpanel -P '***' -t wallpanel/override -m "" -r

# what's on screen right now, and what the rotation contains:
mosquitto_sub -h <broker-host> -u wallpanel -P '***' -t wallpanel/view/current -t wallpanel/views -v

# watch panel status / the remote:
mosquitto_sub -h <broker-host> -u wallpanel -P '***' -t 'wallpanel/#' -v
mosquitto_sub -h <broker-host> -u wallpanel -P '***' -t 'zigbee2mqtt/0x<remote-ieee>' -v
```

Remote: arrows cycle content views, `off` blanks, `on` resumes the schedule.

## Known-open / watch items (see todo.md for detail)

- **Monitor blackout** — believed fixed (WiFi power-save + HDMI-1.4 OSD +
  clean session); **watch for recurrence** and diagnose with the `xrandr`
  while-black test in `architecture.md`.
- **Margin is a display setting, not a bill.** `overview.html?margin=0.5` is
  snt/kWh **VAT-inclusive**; change it if your contract changes. It is not shown
  on screen, and it does not know about transfer fees or any monthly basic
  charge.
- **Passive adapter is marginal** — a DP→Mini-DP cable (the Space has Mini-DP
  in) is the clean long-term fix; not yet done.
- **Git workflow** for `/opt/wallpanel` not yet set up (WinSCP for now).

## License

MIT — see [LICENSE](LICENSE). The bundled `mqtt.min.js` is MQTT.js, MIT-licensed
separately; it is not tracked here.
