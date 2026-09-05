# View: 3D printer

Camera, temperatures, progress and - most importantly - failure.

**Status:** designed, not built. Blocked on the OctoPrint-MQTT plugin being
installed. Depends on conditional views (`todo-view-mechanisms.md`).

**Stack:** Klipper driven by OctoPrint on an OctoPi. PrintTimeGenius already
installed. Moonraker **not** installed, deliberately - see below.

---

## Data: let OctoPrint publish to the broker

Install the **OctoPrint-MQTT** plugin and point it at the existing Mosquitto. It
publishes state, temperatures, progress and events directly, which means no API
key in page source (an OctoPrint key can start and cancel prints), no poller to
maintain, and push rather than poll.

Two settings that matter:

1. **Set the base topic to `wallpanel/printer/`**, not the default `octoPrint/`.
   The open broker-ACL item scopes the `wallpanel` user to `wallpanel/#`; if
   printer state lands outside that prefix, applying the ACL later silently
   breaks this view - the panel connects fine and simply never receives data.
2. **Enable retain** on state and progress, or the panel renders blank until the
   next print event fires. Same reasoning as the retained `override` and
   `status` topics.

Expected topics - from the plugin's documentation, **not yet confirmed against
this installation**:

```
wallpanel/printer/temperature/tool0   {actual, target}
wallpanel/printer/temperature/bed     {actual, target}
wallpanel/printer/progress/printing   {progress, printTimeLeft, path}
wallpanel/printer/event/PrintStarted | PrintDone | PrintFailed | Error
```

## Camera: direct, no CORS, no key

```html
<img src="http://<octoprint-host>/webcam/?action=stream">
```

An MJPEG stream in an `<img>` is **not subject to CORS** - images are allowed
cross-origin for display, and only reading pixels back via canvas taints. The
webcam sits unauthenticated behind OctoPi's haproxy, so no key either.

The host belongs in `config.js` under `hosts`, alongside `frigate`, so
`views.js` carries no addresses and nothing site-specific reaches the repo.

**Stream teardown is already solved.** The stage model destroys the outgoing
stage on every view change, which closes the MJPEG connection. That was built
for the Frigate stream and applies unchanged. Without it the connection leaks,
and mjpg-streamer has a low concurrent-client limit.

## Layout priority

Progress bars are satisfying but low-information. What earns wall space is
**failure** - a print that spaghettified at hour 2 and was found at hour 6:

1. **State, loudly** - printing / paused / **error** / idle. An error should take
   over the panel, not wait its turn in the rotation.
2. **ETA as wall-clock time** - "done 18:42", not "3h 12m remaining". You want to
   know whether it lands before dinner without doing arithmetic on a wall.
3. **Camera**, large.
4. **Temperatures** as current -> target, small. They matter during heat-up and
   when something is wrong.
5. Layer and percentage last.

Worth trying: draw the ETA as an arc on the existing 12-hour dial geometry, so
"will it be done before I go out" is answered by shape rather than reading.
Reuses code and keeps the panel to one visual idiom.

## Why not Moonraker

With Klipper driven through OctoPrint, gcode is streamed over a virtual serial
port, so OctoPrint never sees Klipper's own progress and its `printTimeLeft` can
be badly wrong. That was the one argument for Moonraker, whose
`virtual_sdcard.progress` and `print_stats` are Klipper's real numbers.

**PrintTimeGenius already closes that gap**, so the argument is spent. Running
Moonraker alongside OctoPrint on one Klipper instance means OctoPrint owns the
virtual serial port while Moonraker talks to Klipper's Unix socket, and with both
connected they can disagree about who owns the current job - a real hazard for a
printer left running unattended.

Add Moonraker only if you want Mainsail or Fluidd as your UI. That is a decision
on its own merits, not something this panel should force.
