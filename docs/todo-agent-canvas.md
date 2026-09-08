# View: agent canvas

A page the Hermes agent can draw on — whatever it decides is worth showing.

**Status: panel side built and deployed (2026-09-07).** The contract lives in
[`agent-canvas-schema.md`](./agent-canvas-schema.md), which is the single source
of truth and is referenced from the `hermes-deploy` repo rather than copied.

---

## Done, on this side

- `shell/canvas.html` — renders the v1 schema, validates it, and renders
  **nothing** if it fails. One renderer serves both canvases; `?src=` picks the
  topic.
- **Two lifecycles**: `persistentcanvas` (standing board, no TTL, in the
  rotation) and `ephemeralcanvas` (takes over on arrival, expires, never in the
  rotation, dismissable with any button press). Independent and concurrent —
  neither touches the other.
- `activeWhen` gating in `shell/app.js` — see
  [`todo-view-mechanisms.md`](./todo-view-mechanisms.md). The view joins the
  arrow rotation only while a valid payload is present, falls back to the
  schedule if the payload is cleared while it is on screen, and refuses
  `view/set canvas` while the gate is shut.
- `/opt/wallpanel/shell/agent/` created on the kiosk as the mount point for the
  agent's share.

Verified on the real panel: no payload -> rotation is
`["tapo","photo","overview"]`; a persistent payload -> `[...,"canvas"]`; an
ephemeral payload takes over immediately while the persistent one *stays in the
rotation*; when the TTL lapses the panel returns on its own with nothing
published to end it.

## Remaining, elsewhere

None of this is in this repo:

- [ ] **Broker ACLs** — `hermes-deploy/docs/todo-broker.md`. Until then the
      separation between the agent's topic and the panel's is a convention, not
      a boundary.
- [ ] **The mediator** — subscribe `hermes/canvas`, validate against the schema,
      republish retained to `wallpanel/canvas`. Node-RED on the Pi is the
      obvious home.
- [ ] **The agent-side tool** — publish one JSON document to `hermes/canvas`.
- [ ] **The share** — mount the agent's dataset read-only at
      `/opt/wallpanel/shell/agent/`. Until it exists, `image` simply has nothing
      to point at; the rest of the schema works without it.

## Two things worth not relitigating

**The agent does not publish into `wallpanel/#`.** It publishes to its own
prefix and a mediator republishes. That keeps the panel's control topics
unreachable from the agent even if its credential leaks, and puts validation
somewhere the agent cannot skip.

**MQTT is not the channel for bulk.** The document travels as a retained topic;
anything large travels as a file on the share. Putting an image in a retained
payload makes every subscriber pay for it on every reconnect.
