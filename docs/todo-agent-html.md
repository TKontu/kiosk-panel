# Agent-authored HTML on the canvas

Let the agent publish a page, not just a document the panel knows how to render.

**Status: built and deployed (2026-09-09).** The contract is in
[`agent-canvas-schema.md`](./agent-canvas-schema.md); this file keeps the
argument and the measurements that shaped it. Reverses
the "defer HTML" decision in
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
panel renders -> <iframe sandbox="allow-same-origin" src="agent/report.html">
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

A full-bleed iframe **cannot trap the panel**, which is worth stating because it
is not obvious: the arrows, the schedule and the takeover all arrive over MQTT,
not through the page. The agent can own every pixel and still not affect what the
remote does. That is a payoff from the intent-based control model that only shows
up here.

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

## The controls, as corrected by testing

**1. `sandbox="allow-same-origin"`, and deliberately not an empty allow-list.**

The first draft of this proposal specified an empty allow-list — no
`allow-scripts`, no `allow-same-origin`. **That does not work on this panel.**
The shell runs from `file://`, and a fully sandboxed frame gets an opaque origin
which cannot load `file://` subresources *at all*: no stylesheet, no images. It
was measured side by side, same document in both frames — the sandboxed one
rendered as unstyled serif text with broken images.

Which would have produced exactly the outcome this proposal exists to prevent:
agent pages with no house style.

`allow-same-origin` **without** `allow-scripts` is the working combination, and
it gives up nothing: with no script execution there is no code to make use of the
origin. Measured:

| | result |
| --- | --- |
| stylesheet and local images | load |
| a `<script>` in the agent's page | does not run |
| `window.parent.document.title = …` from the frame | parent untouched |

The schema doc's concern — that HTML *"runs on a page holding broker
credentials"* — is answered by the absence of `allow-scripts`, not by the origin.

**2. No external references — hygiene, and not enforceable where this proposal
put it.**

The first draft assigned this to the mediator. The mediator **cannot do it**:
the HTML travels over SMB, not MQTT, so the mediator only ever sees the JSON
document and never has the file. The same applies to the size cap below.

Two browser-side fallbacks were tried and neither blocks it: the `csp` attribute
on the iframe did not stop an external `<img>`, and the sandbox does not either.

Before building something heavier, note the risk is smaller than it looks. The
agent already has internet egress, so a beacon gives it no path it lacks; and the
frame cannot read the parent, so it has nothing of the panel's to leak. The
residual is "somebody learns the panel rendered at time T".

So: **downgraded from mandatory to hygiene.** If it is ever wanted as a real
control, the honest places are a validator where the file lands — accepting that
the agent can rewrite it after the check — or the kiosk's own egress rules.
Not the mediator.

**3. A size cap** — a few hundred KB. Same enforcement gap as above: the
mediator cannot see the file. Partly mitigated by the frame executing nothing, so
an oversized document renders slowly rather than doing anything.

## What was measured

Fixture: a `file://` page with two iframes loading the same agent-style document,
one sandboxed and one not, with a stylesheet, a local image, an external image
and a script.

- Empty `sandbox` → no stylesheet, no local image. **Mechanism broken.**
- `sandbox="allow-same-origin"` → stylesheet and image load; script does not run;
  parent unreachable. **Mechanism works, safety intact.**
- External `<img>` requested under both, and under `csp="default-src 'self'"`.
  **No browser-side control available.**

Worth re-running if the kiosk ever stops serving the shell from `file://`; nearly
all of the above is a consequence of that origin.

## Keep the typed schema as the fast path

Not everything should become HTML. `tiles` and `series` stay worthwhile precisely
because the agent does not have to think about layout — "show four numbers"
should not require composing markup.

Shape: `title`, `updated_at` and `ttl_s` stay structured; the **body** is either
typed blocks *or* an `html` reference. Both first-class.

## Tasks

- [x] `shell/panel.css` — house tokens and `.canvas` classes, in absolute px.
      `overview.html` and `canvas.html` link it and no longer carry their own
      copies of the tokens.
- [x] `canvas.html`: renders `html` in an `allow-same-origin` iframe (no
      `allow-scripts`); honours `layout`.
- [x] Staleness badge — in `full`, where the panel's footer is hidden. In `card`
      the footer is visible and already carries it, so the badge there would be
      duplicate clutter. Narrower than this doc first proposed, deliberately.
- [x] `agent-canvas-schema.md`: `html` and `layout` documented, sandbox finding
      made normative.
- [ ] Decide where, if anywhere, external references and the size cap are
      enforced — **not the mediator**, which never sees the file. Currently
      hygiene, not enforced anywhere.

## Not proposed

**Live data by agent-chosen topic.** A field like `{"live": {"topic": "…"}}`
would let the agent decide what the panel subscribes to — a canvas capability
quietly becoming "make the panel read arbitrary topics". If ever wanted, the
agent names a *source* and the mediator resolves it from config the agent cannot
influence.

And note this panel already renders live telemetry through Node-RED retained
topics: live data is a **view**, not an agent conclusion.
