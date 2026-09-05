# Shared view mechanisms

Cross-cutting plumbing that several planned views need. Worth building once,
before the views that depend on it.

**Status:** not started. Unblocks `todo-printer.md`, `todo-server-status.md`,
and anything else that is only sometimes relevant.

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

## Conditional views

`views.js` is a static list today and `app.js` derives the arrow rotation from
it. A printer view, an alert view, a "guests arriving" view - all of these are
dead weight in the rotation most of the time.

Proposal: let a view be gated on a retained MQTT topic.

```js
printer: {
  url: "printer.html",
  activeWhen: "wallpanel/printer/state",   // in rotation only while truthy
}
```

`cycle()` in `app.js` already filters on `cycle !== false`; this is the same
filter with a second condition, plus a subscription so the rotation updates
live. Keep the derived-at-runtime property: no view names in Node-RED.

Edge cases to handle deliberately:

- Gate topic missing entirely -> treat as inactive, not as an error.
- The currently-shown view goes inactive -> fall back to the schedule rather
  than leaving a stale page up.
- Everything inactive -> the schedule and `OFF_VIEW` still apply.

## Alert takeover

Any view can be pre-empted by a critical condition. This is what makes the panel
useful when nobody is looking at it.

Suggested contract: a retained `wallpanel/alert` carrying
`{level, title, detail}`, empty to clear. `level: "critical"` takes over
immediately and ignores the schedule; anything lower the panel ignores.

Deliberately no auto-dismiss: an alert that clears itself is an alert you never
saw. Clear it by publishing empty, the same way `on` clears an override.

## A generic tiles renderer

Rather than a bespoke page per data source, one page that renders whatever
retained topics match a pattern, as a grid of labelled values with units and
optional thresholds. That single view covers `todo-sensors.md` and
`todo-server-status.md` between them, and most future "some numbers on a wall"
requests.

Keep the existing type scale and ink tokens - the panel is 68.8 ppi and read
from 2-3 m (see `architecture.md`). Tiles should be few and large, never a dense
table.
