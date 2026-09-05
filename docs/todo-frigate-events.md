# View: Frigate events

Recent detections rather than a live camera feed.

**Status:** not started. Frigate is already running and already a view (`tapo`).

---

## Why events beat the live feed

The live view is mostly a static picture of an empty space. **Recent detections
with thumbnails carry more information per glance**: "person at the door, 12 min
ago" is a fact; a live empty driveway is not.

The existing `tapo` live view is still worth keeping - it is the right thing when
you have heard a noise. This would be a second, calmer view.

## Data

Frigate's HTTP API on the LAN, so **Node-RED -> retained MQTT** for the event
metadata. Frigate also publishes to MQTT natively (`frigate/events`), which may
make this close to free - subscribe, keep the last N events, republish a trimmed
retained summary under `wallpanel/`.

Note the same prefix problem as the sensors: `frigate/#` sits outside
`wallpanel/#`, so either widen the planned ACL or have Node-RED republish.

Thumbnails come straight from Frigate over HTTP as images - **no CORS needed**,
same reason the printer camera and the existing live view work.

## Design

- A short list: three or four most recent, thumbnail plus label plus relative
  time.
- Relative time ("12 min ago") beats a timestamp on a wall.
- Filter by label. A view full of `car` events from the street is noise; `person`
  near the door is signal. Frigate zones make this easy and are worth configuring
  first.
- Overnight events deserve emphasis over daytime ones.
- This view should probably not auto-take-over. It is interesting, not urgent,
  and a panel that flashes on every passing cat gets ignored.
