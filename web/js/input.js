// Bolt Beat · Keyboard and touch input.
"use strict";
// ================= Input =================
const input = { left: false, right: false, jump: false, down: false };
let jumpPressedAt = -1;
const keymap = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "jump", KeyW: "jump", Space: "jump", KeyZ: "jump", ArrowDown: "down", KeyS: "down" };
const dancemap = { ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right", ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", Space: "act", KeyX: "act", KeyJ: "act", Enter: "act" };
addEventListener("keydown", e => {
  if (e.code === "KeyM") { audio.setMuted(!audio.muted); return; }
  if (state.mode === "home") {
    startMenuMusic();
    if (e.code === "Enter" || e.code === "Space") { e.preventDefault(); leaveHome(); }
    return;
  }
  if (state.mode === "title" && e.code === "Escape") { e.preventDefault(); showHome(); return; }
  if (state.mode === "title") {
    if (e.code === "ArrowLeft" || e.code === "KeyA") { e.preventDefault(); pick(ORDER[(ORDER.indexOf(sel) + ORDER.length - 1) % ORDER.length]); return; }
    if (e.code === "ArrowRight" || e.code === "KeyD") { e.preventDefault(); pick(ORDER[(ORDER.indexOf(sel) + 1) % ORDER.length]); return; }
    const n = parseInt(e.key, 10); if (n >= 1 && n <= ORDER.length) { pick(ORDER[n - 1]); return; }
    if (e.code === "Enter" || e.code === "Space") { if (e.target.closest && e.target.closest("button")) return; e.preventDefault(); readSave() ? continueGame() : startGame(); }
    return;
  }
  if (state.mode === "card") {
    if (e.code === "Escape") { e.preventDefault(); showHome(); }
    else if (e.code === "Enter" || e.code === "Space") { if (e.target.closest && e.target.closest("button")) return; e.preventDefault(); cardPrimary && cardPrimary(); }
    return;
  }
  if (state.paused) {
    if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); resumeGame(); }
    return;
  }
  if (e.code === "Escape" || e.code === "KeyP") { e.preventDefault(); pauseGame(); return; }
  if (battle && battle.started) {
    const m = dancemap[e.code];
    if (m) { e.preventDefault(); if (!e.repeat) battleInput(m, inputTime(e)); }
    return;
  }
  const k = keymap[e.code];
  if (k) { e.preventDefault(); if (k === "jump" && !input.jump) pressJump(); input[k] = true; }
  if (e.code === "KeyR" && !battle) restartLevel();
});
addEventListener("keyup", e => { const k = keymap[e.code]; if (k) input[k] = false; });
addEventListener("blur", () => { for (const k in input) input[k] = false; touchHeld.clear(); pauseGame(); });
function pressJump() { jumpPressedAt = state.time; audio.unlock(); }
// ---------- touch controls ----------
// Built on raw touch events. On every touch change we look at where ALL fingers are right now and
// set the held buttons from that, so a button can never stay "stuck" (a missed lift, a pad hidden
// under your finger), and you can slide a finger from one button to the next.
// preventDefault on these events also stops iOS double-tap zoom and the delayed ghost click.
const touchHeld = new Set();   // run-pad keys currently held by a finger
function buttonsUnder(touches, padSel, attr) {
  const out = new Map();
  for (const t of touches) {
    const el = document.elementFromPoint(t.clientX, t.clientY), b = el && el.closest(padSel + " button");
    if (b) out.set(b.dataset[attr], b);
  }
  return out;
}
function syncRunPad(e) {
  e.preventDefault();
  const now = state.mode === "play" && !state.paused ? buttonsUnder(e.touches, "#touchRun", "k") : new Map();
  for (const k of ["left", "right", "down", "jump"]) {
    const held = now.has(k);
    if (held && k === "jump" && !input.jump) pressJump();
    if (held !== touchHeld.has(k)) { input[k] = held; held ? touchHeld.add(k) : touchHeld.delete(k); }
  }
  document.querySelectorAll("#touchRun button").forEach(b => b.classList.toggle("on", now.has(b.dataset.k)));
}
function releaseTouch() {
  for (const k of touchHeld) input[k] = false;
  touchHeld.clear();
  document.querySelectorAll(".touch button.on").forEach(b => b.classList.remove("on"));
}
const runPad = document.getElementById("touchRun");
for (const ev of ["touchstart", "touchmove", "touchend", "touchcancel"]) runPad.addEventListener(ev, syncRunPad, { passive: false });
// dance pad: a move fires the moment a finger lands on it
const dancePad = document.getElementById("touchDance");
function syncDancePad(e) {
  e.preventDefault();
  if (e.type === "touchstart" && battle && battle.started && !state.paused)
    for (const [m] of buttonsUnder(e.changedTouches, "#touchDance", "m")) battleInput(m, inputTime(e));
  const now = buttonsUnder(e.touches, "#touchDance", "m");
  dancePad.querySelectorAll("button").forEach(b => b.classList.toggle("on", now.has(b.dataset.m)));
}
for (const ev of ["touchstart", "touchmove", "touchend", "touchcancel"]) dancePad.addEventListener(ev, syncDancePad, { passive: false });
// mouse / pen fallback for the pads (desktop testing)
document.querySelectorAll("#touchRun button").forEach(btn => {
  const k = btn.dataset.k;
  btn.addEventListener("mousedown", e => { e.preventDefault(); if (state.mode !== "play") return; if (k === "jump" && !input.jump) pressJump(); input[k] = true; touchHeld.add(k); btn.classList.add("on"); });
});
document.querySelectorAll("#touchDance button").forEach(btn => btn.addEventListener("mousedown", e => { e.preventDefault(); if (battle && battle.started) battleInput(btn.dataset.m, inputTime(e)); }));
addEventListener("mouseup", () => { if (touchHeld.size) releaseTouch(); });
// no pinch or double-tap zoom anywhere in the game
for (const ev of ["gesturestart", "gesturechange", "gestureend", "dblclick"]) document.addEventListener(ev, e => e.preventDefault(), { passive: false });

// ---------- gamepad (standard mapping: Xbox, PlayStation, Switch Pro and most others) ----------
// Platforming: D-pad or left stick runs (down drops through girders), A jumps, Start pauses.
// Dance-offs: D-pad or stick are the four moves, A (or X/Y) is Flare.
// Menus: D-pad moves between buttons, A chooses, B goes back, Start pauses and resumes.
const padPrev = {};
let padActive = false;
let padTime = 0;   // performance-clock ms of the newest pad report (for dance timing)
function padState() {
  const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
  padTime = Math.max(0, ...pads.map(p => p.timestamp || 0));
  const st = { up: false, down: false, left: false, right: false, a: false, b: false, x: false, start: false, back: false };
  for (const gp of pads) {
    const btn = i => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
    const ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
    st.left = st.left || btn(14) || ax < -0.5; st.right = st.right || btn(15) || ax > 0.5;
    st.up = st.up || btn(12) || ay < -0.5; st.down = st.down || btn(13) || ay > 0.5;
    st.a = st.a || btn(0); st.b = st.b || btn(1); st.x = st.x || btn(2) || btn(3);
    st.start = st.start || btn(9); st.back = st.back || btn(8);
  }
  return { st, any: pads.length > 0 };
}
function pollGamepad() {
  const { st, any } = padState();
  if (!any) return;
  const pressed = k => st[k] && !padPrev[k], released = k => !st[k] && padPrev[k];
  if (Object.keys(st).some(pressed)) { padActive = true; document.body.classList.add("using-pad"); audio.unlock(); }
  if (state.mode === "play" && !state.paused) {
    if (pressed("start")) pauseGame();
    else if (battle && battle.started) {
      for (const [k, mv] of [["up", "up"], ["down", "down"], ["left", "left"], ["right", "right"], ["a", "act"], ["x", "act"]]) if (pressed(k)) battleInput(mv, inputTime({ timeStamp: padTime }));
    } else {
      for (const k of ["left", "right", "down"]) { if (pressed(k)) input[k] = true; else if (released(k)) input[k] = false; }
      if (pressed("a")) { if (!input.jump) pressJump(); input.jump = true; } else if (released("a")) input.jump = false;
    }
  } else menuNav(pressed);
  Object.assign(padPrev, st);
}
// menu navigation by controller
function menuRoot() {
  if (state.paused) return pauseCard;
  if (state.mode === "home") return homeEl;
  if (state.mode === "title") return titleCard;
  if (state.mode === "card") return winCard;
  return null;
}
function menuButtons() {
  const root = menuRoot();
  return root ? [...root.querySelectorAll("button")].filter(b => b.offsetParent !== null && !b.classList.contains("pick")) : [];
}
function defaultButton(list) {
  const pick = id => { const el = document.getElementById(id); return el && list.includes(el) ? el : null; };
  if (state.paused) return pick("resumeBtn");
  if (state.mode === "home") return pick("homeStart");
  if (state.mode === "card") return winCard.querySelector("[data-act=primary]");
  return pick("continueBtn") || pick("nextBtn") || pick("startBtn") || list[0];
}
function setPadFocus(el) {
  document.querySelectorAll(".pad-focus").forEach(e => e.classList.remove("pad-focus"));
  if (el) { el.classList.add("pad-focus"); el.focus({ preventScroll: false }); }
}
function menuNav(pressed) {
  const list = menuButtons();
  if (!list.length) return;
  const cur = list.includes(document.activeElement) ? document.activeElement : null;
  if (pressed("up") || pressed("down") || (state.mode !== "title" && (pressed("left") || pressed("right")))) {
    const dir = pressed("up") || pressed("left") ? -1 : 1;
    const i = cur ? list.indexOf(cur) : list.indexOf(defaultButton(list));
    setPadFocus(list[((i < 0 ? 0 : i + dir) + list.length) % list.length]);
  }
  if (state.mode === "title" && (pressed("left") || pressed("right"))) pick(ORDER[(ORDER.indexOf(sel) + (pressed("left") ? ORDER.length - 1 : 1)) % ORDER.length]);
  if (pressed("a")) { const el = cur || defaultButton(list); if (el) el.click(); }
  if (pressed("start")) { if (state.paused) resumeGame(); else if (state.mode === "home") leaveHome(); else { const el = defaultButton(list); if (el) el.click(); } }
  if (pressed("b")) { if (state.paused) resumeGame(); else if (state.mode === "title" || state.mode === "card") showHome(); }
}
addEventListener("pointerdown", () => { document.querySelectorAll(".pad-focus").forEach(e => e.classList.remove("pad-focus")); });
addEventListener("touchstart", () => document.body.classList.remove("using-pad"), { passive: true });
addEventListener("gamepadconnected", e => {
  padActive = true;
  banner = { text: "Controller connected", sub: "D-pad / stick to move · A to jump · Start to pause", until: state.time + 2.5 };
});
function padRumble(ms, strength) {
  if (!padActive || !navigator.getGamepads) return;
  for (const gp of navigator.getGamepads()) {
    const v = gp && gp.vibrationActuator;
    if (v && v.playEffect) v.playEffect("dual-rumble", { duration: ms, strongMagnitude: strength, weakMagnitude: strength * 0.6 }).catch(() => {});
  }
}

// ---------- leaving the game: system back button, app or tab in the background ----------
// The Android app's back button calls this. Returns true when the game used the press,
// false on the home screen so the app can do its own "press back again to exit".
window.bbBack = function () {
  if (state.mode === "play" && state.paused) { resumeGame(); return true; }
  if (state.mode === "play") { pauseGame(); return true; }
  if (state.mode === "title" || state.mode === "card") { showHome(); return true; }
  return false;
};
// Switching apps or tabs pauses the run and silences the music until you come back.
function appHidden() {
  pauseGame();
  releaseTouch();
  if (audio.ctx && audio.ctx.state === "running") audio.ctx.suspend().catch(() => {});
}
function appShown() {
  if (audio.ctx && audio.ctx.state === "suspended" && !audio.muted) audio.ctx.resume().catch(() => {});
}
window.bbAppHidden = appHidden; window.bbAppShown = appShown;
document.addEventListener("visibilitychange", () => { if (document.hidden) appHidden(); else appShown(); });
