# Smaller view ideas

Not worked up in detail. Kept so they are not lost, roughly in order of how
likely they are to be worth building.

---

## Daylight

The Finnish daylight swing is enormous and genuinely felt. Sunrise, sunset, and
day length with its rate of change ("4 min shorter than yesterday") - the
derivative is the interesting part, and nobody computes it in their head.

Sunrise/sunset are already fetched for the overview dial's day/night glyphs, so
the data is free. Would reuse the ring idiom rather than adding a new one.

## Door and window state

From zigbee2mqtt, if the contacts exist. Value is entirely in the summary: a
single "everything closed" is worth more than a list, and the exception matters
only when leaving or at night. Pairs naturally with the alert takeover for a
window left open below freezing.

## Photo rotation

`photo.html` already renders a full-bleed image; extending it to rotate through a
folder is a small change. The interesting question is where the images come from
and whether anything is filtering them, given the panel is on a wall where anyone
in the house can see it.

## Sauna

If there is a temperature sensor, "ready at 19:40" is a genuinely useful readout
and a natural fit for the ETA-arc idea sketched in `todo-printer.md`. Also the
most Finnish possible use of a wall panel.

## Name day

Finnish nimipaiva for the date. Trivial to build - a static table, no network -
and the kind of small cultural detail that makes a panel feel like it belongs in
the house rather than in a server room.

## Grafana embed

Carried over from the original backlog. Grafana's `?kiosk` mode URL gives a clean
embed, unlike most web UIs. Worth doing only for a dashboard designed
single-column and portrait; a landscape dashboard squeezed into 1080x1920 looks
worse than the custom views and is the reason most of these are custom.

---

## Explicitly not doing

- **News and social feeds.** They age badly, pull attention constantly and repay
  none of it.
- **Anything needing interaction.** There is no pointing device.
- **Long tables and logs.** These are things you query, not glance at.
- **Anything updating faster than you look at the wall.** If it changes every
  second, the panel is the wrong medium.
