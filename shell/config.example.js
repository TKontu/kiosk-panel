// Example config — copy to config.js and fill in the real values.
// config.js is gitignored: it holds the password, the LAN addresses and the
// coordinates, none of which belong in a public repo. chmod 600 it on the kiosk.
window.CONFIG = {
  broker: "ws://BROKER_HOST:9001",
  username: "SET_ME",
  password: "SET_ME",

  // Only these three need naming. app.js derives the rest from the same base
  // (<base>/command, <base>/view/current, <base>/views), so an existing
  // config.js keeps working untouched. Name one here only to override it.
  topics: {
    set:      "wallpanel/view/set",
    override: "wallpanel/override",
    status:   "wallpanel/status",
  },

  // LAN endpoints that views.js builds view URLs from. Drop the views you don't
  // run; views.js skips any view whose host is missing.
  hosts: {
    frigate: "http://FRIGATE_HOST:5000",
  },

  // Places the overview dial can show. The FIRST entry is the default; the others are
  // reachable as overview.html?place=<key>. Coordinates in decimal degrees —
  // rounding to 2 dp is plenty for a forecast and less precise about where you
  // live. Open-Meteo needs no API key.
  places: {
    home: { name: "Helsinki", lat: 60.17, lon: 24.94 },
  },
};
