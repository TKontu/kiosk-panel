# Shared view mechanisms

Cross-cutting plumbing that several planned views need. Worth building once,
before the views that depend on it.

**Status:** conditional views, the takeover and the generic tiles renderer are
all **built**. These unblock `todo-printer.md`, `todo-sensors.md`,
`todo-server-status.md`, and anything else that is only sometimes relevant.

---

## The two ingestion paths

Every data source falls into one of two categories, and picking the wrong one is
how these views fail:

| Source | Path |
|--------|------|
| Public API that sends `Access-Control-Allow-Origin` | the page fetches it directly |
| Everything else - LAN devices, anything needing a secret key, anything without CORS | Node-RED fetches it and republishes as a **retained** MQTT topic; the page renders |

The panel runs from `file://`, so its `Origin` header is literally `null`. An API
without open CORS cannot be called from the page at all, however the URL is
written. Test before designing:

```bash
curl -sSI -H "Origin: null" <url> | grep -i access-control-allow-origin
```

The second path is also the answer whenever a credential is involved. A key in
`config.js` is a key in page source; a key in Node-RED stays on the Pi.

## Conditional views — DONE

Built for the agent canvas and deliberately general. `views.js` was a static
list; `app.js` derives the arrow rotation from it. A printer view, an alert view, a "guests arriving" view - all of these are
dead weight in the rotation most of the time.

A view can now be gated on a retained MQTT topic:

```js
printer: {
  url: "printer.html",
  activeWhen: "printer/state",                    // present and non-empty
}
canvas: {
  url: "canvas.html",
  activeWhen: { topic: "canvas", test: fn },      // ...and fn(payload) is truthy
}
```

The topic is **relative to the same base as every other topic**, so `views.js`
still carries no absolute topics — the same reason LAN hosts live in
`config.js`. The optional `test` lives in `views.js` rather than `app.js`,
because it is a property of the view and `app.js` should not learn any view's
payload schema. A test that throws counts as "not usable" rather than
propagating out of `cycle()`.

`cycle()` in `app.js` already filters on `cycle !== false`; this is the same
filter with a second condition, plus a subscription so the rotation updates
live. Keep the derived-at-runtime property: no view names in Node-RED.

Edge cases handled, and verified on the real panel:

- Gate topic missing or cleared -> inactive, not an error.
- The currently-shown view goes inactive -> the override is dropped and the
  panel falls back to the schedule rather than leaving a stale page up.
- `view/set <name>` is **refused** while a gate is shut, so a view that cannot
  render cannot be summoned by name either.
- `tick()` falls through to `OFF_VIEW` if the view it was about to show is
  gated shut.
- The advertised rotation on `wallpanel/views` updates live as gates open and
  shut, so it always reflects what the arrows will actually do.

## Takeover — DONE

Built for the ephemeral agent canvas, and general: a view marked
`takeover: true` in `views.js` outranks both the manual override and the
schedule for as long as its gate is open.

**The gate is the state.** There is no timer and nothing to reconcile after a
reboot — a payload whose deadline has passed simply never opens its gate, so it
never shows. `tick()` re-evaluates on its existing 30 s cadence, which is how a
takeover ends without anything publishing to end it.

**Dismissal was the part worth getting right.** Without it an agent could hold
the wall for the length of its TTL with no way out — `on` clears an override,
and a takeover is not an override. Any button press dismisses the payload that
is showing; a later payload takes over again as normal, because what is recorded
is the payload, not the topic.

An alert takeover for the homelab status view is now just another view with
`takeover: true` — no new mechanism needed.

Suggested contract: a retained `wallpanel/alert` carrying
`{level, title, detail}`, empty to clear. `level: "critical"` takes over
immediately and ignores the schedule; anything lower the panel ignores.

Deliberately no auto-dismiss: an alert that clears itself is an alert you never
saw. Clear it by publishing empty, the same way `on` clears an override.

## A generic tiles renderer — DONE

Rather than a bespoke page per data source, `shell/tiles.html` renders whatever
retained topics sit under one prefix, as a few large labelled values. That one
page covers `todo-sensors.md` and `todo-server-status.md` between them, and most
future "some numbers on a wall" requests. A board is a `views.js` entry:

```js
sensors: { url: "tiles.html?board=sensors&title=Indoors", rotate: 0 }
```

**One retained topic per tile**, `wallpanel/tiles/<board>/<key>`, so adding a
reading is publishing a topic, with no panel change:

```json
{ "label": "CO₂ living room",          // required, string
  "value": "1240",                      // required, string or number, shown as-is
  "unit": "ppm",                        // optional
  "state": "ok" | "warn" | "bad",       // optional
  "hero": true,                         // optional: the big full-width row
  "order": 10,                          // optional: ascending, then by key
  "updated_at": "2026-10-10T13:40:00Z"  // optional: drives staleness
}
```

- **The publisher owns judgement and formatting.** Thresholds, rounding and units
  are decided in Node-RED (`node-red/sensors-tiles-flow.json`), not in the page.
  That way the same tile can later drive an alert or a phone notification, and
  the page learns no source's schema.
- **Removing and rejecting tiles.** An empty payload removes a tile. An invalid
  tile is dropped on its own; one bad publisher never blanks a board.
- **At most 6 tiles.** Extras are summarised as "+N more". The first `hero` tile
  gets the full-width row, which is how CO₂ leads the sensors board.
- **Stale tiles stay up.** A tile older than `?stale=` minutes (default 60) is
  kept and marked "Stale · HH:MM" instead of showing its state. A last-known
  reading with its age is more use than a gap. The page re-checks on a 20 s
  clock, because a sensor going quiet is exactly when no message arrives.
- **Styling comes from `panel.css`.** The page uses the `.canvas .tiles/.tile`
  classes, so the board and agent pages share one look. The state is always
  shown as a word (OK / Watch / Problem), never by colour alone.

A board has no gate: `activeWhen` watches a single topic, and a board is a
wildcard. A board with no tiles shows "No readings yet". Give it `cycle: false`
if that ever matters.
