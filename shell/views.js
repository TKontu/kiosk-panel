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

  // ---- Agent canvas, two lifecycles ------------------------------------
  // One renderer, two topics. Hermes publishes to hermes/canvas/<kind>; the
  // mediator validates and republishes here. See docs/agent-canvas-schema.md.

  // Persistent: the agent's standing board. In the arrow rotation while a valid
  // payload is present, and stays until replaced or cleared.
  canvas: {
    url: "canvas.html?src=canvas/persistent",
    rotate: 0,
    activeWhen: {
      topic: "canvas/persistent",
      test: function (payload) {
        try {
          var d = JSON.parse(payload);
          return !!d && d.v === 1;
        } catch (e) { return false; }
      },
    },
  },

  // Ephemeral: "look at this now". Takes over the panel the moment it arrives,
  // holds for its TTL, then vanishes and the panel returns to whatever it was
  // doing. Deliberately NOT in the arrow rotation - it interrupts, it is not
  // something you browse to - and any button press dismisses it.
  //
  // The gate carries the expiry, so nothing has to publish to end it and a
  // payload that expired while the panel was off never shows at all.
  canvasNow: {
    url: "canvas.html?src=canvas/ephemeral",
    rotate: 0,
    cycle: false,
    takeover: true,
    activeWhen: {
      topic: "canvas/ephemeral",
      test: function (payload) {
        try {
          var d = JSON.parse(payload);
          if (!d || d.v !== 1) return false;
          var at = Date.parse(d.updated_at);
          if (!isFinite(at)) return false;
          // TTL runs from updated_at, not from arrival, so it is deterministic
          // and survives a panel restart. Default 30 min.
          var ttl = (typeof d.ttl_s === "number" && d.ttl_s > 0) ? d.ttl_s : 1800;
          return Date.now() < at + ttl * 1000;
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
