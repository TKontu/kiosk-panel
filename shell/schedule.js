// Time-of-day schedule.
//
// Each period: { id, start, end, view }
//   start/end - minutes from midnight; end is EXCLUSIVE.
//   view      - a name from views.js shown by default during this period.
//
// Any time NOT covered by a period falls through to OFF_VIEW (a black screen).
//
// A manual override (button press -> wallpanel/view/set) replaces the default
// for the CURRENT period only, then expires when the period changes and the
// schedule takes back over. See app.js.
//
// Uses the kiosk's LOCAL time — make sure the timezone is correct:
//   timedatectl set-timezone Europe/Helsinki

window.SCHEDULE = [
  { id: "morning", start:  6 * 60, end:  8 * 60, view: "overview" }, // 06:00–08:00
  { id: "camera",  start: 19 * 60, end: 24 * 60, view: "tapo"    }, // 19:00–00:00
];

// Shown in every gap between the periods above.
window.OFF_VIEW = "off";
