# View: HSL departures

Next departures from the nearest stops.

**Status:** not started. Probably the highest value-per-pixel item on the list
for a panel near the door.

---

## Why it earns wall space

It answers a question you actually ask, at the moment you ask it, and the answer
changes minute to minute. Unlike most feeds it has a natural end state: you
leave.

## Data

**Digitransit** (`api.digitransit.fi`), GraphQL, HSL region. The host does send
`Access-Control-Allow-Origin: *`, but the API **requires a free subscription
key** since 2023.

That key decides the path: a key in `config.js` is a key in page source, so this
should go through **Node-RED -> retained MQTT** rather than a direct fetch, even
though CORS would allow the direct call. Node-RED polls every 20-30 s while the
view is relevant and republishes a small payload.

Query shape: `stop(id:)` -> `stoptimesWithoutPatterns` gives realtime departure
times, route short names, headsigns and a realtime flag.

## Design

- **Realtime vs scheduled matters.** Show which is which; a scheduled time
  presented as realtime is actively misleading when the bus is cancelled.
- Show minutes-until, not clock time, for anything under ~20 minutes. Clock time
  above that.
- Walking time to the stop is the real quantity of interest - "leave in 4 min"
  beats "departs 17:32". If the walk is a known constant, subtract it and say so.
- Two or three stops maximum, a handful of rows each.
- Cancellations and exceptional situations deserve emphasis; a struck-through row
  is more useful than omitting it.

## Fit with the schedule

Almost pure morning and late-afternoon value. A candidate for the schedule
(`schedule.js`) rather than the arrow rotation - or a conditional view gated on
time of day.
