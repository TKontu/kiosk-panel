# Agent canvas — the contract

The canonical definition of what an agent may put on the wall panel. **This file
is the single source of truth.** The `hermes-deploy` repo references it rather
than copying it; if the two ever disagree, this one is right.

- Panel implementation: `shell/canvas.html`, gating in `shell/app.js`
- Agent side and mediator: `hermes-deploy/docs/todo-canvas.md`
- Broker ACLs that make this a boundary: `hermes-deploy/docs/todo-broker.md`

---

## Two channels

| Channel | Carries | Why |
|---|---|---|
| **MQTT**, retained | the document — *what to show* | small, structured, survives a reconnect |
| **A mounted share** | bulk — images the document references | a retained topic holding a megabyte of PNG is a payload every subscriber pays for on every reconnect |

The share is mounted **read-only on the kiosk, under the shell directory**:

```
/opt/wallpanel/shell/agent/        <- the agent's share, ro
```

so `"image": "agent/plot.png"` is just a relative path. The browser loads it the
same way `photo.html` already loads `media/image.jpg` — a mechanism already in
production on this panel, needing no server and no CORS. A `file://` page cannot
`fetch()` another file, but it can display one in an `<img>`, which is all this
needs.

## Topic flow

```
agent  --publish-->  hermes/canvas  --[mediator: validate]-->  wallpanel/canvas (retained)  --> panel
```

The agent **never publishes into `wallpanel/#`**. Two reasons, both structural:

1. The panel's control topics (`wallpanel/command`, `wallpanel/view/set`) stay
   unreachable from the agent even if its credential leaks. Otherwise a canvas
   capability quietly includes "change which view is on screen".
2. Validation happens somewhere the agent cannot skip.

## Schema, v1

```json
{
  "v": 1,
  "title": "Overnight build",
  "subtitle": "3 of 4 stages green",
  "tiles": [
    {"label": "Tests",    "value": "148", "unit": "passed", "state": "ok"},
    {"label": "Coverage", "value": "81",  "unit": "%",      "state": "warn"},
    {"label": "Failures", "value": "2",                     "state": "bad"}
  ],
  "series": [[0, 12], [1, 18], [2, 16], [3, 24]],
  "image": "agent/run-482.png",
  "note": "Stage 4 still running; retry queued for the two failures.",
  "updated_at": "2026-09-07T20:11:00Z"
}
```

| Field | Required | Rule |
|---|---|---|
| `v` | **yes** | exactly `1`. Anything else and the view leaves the rotation. |
| `title` | **yes** | non-empty string |
| `updated_at` | **yes** | ISO 8601, must parse. Displayed. Older than **90 min** is marked stale. |
| `subtitle` | no | string |
| `tiles` | no | array, **max 6**. Each needs `label` and `value`; `unit` optional; `state` ∈ `ok` \| `warn` \| `bad` |
| `series` | no | array of `[number, number]`, **max 200** points. One series only. |
| `image` | no | relative path inside `agent/` — see below |
| `note` | no | string |

### `image` paths

An agent-supplied path aimed at a local filesystem is untrusted input. It must:

- start with `agent/`
- contain no `..`
- contain no `:` and no `//`
- match `^[A-Za-z0-9][A-Za-z0-9._/-]*$`
- be at most 200 characters

A path failing any of these **rejects the entire payload** — the view renders
nothing and leaves the rotation. It does not silently drop the image and show the
rest, because a canvas quietly missing the thing it was published to show is
worse than an absent canvas.

## Behaviour the panel guarantees

- **All-or-nothing.** A payload that fails validation renders *nothing*. Never
  half a layout: the panel is glanced at, not read, and a plausible-looking wrong
  answer is the failure mode that matters.
- **Gated.** The view is in the arrow rotation only while a valid payload is
  present. An agent with nothing to say, or a mediator that rejected the last
  payload, leaves the rotation rather than showing a blank page.
- **Falls back live.** If the payload is cleared while the canvas is on screen,
  the panel returns to the schedule rather than leaving a stale page up.
- **Not forceable.** `wallpanel/view/set canvas` is refused while the gate is
  shut, so a view that cannot render cannot be summoned.
- **Staleness is shown, not hidden.** An old `updated_at` is labelled stale in
  amber. A canvas showing yesterday's conclusion with no date is worse than a
  blank screen.
- **Text is never markup.** Agent-supplied strings are written with
  `textContent`, never `innerHTML`.

To clear the canvas, publish an **empty retained** payload to
`wallpanel/canvas` — the same idiom as clearing `wallpanel/override`.

## Validated twice, deliberately

The mediator validates, and `canvas.html` validates again. Not because the
mediator is untrusted, but because the panel must never render a half-layout
regardless of what reaches it. The duplication is cheap and the failure it
prevents is the expensive one.

The gate in `views.js` performs a third, much weaker check — JSON parses and
`v === 1`. That is deliberately *not* full validation: `app.js` should not learn
any view's payload schema, and the real validation belongs where the agent cannot
skip it.

## Deferred: the HTML escape hatch

Arbitrary HTML from the agent is **not** supported in v1, and should stay that
way until the schema is demonstrably insufficient rather than merely inconvenient.
Every agent output would otherwise become a design decision the agent is not
equipped to make, and the panel would carry five visual languages within a week.

If it is ever added: it must be `sandbox`ed (it runs on a page holding broker
credentials), it must come through the file channel rather than the topic, and the
existing `safeAsset` path check already covers pointing it at the right place.
