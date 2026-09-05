# View: indoor sensors

Air quality, temperature and humidity from the Zigbee sensors around the house.

**Status:** not started. Mostly a rendering job - the data is already on the
broker. Best served by the tiles renderer in `todo-view-mechanisms.md`.

---

## Data

zigbee2mqtt already publishes every sensor to the broker, so there is no
integration to build. Two things to sort out:

- **Topic prefix.** Sensor topics live under `zigbee2mqtt/#`, outside the
  `wallpanel/#` prefix the planned broker ACL would allow. Either widen the ACL
  to include a read-only subscription to `zigbee2mqtt/#`, or have Node-RED
  republish the handful the panel actually wants under `wallpanel/sensors/`. The
  second is tidier and keeps the ACL a one-liner.
- **Retain.** The panel must render immediately on load, so whatever it
  subscribes to has to be retained.

## What to show

The filter is **"would I act on it?"**.

- **CO2 is the one that changes behaviour** - it makes you open a window, now. If
  any sensor reports it, make it the hero and demote everything else.
- Temperature and humidity are ambient. Useful, but nobody acts on 21.4 vs 21.8.
- **Pair indoor against outdoor.** The overview dial already shows the outdoor
  temperature; "18 in here, 11 out there" is more useful than either number
  alone, and it is the comparison people actually make.
- Indoor PM2.5 is worth showing only if you have a source of it - cooking, a
  fireplace, candles. Otherwise it is a flat line that trains you to ignore the
  tile.

Resist one tile per sensor per metric. A dozen numbers at 68.8 ppi read as
wallpaper. Pick the few that would make someone get up.

## Thresholds

Tiles should carry a state, not just a value, using the same measured ink and
colour discipline as the overview dial (see `architecture.md`). Starting points,
worth arguing with:

| Metric | Fine | Watch | Act |
|--------|------|-------|-----|
| CO2 | under 800 ppm | 800-1200 | over 1200 |
| Humidity | 30-50 % | 50-60 % | over 60 % or under 25 % |
| PM2.5 | under 10 | 10-25 | over 25 |

State must never rest on colour alone - a word or an icon alongside, the same
rule the price bands follow.
