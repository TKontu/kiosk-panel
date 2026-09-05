// The views the panel can show.
//
//   name: { url, rotate, cycle }
//     url    - what to load in the view
//     rotate - DEGREES the source must be turned to sit correctly on the panel.
//              0 (or omit) for normal portrait pages — dashboards, photos.
//              -90 for a landscape source (camera feeds) so it fills the
//              portrait panel as landscape. 90 and 180 also work.
//              `true` is still accepted and means -90.
//     cycle  - set false to keep the view OUT of the remote's arrow rotation.
//              Omit it and the view joins the rotation automatically.
//
// Rotation is applied when the view's stage is built and is never changed
// afterwards, so switching views never makes anything visibly turn. See the
// stage-model comment in app.js.
//
// THIS FILE IS THE ONLY PLACE THE VIEW LIST LIVES. Adding a view here is the
// whole job — the arrow rotation is derived from it at runtime (in declaration
// order), so Node-RED never needs to be told about a new view. The name is what
// you publish to wallpanel/view/set, and what the schedule refers to.

// LAN addresses come from config.js (gitignored), so this file — the one you
// actually edit to add a view — carries no site-specific hosts.
var HOSTS = (window.CONFIG && window.CONFIG.hosts) || {};

window.VIEWS = {
  tapo: {
    url: HOSTS.frigate && HOSTS.frigate + "/#tapo310",
    rotate: -90,           // landscape camera on a portrait panel
  },

  // Static artwork / photo. photo.html fills the portrait panel with
  // media/image.jpg (object-fit: cover). Swap the file to change the picture —
  // no code change needed.
  photo: {
    url: "photo.html",
    rotate: false,
  },

  // Day's weather. Places live in config.js (CONFIG.places) and the first one
  // there is the default, so no URL param is needed; add ?place=<key> here to
  // pin a different one, or ?lat=..&lon=..&name=.. to bypass config entirely.
  // Data: Open-Meteo (no API key, CORS-open, works from file://).
  weather: {
    url: "weather.html",
    rotate: 0,
  },

  // Finnish day-ahead electricity price at the 15-minute market time unit.
  // Retailer margin is a URL param: ?margin=0.5 (snt/kWh by default;
  // add &marginUnit=eur or &marginUnit=eurmwh to use other units).
  electricity: {
    url: "electricity.html?margin=0.5",
    rotate: 0,
  },

  // Pure-black blanking view. Inline data: URL so it never depends on the
  // network or a file path — it can always render, which is what you want for
  // reliably blanking the panel. (Signal stays up; monitor is NOT powered off,
  // deliberately, to avoid poking the marginal adapter.)
  off: {
    url: "data:text/html,<body style='margin:0;background:#000;height:100vh'></body>",
    rotate: false,
    cycle: false,          // reached by the remote's off button, not the arrows
  },
};

// A view whose LAN host is absent from config.js can't load anything, and an
// unreachable stage in the arrow rotation reads as a dead button press. Drop
// those here so the rotation only ever holds views that can actually render.
Object.keys(window.VIEWS).forEach(function (name) {
  if (!window.VIEWS[name].url) delete window.VIEWS[name];
});
