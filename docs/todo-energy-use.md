# View: consumption against price

What the house is actually drawing, next to what it costs right now.

**Status:** not started. Needs a metering device. The highest-behaviour-change
item on the list.

---

## Why it earns wall space

The overview dial shows price. Price alone is abstract; **price times draw is
euros per hour**, and that is the number that makes someone turn something off.
It is also the only view here with a direct payback.

## Data

Needs a source of live consumption, which is the gating question:

- **P1 / HAN port reader** on the smart meter (Finnish meters commonly expose
  one). Cheap ESP-based readers publish straight to MQTT - the best fit, since it
  is whole-house and already on the broker.
- **Shelly EM** or similar clamp meters - per-circuit, also MQTT-capable.
- **Fingrid Datahub** for consumption history. Verified: `http 200` but **no
  CORS header**, so it cannot be fetched from the page. It is also delayed by a
  day, making it useful for review but not for a live wall panel.

Live metering is the one that matters here; Datahub is a different, retrospective
view.

## Design

- Lead with **euros per hour right now** - draw times the current 15-minute
  price plus margin. That single number is the point of the view.
- Today's cost so far is the natural second figure.
- Pair with the dial's cheap hours: "3.2 kW now at 1.4 snt - the cheap window
  starts at 14:45" turns information into a decision.
- Resist per-circuit breakdowns unless the clamps exist. Whole-house draw plus
  price is already actionable; a bar chart of eleven circuits is a Grafana
  dashboard.
- Standby draw at night is quietly interesting - it is the number that reveals a
  forgotten heater.
