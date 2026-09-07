# TODO / Status

> **The system is built and running.** This file is split into **Remaining
> work** (what a maintainer would act on) and **Done** (build history, kept as
> reference). See `architecture.md` for design + gotchas, `readme.md` for
> deploy/operate.

---

# Remaining work

## Content — the main open work

All views render **portrait (1080×1920)** — design tall/narrow. Add each to
`views.js` (`name: { url, rotate }`) and redeploy the shell — that's the whole
job now; the arrow rotation is derived from `views.js` at runtime and Node-RED
holds no view names. Use `cycle: false` to keep a view out of the rotation.

Each idea below has its own `todo-*.md` with the design, the data source and
whether it is even reachable from the panel's `file://` origin. **Check the
feasibility note before starting one** — that constraint has already ruled out
several otherwise-obvious sources.

### Build this first

- [ ] **[Shared view mechanisms](todo-view-mechanisms.md)** — conditional views
      are **done**; the alert takeover and the generic tiles renderer are still
      open. The tiles renderer alone covers two of the views below.

### Ready to build

- [ ] **[3D printer](todo-printer.md)** — camera, temperatures, progress,
      failure. Fully designed; blocked only on installing the OctoPrint-MQTT
      plugin. *Set its base topic under `wallpanel/` or the planned broker ACL
      will silently break it.*
- [ ] **[Indoor sensors](todo-sensors.md)** — already on the broker via
      zigbee2mqtt; mostly a rendering job. CO₂ is the metric that changes
      behaviour.

### Wants a decision or a device

- [ ] **[Homelab status](todo-server-status.md)** — boring 99 % of the time and
      loud when it is not. Not a gauge dashboard.
- [ ] **[HSL departures](todo-transit.md)** — probably the highest
      value-per-pixel item here. Needs a free Digitransit key, so it goes via
      Node-RED rather than a direct fetch.
- [ ] **[Consumption against price](todo-energy-use.md)** — needs a P1/HAN reader
      or clamp meter. The one view with a direct payback.
- [x] **[Agent canvas](todo-agent-canvas.md)** — panel side **built and
      deployed**; contract in [`agent-canvas-schema.md`](agent-canvas-schema.md).
      What remains is the broker ACL, the mediator and the agent-side tool, none
      of which live in this repo.
- [ ] **[Frigate events](todo-frigate-events.md)** — recent detections rather
      than a live feed. Frigate already publishes to MQTT.

### Sketches

- [ ] **[Smaller ideas](todo-small-views.md)** — daylight, door/window state,
      photo rotation, sauna, name day, Grafana embed. Also records what is
      deliberately **not** going on this panel, and why.

## Watch items (believed-fixed, confirm over time)

- [ ] **Monitor blackout** — believed fixed by WiFi power-save off + forcing the
      monitor's HDMI input to 1.4 in its OSD + clean session. **Watch for
      recurrence.** If it returns: run `DISPLAY=:0 xrandr | grep connected`
      *while black* — `connected` = monitor sleeping on a good signal (chase the
      OSD Eco/Auto-Power-Off setting); `disconnected` = adapter dropping the link
      (→ the DP→Mini-DP cable fix below). Also still worth doing: explicitly
      disable **Eco Saving Plus / Auto Power Off** in the Space's OSD.
- [ ] **getty respawn if X dies** — untested (low priority). Confirm the session
      relaunches if X (not just Chromium) is killed.

## Improvements / nice-to-haves

- [ ] **Node-RED flow import** — the view-agnostic flow
      (`node-red/wallpanel-nodered-flow.json`, buttons → `wallpanel/command`
      intents) is written and the shell already speaks it, but it has **not been
      imported on the Pi yet**. Until it is, the arrows still run the old
      hard-coded `["tapo","morning"]` cycle and can't reach `photo`. Import once
      and re-point both MQTT nodes at the authenticated broker config.
- [ ] **Git workflow for `/opt/wallpanel`** — put it in Gitea; edit locally,
      push, `git pull` on the kiosk instead of WinSCP. `.gitignore` `config.js`
      (secret) and `mqtt.min.js` (binary, already on host). This is the real fix
      for maintainability.
- [ ] **DP→Mini-DP cable** — the Space has a Mini DisplayPort input; a
      DP→Mini-DP cable removes the marginal passive adapter entirely (clean DP
      1.2, no HDMI-1.4 ceiling, likely kills any residual signal flakiness).
      Cheapest clean long-term fix. (Active DP→HDMI adapter is the second choice.)
- [ ] **Broker ACL** — restrict the `wallpanel` MQTT user to `wallpanel/#` only
      (its credential is visible in page source). Not urgent on a trusted LAN.
- [ ] **Watchdog** — alert if `wallpanel/status` goes `offline` (hook into
      existing homelab alerting / Node-RED).
- [ ] **Unattended-upgrades** — security patches, kiosk-safe (careful with
      Chromium/X restarts).
- [ ] Keep the **Wyse 3040** configured as a fallback driver.

## Deploy reminders (when editing)

- [ ] After importing the Node-RED flow: point **both MQTT nodes** at the
      existing authenticated broker config (bundled broker node has no creds).
      This import is a **one-time** step — the flow has no view names in it.
- [ ] `config.js` holds the secret → `chmod 600` after any redeploy.
- [ ] Apply shell changes with `sudo systemctl restart getty@tty1`.

## Parked / conditional

- [ ] If any target page refuses to be iframed (`X-Frame-Options`/CSP), switch
      that view (or all) to the CDP/remote-debugging approach in `architecture.md`.
- [ ] Truly borderless camera via go2rtc player page
      (`:1984/webrtc.html?src=tapo310` or proxied `:5000/live/`) — not pursued;
      force-dark on the Frigate app page was good enough.
- [ ] Image retention (LED monitor, low risk) — add slow view rotation only if
      it ever shows.

---

# Done (build history, reference)

## Views / control model
- [x] **Pastel colour ramp** — mint through butter to rose, replacing the
      saturated green/yellow/red. Better suited to a near-black surface: every
      stop is 6.7–14.2:1 against it, where the saturated ramp bottomed at 3.02:1
      and its burgundy end could be mistaken for the empty track. Watch butter
      against the expensive end when retuning — a salmon there measured dE 13.5,
      below the 15 normal-vision floor.
- [x] **Continuous colour ring + clock hands** — the ring is now 360 one-degree
      segments interpolated between quarter-hour centres, with no gaps between
      hours (the gaps were why it read as a tachometer). Colour is one ramp from
      dark green through yellow-green and amber to red and burgundy rather than
      three flat bands. Hands are tapered blades with a tail and hour markers are
      batons, not needles and hairlines.
- [x] **Dial refinements** — hour figures moved to the half-hour spoke (they are
      averages over the hour, not readings at the tick); the outer ring now
      carries a weather symbol with the temperature (1/2/3 drops or flakes by
      actual amount, sun/moon by real sunrise-sunset, moon at its true phase)
      instead of a millimetre figure.
- [x] **Weather and electricity merged into one `overview` dial** — the two
      answered the same question and you had to wait for the rotation to see the
      other. One 12-hour clock: hour-average prices where the numerals were, the
      15-minute spot price as the coloured bezel, that hour's temperature outside
      it (rainfall only when there is any), and one weather topic — condition,
      rain total, peak gusts — top right. `weather.html` and `electricity.html`
      are superseded but left in the tree.
- [x] **`electricity` view** — `electricity.html`, Finnish day-ahead spot price
      at the 15-minute market time unit, VAT-inclusive, plus a configurable
      retailer margin (`?margin=0.5`, snt/kWh). Source: spot-hinta.fi (the only
      free FI option found with both 15-min resolution and open CORS).
- [x] **Electricity redesigned as a working 12-hour clock** — replaced the column
      chart: a real clock face (rim, minute ticks, hour numerals inside, hour and
      minute hands on a hub) wrapped in a coloured price bezel; hour-average
      prices outside it, current price as a header hero, quarter-hours as colour
      banding within each wedge. Colour on fixed thresholds (green <10, yellow 10–20,
      red >20). Low/high/cheapest-2h stats and the source/VAT/margin footer
      line were dropped.
- [x] **Legibility pass on both data views.** The panel is 68.8 ppi (32" at
      1080×1920), so 22 px axis text is a 5.7 mm cap height — legible to about
      1.1 m, on a wall read from 2–3 m. Axis/label type is now 40 px in viewBox
      units (~10.4 mm, ~2.1 m) and the ink scale went `#5d6773` (3.32:1) →
      `#8794a3` (6.2:1) → `#bcc7d3` (11.1:1); two passes were needed because the
      first only fixed contrast and not size. Chart gutters widened to match,
      and stat qualifiers now stack under their value instead of crowding.
- [x] **`weather` view** — `weather.html`, day's forecast for a configurable
      location (Open-Meteo; places from `config.js`, or `?lat=&lon=&name=`).
      Temperature + feels-like, rain, wind/gusts/humidity, sunrise/sunset.
      Replaced the `morning` placeholder; the 06:00–08:00 schedule slot now
      points at it. Caches its last good response so a network blip shows stale
      numbers rather than a blank panel.
- [x] **`photo` view** — `photo.html` + `media/image.jpg`, full-bleed portrait
      (`object-fit: cover`). Opts out of Chromium's force-dark with
      `<meta name="color-scheme" content="dark">`, otherwise the kiosk's
      `--force-dark-mode` dims the artwork.
- [x] **View list / Node-RED decoupled.** The remote's buttons now publish
      *intents* (`wallpanel/command` = `next`/`prev`/`blank`) instead of view
      names; the shell resolves them against `views.js`, which is the single
      source of truth. Adding a view is a one-file edit — no flow re-import.
      Also removed the Node-RED `context.idx` cursor, which could desync from
      what was actually on screen; stepping is now relative to the live view.
- [x] Shell publishes `wallpanel/view/current` (retained, observability) and
      `wallpanel/views` (retained, the rotation) on connect/render.
- [x] **Stage-model renderer.** Views used to share one iframe whose geometry
      was mutated in place, so a 0°→−90° switch visibly rotated the *outgoing*
      view and then blinked. Each view now gets its own stage with its
      orientation baked in at creation and never changed; the incoming stage
      loads invisibly underneath and crossfades in (`--fade`, 550 ms) over a
      still-opaque outgoing stage. No visible rotation, no black gap.
      `rotate` is now degrees (0/90/−90/180; `true` still means −90).

## Display / signal path
- [x] Output is **`DP-1`**; **passive DP→HDMI adapter, HDMI 1.4 ceiling
      confirmed** (4K capped at 30 Hz in `xrandr`). Running **1080p@60**, stable.
- [x] Resolution pinned two ways: GRUB `video=DP-1:1920x1080@60` (also fixes text
      console) + `xrandr --mode` in `start-kiosk.sh`.
- [x] **Rotation at driver level** — `/etc/X11/xorg.conf.d/90-rotate.conf`
      `Option "Rotate" "right"` (portrait, mounted 90° left). Fixed a
      wrong-orientation flash vs. the old xrandr `--rotate`.
- [x] Console rotation `fbcon=rotate:1`; no-blank `consoleblank=0`. Full GRUB
      cmdline: `video=DP-1:1920x1080@60 consoleblank=0 fbcon=rotate:1`.
- [x] **Rule learned:** never set the mode live with `xrandr --mode` (corrupts
      the marginal link — ghosting/colour errors). Restart session or reboot.
- [x] 4K ruled out permanently; wall-mounted; running as-is.

## Base OS / first-boot
- [x] Ubuntu Server, hostname `ubuntukiosk`, static IP, SSH, `apt upgrade`.
- [x] Reuse existing user `user`; autologin mandatory (getty override).
- [x] Slow boot fixed — `eno1` `optional: true` in netplan (unplugged ethernet
      hung `networkd-wait-online` ~1m37s). netplan file `chmod 600`.
- [x] Root LV grown to full ~474 G VG (installer left it unallocated).
- [x] Timezone set `Europe/Helsinki` (was UTC — schedule fired 3h early); NTP on.
- [x] **WiFi power-save churn fixed** (Intel 9560 dropping/roaming):
      `wifi-powersave-off.service` + `iwlwifi`/`iwlmvm` modprobe options.

## Graphical / kiosk stack
- [x] `.deb` Chromium via `ppa:xtradeb/apps` (not snap); + `xserver-xorg xinit
      openbox unclutter`.
- [x] getty@tty1 autologin → `~/.profile` (guarded `exec startx`, tty1 only) →
      `~/.xinitrc` (`openbox & exec start-kiosk.sh`).
- [x] `start-kiosk.sh`: `set -uo pipefail`, xrandr mode, `xset` no-blank,
      `unclutter`, Chromium in a **relaunch loop**. Boots to kiosk, no login.
- [x] Chromium flags incl. force-dark
      (`--force-dark-mode --enable-features=WebContentsForceDark`).
- [x] Process count stable, no crash-loop. Minor sub-second flash on Chromium
      fullscreen — accepted.

## Broker / MQTT (on the Pi)
- [x] Websockets listener on 9001 already present; 1883 + 9001 both LISTEN.
- [x] Broker requires auth; created dedicated `wallpanel` user
      (`mosquitto_passwd`), verified round-trip.

## Shell page
- [x] Written, then **split** into `index.html` / `config.js` / `views.js` /
      `schedule.js` / `app.js` / `style.css` (+ bundled `mqtt.min.js`). Plain
      `<script>` globals (not ES modules — CORS on `file://`).
- [x] `VIEWS` are `{url, rotate}`; offline overlay; connects+authenticates.
- [x] First real view **`tapo`** (Frigate `<host>/#tapo310`, `rotate: true` →
      landscape on portrait panel). `off` = inline black page.
- [x] Deployed via WinSCP.

## Scheduling + override
- [x] Clock-driven schedule in the shell: 06:00–08:00 `morning`, 19:00–00:00
      `tapo`, gaps `off` (black). 30 s tick.
- [x] Manual override held for the current period, expires at boundary, retained
      to `wallpanel/override` (survives reboot); empty retained msg clears it.
- [x] "Screen off" = black page, not DPMS (avoids poking the marginal adapter).
- [x] Verified end-to-end at real times + via override.

## Physical control
- [x] Reused an existing Zigbee remote (no ESP32 built).
- [x] Node-RED flow (`wallpanel-nodered-flow.json`) maps arrows→cycle,
      `off`→blank, `on`→resume schedule. Cycle `["tapo","morning"]` (excludes
      `off`); position tracked in `context`.
