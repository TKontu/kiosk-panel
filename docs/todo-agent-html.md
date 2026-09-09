# Agent-authored HTML on the canvas

Let the agent publish a page, not just a document the panel knows how to render.

**Status:** not started. Reverses the "defer HTML" decision in
[`agent-canvas-schema.md`](./agent-canvas-schema.md), so it argues rather than
assumes. Raised from the `hermes-deploy` side.

---

## The decision being revisited

The schema doc defers arbitrary HTML because *"every agent output becomes a
design decision the agent is not equipped to make. Within a few days the panel
has five visual languages."*

That reasoning holds **given its assumption** — that the agent also invents its
own styling. It does not have to.

## The cost the current position carries

Every new arrangement the agent might want — a log tail, a hero number, a status
list, something nobody has thought of — becomes a change *here*: a new block type
in `canvas.html`, a schema revision, a cross-repo negotiation, a deploy.

That is enough friction that the useful ones will not happen. Worse, it makes
this repo the bottleneck on what the agent is allowed to say, which is not a
thing the panel should be deciding. Nobody wants to maintain a kiosk repo because
some future layout is preferred.

## The split that resolves it

Not *panel owns presentation*, but:

- **Panel owns style** — type scale, ink, spacing, the house look
- **Agent owns structure** — which blocks exist, in what arrangement

**Publish a stylesheet and let agent HTML link it.**

```html
<link rel="stylesheet" href="../panel.css">
<div class="canvas">
  <h1>Overnight build</h1>
  <div class="tiles">
    <div class="tile ok"><span class="label">Tests</span><span class="value">148</span></div>
  </div>
  <pre class="log">stage 4: retrying…</pre>
</div>
```

Consistency then comes from the CSS rather than from a hardcoded list of
permitted blocks. The agent invents arrangements; nothing here changes. When the
house style moves, one file moves and every canvas follows.

This is why web pages do not ship a fixed list of allowed layouts — the
stylesheet is the consistency mechanism, and it degrades gracefully when
something unanticipated turns up.

## Delivery: the file channel, unchanged

HTML is bulk, and the schema doc already nominated the route: *"it must come
through the file channel rather than the topic"*.

```
agent writes  -> hermes-edit/report.html   (the share already mounted at agent/)
publishes     -> {"v":1, "title":"…", "html":"agent/report.html"}
panel renders -> <iframe sandbox src="agent/report.html">
```

The existing `safeAsset` path validation already covers it — same rules as
`image`, same all-or-nothing rejection.

## Two layouts, and full-bleed is the point

An iframe alone does not say whether the page is a block *inside* the canvas or
*owns the screen*. Both are wanted:

```json
{"v":1, "title":"…", "html":"agent/report.html", "layout":"card"}   // default
{"v":1, "title":"…", "html":"agent/report.html", "layout":"full"}   // whole panel
```

**`card`** — the iframe is one block among the panel's furniture: title, tiles,
timestamp. The panel stays visually in charge. For "a chart alongside three
numbers".

**`full`** — the iframe fills the viewport. The agent's page *is* the screen. For
a dashboard it designed, a large single visualisation, or anything the card shape
fights.

`full` is what makes the capability open-ended. Without it the agent can only
ever fill a rectangle someone else positioned — the same constraint the typed
schema imposes, with nicer contents.

**What `full` gives up.** In `card`, the panel's chrome plus the stylesheet keep
everything looking like one system. In `full`, the agent owns the pixels: link
the stylesheet and it stays consistent, ignore it and there are two visual
languages on the wall. That is the trade, taken deliberately, and the alternative
is a code change here for every new arrangement.

## The guarantee to keep in both layouts

*"Staleness is shown, not hidden"* is one of this panel's promises, and a
full-bleed page could show yesterday's conclusion indefinitely with nothing
saying so.

So the panel overlays a **small corner badge when `updated_at` is past the
staleness threshold**, above the iframe, in both layouts. Everything else the
agent may own; that indicator stays. On a screen that is glanced at rather than
read, a plausible-looking stale dashboard is the failure that actually costs
something.

`title` and `updated_at` therefore stay required in both layouts — the rotation
gate and the staleness check need them even when nothing renders them directly.

## Three controls, none optional

1. **`sandbox` with an empty allow-list.** No `allow-scripts`, no
   `allow-same-origin`. The iframe gets an opaque origin and executes nothing, so
   this page's broker credentials stay unreachable. This is what makes
   agent-authored markup safe at all, and it answers the schema doc's own note
   that HTML *"runs on a page holding broker credentials"*.
2. **No external references.** Agent HTML may reference only `agent/` paths and
   `panel.css`. Otherwise an `<img src="https://…">` beacons from the kiosk on
   every rotation — a tracking pixel installed by its own owner. The mediator
   checks this; resolution and policy is what a mediator is for.
3. **A size cap** — a few hundred KB, so one runaway document cannot wedge the
   panel.

## Keep the typed schema as the fast path

Not everything should become HTML. `tiles` and `series` stay worthwhile precisely
because the agent does not have to think about layout — "show four numbers"
should not require composing markup.

Shape: `title`, `updated_at` and `ttl_s` stay structured; the **body** is either
typed blocks *or* an `html` reference. Both first-class.

## Tasks

- [ ] Publish `shell/panel.css` — the house classes agent pages link. Derive it
      from the existing canvas styling so the two cannot drift.
- [ ] `canvas.html`: render `html` in a sandboxed iframe; honour `layout`.
- [ ] Staleness badge overlaid above the iframe in both layouts.
- [ ] `agent-canvas-schema.md`: add `html` and `layout`; document the controls.
- [ ] Mediator: reject external references, enforce the size cap.

## Not proposed

**Live data by agent-chosen topic.** A field like `{"live": {"topic": "…"}}`
would let the agent decide what the panel subscribes to — a canvas capability
quietly becoming "make the panel read arbitrary topics". If ever wanted, the
agent names a *source* and the mediator resolves it from config the agent cannot
influence.

And note this panel already renders live telemetry through Node-RED retained
topics: live data is a **view**, not an agent conclusion.
