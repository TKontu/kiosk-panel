# View: agent canvas

A page the Hermes agent can draw on - whatever it decides is worth showing.

**Status:** not started. The interesting decision here is the contract, not the
rendering.

---

## The contract is the whole design

Two options, and the choice determines whether the panel keeps looking like one
thing:

**A constrained schema.** The agent publishes structured JSON; the page renders
it with the panel's existing type scale, ink tokens and colour discipline:

```json
{
  "title": "Overnight build",
  "subtitle": "3 of 4 stages green",
  "tiles": [{"label": "Tests", "value": "148", "unit": "passed", "state": "ok"}],
  "series": [[0, 12], [1, 18]],
  "note": "Stage 4 still running"
}
```

**Arbitrary HTML in a sandboxed iframe.** Maximum flexibility, and every agent
output becomes a design decision the agent is not equipped to make. Within a few
days the panel has five visual languages.

Recommendation: **the schema, with HTML as an explicit escape hatch** for the
rare case that genuinely needs it. If HTML is allowed at all, it must be
`sandbox`ed - it is running on a page that holds broker credentials.

## Practical notes

- Publish retained, so the panel renders on load rather than waiting for the
  agent's next thought.
- Include a timestamp in the payload and show it. An agent canvas showing
  yesterday's conclusion with no date is worse than a blank screen.
- Gate it with `activeWhen` (`todo-view-mechanisms.md`) so it leaves the rotation
  when the agent has nothing to say, rather than showing a stale panel forever.
- Decide what happens when the payload is malformed: render nothing and drop out
  of the rotation, never render half a layout.
- Keep the agent's write scope to one topic prefix. It is another MQTT client on
  a broker whose credential is already known to be weak.
