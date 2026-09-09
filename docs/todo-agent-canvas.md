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
- **Two lifecycles**, both of which interrupt on arrival — publishing something
  nobody sees is not much of a display capability:
  - `persistentcanvas`: holds the screen ~5 min from its `updated_at`, then
    settles into the rotation and stays there. No TTL.
  - `ephemeralcanvas`: holds the screen for its whole TTL, then leaves entirely.
  Both are dismissable with any button press, both are normal members of the
  rotation while they live, and when both want attention the ephemeral one wins.
  Independent and concurrent — neither touches the other.
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

- [~] **Broker ACLs** — in progress, and partly live: as of 2026-09-08 the
      `wallpanel` user is scoped to `wallpanel/#`. Verified from a client
      authenticated as `wallpanel`: publishes outside that prefix are silently
      dropped and nothing outside it is delivered, including `hermes/#`. The
      `hermes` and `mediator` users still need creating — see
      `hermes-deploy/docs/todo-broker.md`.

      Note for testing: this removed the `wallpaneltest/#` namespace the panel's
      test rigs used for isolation. Tests now drive the real topics and restore
      state afterwards. The silent-drop behaviour is worth remembering — a
      publish that goes nowhere returns no error, so a test that only asserts
      "nothing happened" will pass for the wrong reason.
- [x] **The mediator** — written: `node-red/canvas-mediator-flow.json`, ready to
      import. Subscribes both `hermes/canvas/*` topics, validates against the v1
      schema, republishes retained into `wallpanel/canvas/*`, and rebuilds the
      document from known fields only so nothing extra crosses. Invalid payloads
      are dropped with the reason sent to a debug node; the previous canvas stays
      up.
- [x] **A way to test it without the agent** —
      `node-red/canvas-mediator-test-inject.json`. Import it into the same
      workspace and it wires itself to the existing `validate` node, giving five
      one-click injects: a persistent canvas, a 2-minute ephemeral one, a
      deliberately-rejected payload, and a clear for each. Timestamps come from
      JSONata `$now()`, so they are always current rather than going stale in the
      file. Delete it once the agent is publishing for real. **On import, point the two mqtt-in nodes at a `hermes` broker config
      and the mqtt-out node at a `mediator` one** — they are deliberately
      different identities.
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
