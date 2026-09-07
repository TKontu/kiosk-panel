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

  // Merged weather + electricity dial. The ring is the 15-minute spot price;
  // the figures inside it are hour-average prices, the figures outside are that
  // hour's temperature (and rainfall when there is any). Location comes from
  // config.js (CONFIG.places); margin is snt/kWh, VAT-inclusive.
  overview: {
    url: "overview.html?margin=0.5",
    rotate: 0,
  },

  // Agent canvas. Hermes publishes to hermes/canvas; a mediator validates it
  // and republishes here, retained, so the panel never reads the agent's topic
  // directly and the agent can never reach the panel's control topics.
  //
  // Gated: in the rotation only while a payload is present and announces a
  // schema version this shell understands. An agent with nothing to say, or a
  // mediator that rejected the last payload, leaves the rotation rather than
  // showing a blank page. The test is a shape check, not schema validation -
  // validation belongs in the mediator, where the agent cannot skip it.
  canvas: {
    url: "canvas.html",
    rotate: 0,
    activeWhen: {
      topic: "canvas",
      test: function (payload) {
        try {
          var d = JSON.parse(payload);
          return !!d && d.v === 1;
        } catch (e) { return false; }
      },
    },
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
