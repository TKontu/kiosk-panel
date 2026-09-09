# Agent canvas — the contract

The canonical definition of what an agent may put on the wall panel. **This file
is the single source of truth.** The `hermes-deploy` repo references it rather
than copying it; if the two ever disagree, this one is right.

- Panel implementation: `shell/canvas.html`, gating in `shell/app.js`
- Agent side and mediator: `hermes-deploy/docs/todo-canvas.md`
- Broker ACLs — where the actual boundary lives: `hermes-deploy/docs/todo-broker.md`

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

## Two lifecycles

The agent has two canvases. They use the **same schema and the same renderer**,
and differ only in how long they live and whether they interrupt.

| | `persistentcanvas` | `ephemeralcanvas` |
|---|---|---|
| Topic | `canvas/persistent` | `canvas/ephemeral` |
| Lives until | replaced or cleared — **no TTL** | its TTL lapses |
| In the arrow rotation | yes, permanently | yes, while it lives |
| On arrival | **takes over for ~5 min**, then settles into the rotation | **takes over for its whole TTL**, then leaves entirely |
| Dismissable | yes, any button press | yes, any button press |

Both interrupt when they arrive — publishing something nobody sees is not much
of a display capability. The difference is what happens afterwards: a persistent
canvas stops asking for attention but stays available in the rotation; an
ephemeral one disappears completely.

**They are independent and concurrent.** Neither clears, evicts or shadows the
other: different topics, different gates, and the panel never publishes to
either. An ephemeral canvas interrupts the *display* for its TTL and then hands
back — if a persistent canvas was showing, that is what returns.

`persistentcanvas` is a standing board: publish it and it stays, however old,
until you publish over it or clear it. A stale one is *labelled* stale, never
hidden.

`ephemeralcanvas` is "look at this now". It seizes the wall, holds for its TTL,
and vanishes with nothing needing to be published to end it.

### The attention window

A persistent canvas holds the screen for **`CANVAS_ATTENTION_S` (5 min by
default)** measured from its `updated_at`, then reverts. Two consequences worth
knowing:

- **It is keyed to the payload, not to arrival.** A canvas published hours ago
  does not seize the wall when the panel reboots and re-reads the retained
  topic — the window has already passed. Verified.
- **It is panel policy, not the agent's to choose.** The agent decides
  persistent-vs-ephemeral; the panel decides how long "this changed" is worth
  interrupting for. Otherwise an agent could hold the wall indefinitely by
  publishing "persistent" with a long window. Change it in `views.js`.

When both canvases want attention at once, **the ephemeral one wins** — "look at
this now" outranks "this changed". That is an explicit priority on the takeover,
not an accident of declaration order in `views.js`.

### Why the TTL runs from `updated_at`

Expiry is `updated_at + ttl_s`, not arrival + ttl_s. The deadline is then the
same wherever it is evaluated — the renderer, the shell's gate, or a panel that
rebooted halfway through the window. It also means an ephemeral payload that
expired while the panel was off **never shows at all**, rather than starting a
fresh 30 minutes on boot.

The gate carries the expiry, so there is no timer to keep and nothing to
reconcile: an expired payload simply stops opening its gate.

## Topic flow

```
agent --publish--> hermes/canvas/persistent --[mediator]--> wallpanel/canvas/persistent --> panel
agent --publish--> hermes/canvas/ephemeral  --[mediator]--> wallpanel/canvas/ephemeral  --> panel
```

The agent **never publishes into `wallpanel/#`**. Two reasons, both structural:

1. The panel's control topics (`wallpanel/command`, `wallpanel/view/set`) stay
   unreachable from the agent even if its credential leaks. Otherwise a canvas
   capability quietly includes "change which view is on screen".
2. Validation happens somewhere the agent cannot skip.

### What actually enforces that — and what does not

Be precise about this, because it is easy to credit the wrong component:

**The boundary is the ACL on the `hermes` credential.** That is the only thing
stopping the agent writing `wallpanel/command` directly. It holds whatever the
mediator does.

**The mediator is a validating hop, not a security boundary.** It is worth having
for what it does to the payload — schema enforcement the agent cannot skip,
unknown fields stripped, malformed documents dropped before they reach the panel.
It is not what contains the agent.

**Which credential the mediator runs as is therefore a minor question.** A
dedicated `mediator` user buys log attribution and a smaller blast radius if
Node-RED itself is compromised — but Node-RED runs next to the broker, so anyone
who owns it can usually reach the broker anyway. Running the flow with existing
admin credentials is a reasonable call; it does not weaken the boundary above,
because that boundary lives on the agent's credential.

The one thing it does cost: every other Node-RED flow, now and later, inherits
the same broker reach, and broker logs cannot tell the mediator's writes apart
from anything else on that host.

**Still worth doing, independently:** narrow `wallpanel`'s *write* scope. That
credential is browser-visible and should be assumed public, and today it can
publish `wallpanel/canvas/*` directly — i.e. forge an agent canvas, bypassing the
mediator entirely. Scoping its writes to `status`, `view/current`, `views` and
`override` closes that, and is unrelated to which user Node-RED runs as.

### Dismissal, and why it exists

An ephemeral canvas can hold the wall for up to its TTL. Without a way out, an
agent could occupy the panel for half an hour and the remote would be useless —
`on` clears an override, and a takeover is not an override.

So **any button press dismisses the ephemeral canvas that is showing**. It
dismisses *that payload*, not the topic and not the capability: the next
payload the agent publishes takes over again as normal.

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
| `ttl_s` | no | **ephemeral only.** Seconds, `0 < ttl_s ≤ 86400`. Default **1800** (30 min). Ignored on the persistent canvas, which has no TTL. |

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
- **Staleness is shown, not hidden.** On the persistent canvas an old
  `updated_at` is labelled stale in amber. A canvas showing yesterday's
  conclusion with no date is worse than a blank screen. An ephemeral canvas
  cannot be stale — it stops rendering instead, and its footer counts down
  rather than counting up.
- **The two never interfere.** Publishing one does not touch the other's topic,
  its place in the rotation, or the manual override. When both are demanding
  attention the ephemeral one is shown first; the persistent one is still there
  in the rotation. An ephemeral takeover that
  lapses returns to exactly what was showing before it.
- **Text is never markup.** Agent-supplied strings are written with
  `textContent`, never `innerHTML`.

To clear either canvas, publish an **empty retained** payload to its topic —
the same idiom as clearing `wallpanel/override`. An ephemeral one does not need
clearing; it expires.

## What the mediator does with a bad payload

**It drops it and forwards nothing.** The previously published canvas stays up.
A transient bad publish should not wipe a standing board, and a canvas that
vanishes is harder to diagnose than one that simply stopped updating — the
rejection reason goes to a debug node instead.

An **empty** payload is forwarded, because that is how the agent clears its own
canvas.

The mediator also **rebuilds the document from known fields only**. Anything the
agent adds beyond the schema is dropped rather than forwarded into the panel's
namespace, so the schema is a whitelist rather than a minimum.

Implementation: `node-red/canvas-mediator-flow.json`.

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
