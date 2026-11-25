// Bolt Beat service worker: makes the game work offline and installable as a Home Screen app.
// Bump VERSION whenever you publish changes so players' phones pick up the new files.
const VERSION = "bolt-beat-2026-11-25c";
const SHELL = [
  "./",
  "index.html",
  "manifest.webmanifest",
  "css/base.css",
  "css/style.css",
  "js/characters.js",
  "js/poses.js",
  "js/rig.js",
  "js/levels.js",
  "js/bosses.js",
  "js/generator.js",
  "js/solver.js",
  "js/endless.js",
  "js/physics.js",
  "js/audio.js",
  "js/input.js",
  "js/game.js",
  "js/menu.js",
  "js/effects.js",
  "js/ads.js",
  "js/timing.js",
  "js/battle.js",
  "js/update.js",
  "js/render.js",
  "js/battle-ui.js",
  "js/render-frame.js",
  "js/home.js",
  "js/main.js",
  "assets/robots/jumper/fist.png",
  "assets/robots/jumper/foot.png",
  "assets/robots/jumper/forearm.png",
  "assets/robots/jumper/head.png",
  "assets/robots/jumper/pelvis.png",
  "assets/robots/jumper/shin.png",
  "assets/robots/jumper/thigh.png",
  "assets/robots/jumper/torso.png",
  "assets/robots/jumper/upper_arm.png",
  "assets/robots/runner/fist.png",
  "assets/robots/runner/foot.png",
  "assets/robots/runner/forearm.png",
  "assets/robots/runner/head.png",
  "assets/robots/runner/pelvis.png",
  "assets/robots/runner/shin.png",
  "assets/robots/runner/thigh.png",
  "assets/robots/runner/torso.png",
  "assets/robots/runner/upper_arm.png",
  "assets/robots/slim/fist.png",
  "assets/robots/slim/foot.png",
  "assets/robots/slim/forearm.png",
  "assets/robots/slim/head.png",
  "assets/robots/slim/pelvis.png",
  "assets/robots/slim/shin.png",
  "assets/robots/slim/thigh.png",
  "assets/robots/slim/torso.png",
  "assets/robots/slim/upper_arm.png",
  "assets/robots/spider/abdomen.png",
  "assets/robots/spider/body.png",
  "assets/robots/spider/foot.png",
  "assets/robots/spider/head.png",
  "assets/robots/spider/lower_leg.png",
  "assets/robots/spider/upper_leg.png",
  "assets/robots/tank/fist.png",
  "assets/robots/tank/foot.png",
  "assets/robots/tank/forearm.png",
  "assets/robots/tank/head.png",
  "assets/robots/tank/pelvis.png",
  "assets/robots/tank/shin.png",
  "assets/robots/tank/thigh.png",
  "assets/robots/tank/torso.png",
  "assets/robots/tank/upper_arm.png",
  "assets/accessories/cowboy-hat.png",
  "icons/apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/favicon-32.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Serve from the cache straight away (fast, works offline), and refresh the cached copy in the
// background so the next launch has any update. Other files (e.g. the web font) are cached as used.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const hit = await cache.match(e.request, { ignoreSearch: true });
    const fresh = fetch(e.request).then(res => { if (res && (res.ok || res.type === "opaque")) cache.put(e.request, res.clone()); return res; }).catch(() => hit);
    return hit || fresh;
  }));
});
