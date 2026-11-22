// Rig Runner · Keyboard and touch input.
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
    if (m) { e.preventDefault(); if (!e.repeat) battleInput(m); }
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
    for (const [m] of buttonsUnder(e.changedTouches, "#touchDance", "m")) battleInput(m);
  const now = buttonsUnder(e.touches, "#touchDance", "m");
  dancePad.querySelectorAll("button").forEach(b => b.classList.toggle("on", now.has(b.dataset.m)));
}
for (const ev of ["touchstart", "touchmove", "touchend", "touchcancel"]) dancePad.addEventListener(ev, syncDancePad, { passive: false });
// mouse / pen fallback for the pads (desktop testing)
document.querySelectorAll("#touchRun button").forEach(btn => {
  const k = btn.dataset.k;
  btn.addEventListener("mousedown", e => { e.preventDefault(); if (state.mode !== "play") return; if (k === "jump" && !input.jump) pressJump(); input[k] = true; touchHeld.add(k); btn.classList.add("on"); });
});
document.querySelectorAll("#touchDance button").forEach(btn => btn.addEventListener("mousedown", e => { e.preventDefault(); if (battle && battle.started) battleInput(btn.dataset.m); }));
addEventListener("mouseup", () => { if (touchHeld.size) releaseTouch(); });
// no pinch or double-tap zoom anywhere in the game
for (const ev of ["gesturestart", "gesturechange", "gestureend", "dblclick"]) document.addEventListener(ev, e => e.preventDefault(), { passive: false });
