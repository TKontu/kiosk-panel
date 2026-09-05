// Wall Panel logic: connect to MQTT, decide what to show (schedule vs manual
// override), render it. Edit views.js / schedule.js / config.js — not this.
//
// The shell owns the view list. Controllers (Node-RED, the Zigbee remote, a
// shell prompt) send *intents* — "next", "prev", "blank" — never view names,
// so adding a view never means touching the controller. See the topic table in
// architecture.md.

(function () {
  "use strict";

  const stack    = document.getElementById("stack");
  const overlay  = document.getElementById("overlay");
  const headline = document.getElementById("headline");
  const detail   = document.getElementById("detail");

  let override  = null;   // { view, periodId } or null
  let shownView = null;   // what's currently rendered
  let client    = null;

  // ---- Topics -----------------------------------------------------------
  // config.js only has to name the three original topics. The rest are derived
  // from the same base, so an old config keeps working and there's one less
  // file to keep in sync (config.js is the chmod-600 secret — leave it alone).
  const C    = window.CONFIG;
  const BASE = (C.topics && C.topics.override || "wallpanel/override")
                 .replace(/\/override$/, "");
  const TOPICS = Object.assign({
    set:      BASE + "/view/set",       // a view name (manual override)
    override: BASE + "/override",       // retained {view, periodId}
    status:   BASE + "/status",         // LWT online/offline
    command:  BASE + "/command",        // next | prev | blank
    current:  BASE + "/view/current",   // retained: what's on screen now
    views:    BASE + "/views",          // retained: the cycle, for discovery
  }, C.topics || {});

  // ---- The cycle, derived from views.js ---------------------------------
  // Every view is in the arrow rotation unless it opts out with cycle:false.
  // Order is the order they're declared in views.js.
  function cycle() {
    return Object.keys(window.VIEWS).filter((n) => window.VIEWS[n].cycle !== false);
  }

  // Step relative to what's ON SCREEN, not to a cursor held elsewhere — so the
  // arrows stay predictable after the schedule or a set command moved us.
  function stepFrom(current, dir) {
    const list = cycle();
    if (!list.length) return null;
    const i = list.indexOf(current);
    if (i === -1) return dir > 0 ? list[0] : list[list.length - 1];
    return list[(i + dir + list.length) % list.length];
  }

  // ---- Which scheduled period are we in right now? -----------------------
  function currentPeriod() {
    const now  = new Date();
    const mins = now.getHours() * 60 + now.getMinutes();
    for (const p of window.SCHEDULE) {
      if (mins >= p.start && mins < p.end) return { id: p.id, view: p.view };
    }
    return { id: "off", view: window.OFF_VIEW };
  }

  // ---- Rendering: the stage model ---------------------------------------
  // A view has two properties that must change together: its CONTENT (the iframe
  // src) and its ORIENTATION (a camera is landscape and must be counter-rotated
  // against the portrait-mounted, driver-rotated display). Content takes time to
  // load; orientation is instant. Mutating both on one shared element therefore
  // rotates whatever is currently on screen and only then swaps it — the old
  // view visibly spins before it disappears.
  //
  // So orientation is not a thing we change. Each view gets its own <div.stage>,
  // created with data-rotate already set (all geometry lives in style.css) and
  // never re-oriented. Switching views = build a new stage, let it load
  // underneath the current one, crossfade, drop the old. Nothing on screen ever
  // rotates, and there is no black gap between views.
  const FADE_MS  = 550;   // keep in sync with --fade in style.css
  const SETTLE_MS = 120;  // let a just-loaded page paint before we fade it in
  const LOAD_CAP = 4000;  // show it anyway if 'load' never fires

  let liveStage = null;   // the stage currently visible
  let nextStage = null;   // a stage loading in, not yet shown
  let swapSeq   = 0;

  // rotate: degrees. true/false accepted for back-compat (true == -90).
  function rotationOf(v) {
    const r = v.rotate;
    if (r === true) return -90;
    if (!r) return 0;
    const n = Number(r) % 360;
    if (n === 270 || n === -90) return -90;
    if (n === 90 || n === -270) return 90;
    if (n === 180 || n === -180) return 180;
    return 0;
  }

  function buildStage(v) {
    const el = document.createElement("div");
    el.className = "stage";
    el.dataset.rotate = String(rotationOf(v));   // orientation, set once, for life
    const frame = document.createElement("iframe");
    frame.setAttribute("allow", "autoplay; fullscreen; camera; microphone");
    frame.setAttribute("src", v.url);
    el.appendChild(frame);
    return { el, frame };
  }

  function render(name) {
    const v = window.VIEWS[name];
    if (!v) {
      showOverlay("offline", "Unknown view",
        "No view named <code>" + String(name).replace(/[<>&]/g, "") +
        "</code>. Add it in views.js — or, if it is there, set the host it "
        + "needs in config.js.");
      return;
    }
    hideOverlay();
    shownView = name;                      // claim now so tick() won't re-enter
    publish(TOPICS.current, name, true);   // observability: what's actually up

    const seq = ++swapSeq;
    // A burst of arrow presses: bin the stage that never made it on screen. The
    // one the viewer can actually see stays put until its replacement is ready.
    if (nextStage) { nextStage.el.remove(); nextStage = null; }

    const stage = buildStage(v);
    nextStage = stage;
    stack.appendChild(stage.el);           // last in the DOM == on top

    let shown = false;
    function reveal() {
      if (shown || seq !== swapSeq) return;
      shown = true;
      stage.frame.removeEventListener("load", reveal);
      // Give the new document a moment to paint, otherwise we crossfade into a
      // blank frame and it reads as a blink.
      setTimeout(function () {
        if (seq !== swapSeq) return;
        stage.el.classList.add("live");
        const old = liveStage;
        liveStage = stage;
        nextStage = null;
        // Drop the outgoing stage only once it is fully hidden — removing it
        // early is exactly the flash we are avoiding. This also tears down the
        // old camera stream.
        if (old) setTimeout(function () { old.el.remove(); }, FADE_MS + 80);
      }, SETTLE_MS);
    }
    stage.frame.addEventListener("load", reveal);
    setTimeout(reveal, LOAD_CAP);          // never get stuck on a black panel
  }

  // ---- Decide + apply what should be on screen --------------------------
  function tick() {
    const period = currentPeriod();
    if (override && override.periodId !== period.id) override = null; // expired
    const want = override ? override.view : period.view;
    if (want !== shownView) render(want);
  }

  // Set a manual override, held until the current period ends.
  function setOverride(name) {
    if (!name || !window.VIEWS[name]) return;
    override = { view: name, periodId: currentPeriod().id };
    publish(TOPICS.override, JSON.stringify(override), true);
    tick();
  }

  // ---- Overlay helpers --------------------------------------------------
  function showOverlay(state, head, det) {
    overlay.dataset.state = state;
    headline.textContent  = head;
    detail.innerHTML      = det;
    overlay.classList.add("show");
    stack.classList.add("hidden");
  }
  function hideOverlay() {
    overlay.classList.remove("show");
    stack.classList.remove("hidden");
  }

  // ---- MQTT -------------------------------------------------------------
  function publish(topic, payload, retain) {
    if (client) client.publish(topic, payload, { retain: !!retain });
  }

  function connect() {
    const clientId = "wallpanel-" + Math.random().toString(16).slice(2, 8);
    client = mqtt.connect(C.broker, {
      clientId,
      username: C.username,
      password: C.password,
      reconnectPeriod: 3000,
      will: { topic: TOPICS.status, payload: "offline", retain: true, qos: 0 },
    });

    client.on("connect", () => {
      publish(TOPICS.status, "online", true);
      // Advertise the cycle so anything else (Node-RED debug, a dashboard)
      // can see the view list without being told about it.
      publish(TOPICS.views, JSON.stringify(cycle()), true);
      client.subscribe([TOPICS.set, TOPICS.override, TOPICS.command]);
      tick();
    });
    client.on("offline", () => showOverlay("offline", "Panel offline",
      "Can't reach the broker at <code>" + C.broker + "</code>. Retrying."));
    client.on("error", (e) => showOverlay("offline", "Connection problem",
      String(e && e.message || e)));

    client.on("message", (topic, payload) => {
      const msg = payload.toString();

      if (topic === TOPICS.override) {           // retained override -> restore
        try { override = msg ? JSON.parse(msg) : null; } catch { override = null; }
        tick();
        return;
      }

      if (topic === TOPICS.command) {            // intent from a controller
        if (msg === "next")       setOverride(stepFrom(shownView, +1));
        else if (msg === "prev")  setOverride(stepFrom(shownView, -1));
        else if (msg === "blank") setOverride(window.OFF_VIEW);
        return;
      }

      if (topic === TOPICS.set) {                // explicit view by name
        setOverride(msg);
      }
    });
  }

  // ---- Start ------------------------------------------------------------
  connect();
  // Re-evaluate every 30s so period boundaries and override expiry apply.
  setInterval(tick, 30000);
})();
